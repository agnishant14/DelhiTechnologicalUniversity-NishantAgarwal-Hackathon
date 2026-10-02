import argparse
import gzip
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import torch
from scipy.special import softmax
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from export_sentiment import predict_onnx, session
from prepare_sentiment import LABELS, ROOT, SEED, prepare
from train_sentiment import Corpus, load_checkpoint, metrics, model_directory, predict


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
    exported = json.loads((args.model / "export.json").read_text())
    if exported["selectedRun"] != args.run.name:
        raise ValueError("Exported model does not match the selected training run")
    settings["temperature"] = exported["temperature"]
    weights = args.model / "onnx/model_fp16.onnx"
    with weights.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    if checksum != exported["onnxSha256"]:
        raise ValueError("Model weights differ from the validated export")
    baseline_tokenizer = AutoTokenizer.from_pretrained(model_directory())
    baseline_corpus = Corpus(test, baseline_tokenizer, settings["maxLength"])
    labels = np.array([r["label"] for r in test])
    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    model = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager").to(device)
    baseline = predict(model, baseline_corpus, device, 24)
    model.cpu()
    del model
    if device == "mps":
        torch.mps.empty_cache()
    tokenizer = AutoTokenizer.from_pretrained(model_directory(settings.get("backbone", "finbert")))
    corpus = Corpus(test, tokenizer, settings["maxLength"])
    model = load_checkpoint(args.run, device)
    trained = predict(model, corpus, device, 24) / settings["temperature"]
    model.cpu()
    del model
    if device == "mps":
        torch.mps.empty_cache()
    runtime = session(weights)
    started = time.perf_counter()
    deployed = predict_onnx(runtime, corpus)
    elapsed = time.perf_counter() - started
    report = {
        "version": exported.get("version", settings["version"]), "labelOrder": LABELS,
        "artifact": {"sha256": checksum, "precision": "fp16", "bytes": weights.stat().st_size},
        "selection": {"run": args.run.name, "epoch": settings["selectedEpoch"],
                      "criterion": "development metrics and fixed bankruptcy/company regression checks; test not used for selection"},
        "test": splits["splits"]["test"],
        "preprocessing": f"Remove URLs, normalize whitespace, add terminal punctuation; first {settings['maxLength']} tokens with each model's tokenizer",
        "labelRule": "highest-probability class; sentiment score remains P(positive) - P(negative)",
        "baseline": metrics(baseline, labels), "fineTuned": metrics(trained, labels),
        "deployed": metrics(deployed, labels),
        "majorityAccuracy": float(np.bincount(labels).max() / len(labels)),
        "pairedImprovement": accuracy_interval(test, labels, baseline, deployed),
        "exportClassAgreement": float(np.mean(trained.argmax(1) == deployed.argmax(1))),
        "inference": {"runtime": "ONNX Runtime CPU", "batchSize": 1,
                      "testSeconds": round(elapsed, 3), "examplesPerSecond": round(len(test) / elapsed, 2)},
        "limits": ["Historical English financial posts, not a future-news or market-return benchmark",
                   "PhraseBank was used in base-model training and is excluded from independent evaluation",
                   "Near-duplicate filtering reduces but cannot prove absence of all related-story leakage",
                   "Policy-prefixed metrics describe the previous +/-0.15 label rule; deployed labels use argmax",
                   "Topic, event, severity and portfolio-loss accuracy are not measured here"],
    }
    if args.previous:
        previous_rows = [json.loads(line) for line in gzip.decompress(args.previous.read_bytes()).decode().splitlines()]
        if [r["id"] for r in previous_rows] != [r["id"] for r in test]:
            raise ValueError("Previous predictions do not match this benchmark")
        previous = np.log(np.clip([r["deployed"] for r in previous_rows], 1e-12, 1))
        report["previousRelease"] = metrics(previous, labels)
        report["improvementOverPrevious"] = accuracy_interval(test, labels, previous, deployed)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    probabilities = [softmax(x, axis=1) for x in [baseline, trained, deployed]]
    records = [{"id": r["id"], "label": r["label"],
                **{name: [round(float(v), 7) for v in p[i]]
                   for name, p in zip(["baseline", "fineTuned", "deployed"], probabilities)}}
               for i, r in enumerate(test)]
    raw = "".join(json.dumps(r, separators=(",", ":")) + "\n" for r in records).encode()
    (args.output / "test-predictions.jsonl.gz").write_bytes(gzip.compress(raw, mtime=0))
    fixtures = []
    for label in range(3):
        indices = np.where(labels == label)[0][:8]
        fixtures.extend({"text": test[i]["text"], "probabilities": dict(zip(LABELS, probabilities[2][i].tolist()))}
                        for i in indices)
    (args.output / "parity.json").write_text(json.dumps(fixtures, indent=2) + "\n")
    print(json.dumps({k: {m: report[k][m] for m in ["accuracy", "macroF1", "ece10"]}
                      for k in ["baseline", "fineTuned", "deployed"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--model", type=Path, default=ROOT / ".cache/gorisk-sentiment-v2")
    parser.add_argument("--output", type=Path, default=ROOT / "models/sentiment")
    parser.add_argument("--previous", type=Path)
    evaluate(parser.parse_args())
