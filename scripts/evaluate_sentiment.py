import argparse
import gzip
import json
import time
from pathlib import Path

import numpy as np
import torch
from peft import PeftModel
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from export_sentiment import predict_onnx, session
from prepare_sentiment import LABELS, ROOT, SEED, prepare
from train_sentiment import Corpus, metrics, model_directory, predict


def accuracy_interval(rows, labels, baseline, trained):
    groups, counts = np.unique([r["group"] for r in rows], return_counts=True)
    positions = {group: i for i, group in enumerate(groups)}
    difference = (trained.argmax(1) == labels).astype(float) - (baseline.argmax(1) == labels)
    totals = np.zeros(len(groups))
    for row, value in zip(rows, difference):
        totals[positions[row["group"]]] += value
    rng = np.random.default_rng(SEED)
    draws = rng.integers(len(groups), size=(2000, len(groups)))
    estimates = totals[draws].sum(1) / counts[draws].sum(1)
    return {"accuracyGain": float(difference.mean()), "bootstrap95": np.quantile(estimates, [.025, .975]).tolist(),
            "unit": "near-duplicate group", "resamples": 2000}


def evaluate(args):
    torch.set_num_threads(4)
    rows, splits = prepare()
    test = [r for r in rows if r["split"] == "test"]
    settings = json.loads((args.run / "training.json").read_text())
    tokenizer = AutoTokenizer.from_pretrained(model_directory())
    corpus = Corpus(test, tokenizer, settings["maxLength"])
    labels = np.array([r["label"] for r in test])
    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    model = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager").to(device)
    baseline = predict(model, corpus, device, 24)
    model = PeftModel.from_pretrained(model, args.run / "adapter").to(device)
    trained = predict(model, corpus, device, 24) / settings["temperature"]
    model.cpu()
    del model
    if device == "mps":
        torch.mps.empty_cache()
    runtime = session(args.model / "onnx/model_quantized.onnx")
    started = time.perf_counter()
    deployed = predict_onnx(runtime, corpus)
    elapsed = time.perf_counter() - started
    report = {
        "version": settings["version"], "labelOrder": LABELS,
        "selection": {"run": args.run.name, "epoch": settings["selectedEpoch"],
                      "criterion": "development macro-F1; final test not used for selection"},
        "test": splits["splits"]["test"],
        "preprocessing": "Remove URLs, normalize whitespace, add terminal punctuation; first 128 tokens for both models",
        "labelRule": "highest-probability class; sentiment score remains P(positive) - P(negative)",
        "baseline": metrics(baseline, labels), "fineTuned": metrics(trained, labels),
        "deployedQ8": metrics(deployed, labels),
        "majorityAccuracy": float(np.bincount(labels).max() / len(labels)),
        "pairedImprovement": accuracy_interval(test, labels, baseline, deployed),
        "quantizationClassAgreement": float(np.mean(trained.argmax(1) == deployed.argmax(1))),
        "inference": {"runtime": "ONNX Runtime CPU", "batchSize": 24,
                      "testSeconds": round(elapsed, 3), "examplesPerSecond": round(len(test) / elapsed, 2)},
        "limits": ["Historical English financial posts, not a future-news or market-return benchmark",
                   "PhraseBank was used in base-model training and is excluded from independent evaluation",
                   "Near-duplicate filtering reduces but cannot prove absence of all related-story leakage",
                   "Policy-prefixed metrics describe the previous +/-0.15 label rule; deployed labels use argmax",
                   "Topic, event, severity and portfolio-loss accuracy are not measured here"],
    }
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    probabilities = [softmax(x, axis=1) for x in [baseline, trained, deployed]]
    records = [{"id": r["id"], "label": r["label"],
                **{name: [round(float(v), 7) for v in p[i]]
                   for name, p in zip(["baseline", "fineTuned", "deployedQ8"], probabilities)}}
               for i, r in enumerate(test)]
    raw = "".join(json.dumps(r, separators=(",", ":")) + "\n" for r in records).encode()
    (args.output / "test-predictions.jsonl.gz").write_bytes(gzip.compress(raw, mtime=0))
    print(json.dumps({k: {m: report[k][m] for m in ["accuracy", "macroF1", "ece10"]}
                      for k in ["baseline", "fineTuned", "deployedQ8"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--model", type=Path, default=ROOT / ".cache/gorisk-sentiment-v2")
    parser.add_argument("--output", type=Path, default=ROOT / "models/sentiment")
    evaluate(parser.parse_args())
