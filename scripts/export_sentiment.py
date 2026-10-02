import argparse
import gzip
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from onnxruntime.transformers.float16 import convert_float_to_float16
from peft import PeftModel
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from prepare_sentiment import ROOT, prepare
from train_sentiment import Corpus, metrics, model_directory, predict


def session(filename):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    return ort.InferenceSession(str(filename), sess_options=options, providers=["CPUExecutionProvider"])


def predict_onnx(runtime, corpus, batch_size=1):
    names = {item.name for item in runtime.get_inputs()}
    output = []
    for tokens, _, _ in corpus.batches(batch_size):
        length = int(tokens["attention_mask"].sum()) if batch_size == 1 else tokens["input_ids"].shape[1]
        output.append(runtime.run(None, {k: v.numpy()[:, :length] for k, v in tokens.items() if k in names})[0])
    return np.concatenate(output)


class InferenceModel(torch.nn.Module):
    def __init__(self, model, temperature):
        super().__init__()
        self.model, self.temperature = model, temperature

    def forward(self, input_ids, attention_mask, token_type_ids):
        return self.model(input_ids=input_ids, attention_mask=attention_mask,
                          token_type_ids=token_type_ids).logits / self.temperature


def export(args):
    torch.set_num_threads(4)
    training = json.loads((args.run / "training.json").read_text())
    training["temperature"] = training["fittedTemperature"]
    training["temperatureAccepted"] = True
    training["temperatureSelection"] = "Calibration NLL optimum; deployed argmax labels preserve class ranking."
    args.output.mkdir(parents=True, exist_ok=True)
    tokenizer = AutoTokenizer.from_pretrained(model_directory())
    tokenizer.save_pretrained(args.output)
    base = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager")
    model = PeftModel.from_pretrained(base, args.run / "adapter").merge_and_unload().eval()
    model.config._name_or_path = training["baseModel"]
    model.config.save_pretrained(args.output)
    wrapper = InferenceModel(model, training["temperature"]).eval()
    tokens = tokenizer("Apple reports quarterly results.", return_tensors="pt")
    onnx_dir = args.output / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    fp32 = onnx_dir / "model.onnx"
    deployed_file = onnx_dir / ("model_fp16.onnx" if args.precision == "fp16" else "model_quantized.onnx")
    names = ["input_ids", "attention_mask", "token_type_ids"]
    torch.onnx.export(wrapper, tuple(tokens[n] for n in names), str(fp32),
                      input_names=names, output_names=["logits"], opset_version=17, dynamo=False,
                      dynamic_axes={**{n: {0: "batch", 1: "sequence"} for n in names}, "logits": {0: "batch"}})
    if args.precision == "fp16":
        onnx.save(convert_float_to_float16(onnx.load(fp32), keep_io_types=True), deployed_file)
    else:
        unsigned = args.precision == "uint8"
        quantize_dynamic(str(fp32), str(deployed_file),
                         weight_type=QuantType.QUInt8 if unsigned else QuantType.QInt8,
                         per_channel=not unsigned, reduce_range=False,
                         op_types_to_quantize=["MatMul", "Gemm", "Gather"] if unsigned else ["MatMul", "Gemm"])
    rows, _ = prepare()
    corpus = Corpus([r for r in rows if r["split"] == "dev"], tokenizer, training["maxLength"])
    labels = np.array([r["label"] for r in corpus.rows])
    reference = predict(model, corpus, "cpu", 24) / training["temperature"]
    runtime = session(deployed_file)
    deployed = predict_onnx(runtime, corpus)
    reference_metrics, deployed_metrics = metrics(reference, labels), metrics(deployed, labels)
    agreement = float(np.mean(reference.argmax(1) == deployed.argmax(1)))
    report = {
        "development": deployed_metrics,
        "torchDevelopment": reference_metrics,
        "exportClassAgreement": agreement,
        "meanProbabilityDifference": float(np.abs(softmax(reference, axis=1) - softmax(deployed, axis=1)).mean()),
        "onnxSha256": hashlib.file_digest(deployed_file.open("rb"), "sha256").hexdigest(),
        "onnxBytes": deployed_file.stat().st_size,
        "precision": args.precision,
        "temperature": training["temperature"],
        "maxLength": training["maxLength"],
        "selectedRun": args.run.name,
        "selectedEpoch": training["selectedEpoch"],
    }
    (args.output / "export.json").write_text(json.dumps(report, indent=2) + "\n")
    if agreement < .995 or deployed_metrics["macroF1"] < reference_metrics["macroF1"] - .003:
        raise RuntimeError("Export quality gate failed; keep the float checkpoint for investigation")
    assets = ROOT / "models/sentiment"
    assets.mkdir(parents=True, exist_ok=True)
    for name in ["config.json", "tokenizer_config.json", "special_tokens_map.json"]:
        shutil.copy2(args.output / name, assets / name)
    (assets / "tokenizer.json.gz").write_bytes(gzip.compress((args.output / "tokenizer.json").read_bytes(), mtime=0))
    adapter = assets / "adapter"
    adapter.mkdir(exist_ok=True)
    shutil.copy2(args.run / "adapter/adapter_model.safetensors", adapter / "adapter_model.safetensors")
    config = json.loads((args.run / "adapter/adapter_config.json").read_text())
    config.update(base_model_name_or_path=training["baseModel"], revision=training["baseRevision"])
    (adapter / "adapter_config.json").write_text(json.dumps(config, indent=2) + "\n")
    summary = {k: v for k, v in training.items()
               if k not in ["history", "splits", "baselineDev", "selectedDev", "calibration"]}
    summary["selectedRun"] = args.run.name
    summary["splitManifest"] = "data/sentiment/splits.json"
    summary["development"] = deployed_metrics
    summary["export"] = {k: v for k, v in report.items() if k not in ["development", "torchDevelopment"]}
    summary["candidates"] = []
    for run in sorted(set([args.run, *args.compare])):
        candidate = json.loads((run / "training.json").read_text())
        summary["candidates"].append({"run": run.name, "selectedEpoch": candidate["selectedEpoch"],
            "checkpointCriterion": candidate["selectionMetric"],
            "history": [{"epoch": r["epoch"], "loss": r["loss"],
                         **{k: r["dev"][k] for k in ["accuracy", "macroF1", "nll", "ece10"]}}
                        for r in candidate["history"]]})
    run_path = args.run.resolve().relative_to(ROOT).as_posix()
    summary["commands"] = {name: f"python scripts/{name}_sentiment.py --run {run_path}"
                           for name in ["export", "evaluate"]}
    (assets / "training.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / ".cache/gorisk-sentiment-v2")
    parser.add_argument("--compare", nargs="*", type=Path, default=[])
    parser.add_argument("--precision", choices=["fp16", "int8", "uint8"], default="fp16")
    export(parser.parse_args())
