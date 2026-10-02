import argparse
import gzip
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
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


def predict_onnx(runtime, corpus, batch_size=24):
    names = {item.name for item in runtime.get_inputs()}
    output = []
    for tokens, _, _ in corpus.batches(batch_size):
        output.append(runtime.run(None, {k: v.numpy() for k, v in tokens.items() if k in names})[0])
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
    args.output.mkdir(parents=True, exist_ok=True)
    tokenizer = AutoTokenizer.from_pretrained(model_directory())
    tokenizer.save_pretrained(args.output)
    base = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager")
    model = PeftModel.from_pretrained(base, args.run / "adapter").merge_and_unload().eval()
    model.config.save_pretrained(args.output)
    wrapper = InferenceModel(model, training["temperature"]).eval()
    tokens = tokenizer("Apple reports quarterly results.", return_tensors="pt")
    onnx_dir = args.output / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    fp32, q8 = onnx_dir / "model.onnx", onnx_dir / "model_quantized.onnx"
    names = ["input_ids", "attention_mask", "token_type_ids"]
    torch.onnx.export(wrapper, tuple(tokens[n] for n in names), str(fp32),
                      input_names=names, output_names=["logits"], opset_version=17, dynamo=False,
                      dynamic_axes={**{n: {0: "batch", 1: "sequence"} for n in names}, "logits": {0: "batch"}})
    quantize_dynamic(str(fp32), str(q8), weight_type=QuantType.QInt8, per_channel=True,
                     reduce_range=True, op_types_to_quantize=["MatMul", "Gemm", "Gather"])
    rows, _ = prepare()
    corpus = Corpus([r for r in rows if r["split"] == "dev"], tokenizer, training["maxLength"])
    labels = np.array([r["label"] for r in corpus.rows])
    reference = predict(model, corpus, "cpu", 24) / training["temperature"]
    runtime = session(q8)
    deployed = predict_onnx(runtime, corpus)
    reference_metrics, deployed_metrics = metrics(reference, labels), metrics(deployed, labels)
    agreement = float(np.mean(reference.argmax(1) == deployed.argmax(1)))
    report = {
        "development": deployed_metrics,
        "torchDevelopment": reference_metrics,
        "quantizationClassAgreement": agreement,
        "meanProbabilityDifference": float(np.abs(softmax(reference, axis=1) - softmax(deployed, axis=1)).mean()),
        "onnxSha256": hashlib.file_digest(q8.open("rb"), "sha256").hexdigest(),
        "onnxBytes": q8.stat().st_size,
        "temperature": training["temperature"],
        "maxLength": training["maxLength"],
        "selectedRun": args.run.name,
        "selectedEpoch": training["selectedEpoch"],
    }
    (args.output / "export.json").write_text(json.dumps(report, indent=2) + "\n")
    if agreement < .98 or deployed_metrics["macroF1"] < reference_metrics["macroF1"] - .01:
        raise RuntimeError("Quantization quality gate failed; keep the float checkpoint for investigation")
    assets = ROOT / "models/sentiment"
    assets.mkdir(parents=True, exist_ok=True)
    for name in ["config.json", "tokenizer_config.json", "special_tokens_map.json"]:
        shutil.copy2(args.output / name, assets / name)
    (assets / "tokenizer.json.gz").write_bytes(gzip.compress((args.output / "tokenizer.json").read_bytes(), mtime=0))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / ".cache/gorisk-sentiment-v2")
    export(parser.parse_args())
