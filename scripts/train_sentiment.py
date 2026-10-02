import argparse
import json
import random
import time
from pathlib import Path

import numpy as np
import torch
from huggingface_hub import snapshot_download
from peft import LoraConfig, TaskType, get_peft_model
from scipy.optimize import minimize_scalar
from scipy.special import softmax
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, log_loss
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup

from prepare_sentiment import LABELS, ROOT, SEED, model_text, prepare

BASE = "ProsusAI/finbert"
REVISION = "4556d13015211d73dccd3fdd39d39232506f3e43"


def model_directory():
    directory = ROOT / ".cache/finbert-base"
    if not (directory / "pytorch_model.bin").exists():
        snapshot_download(BASE, revision=REVISION, local_dir=directory,
                          allow_patterns=["pytorch_model.bin", "*.json", "vocab.txt", "README.md"])
    return directory


def metrics(logits, labels, temperature=1.0):
    probabilities = softmax(logits / temperature, axis=1)
    predictions = probabilities.argmax(1)
    score = probabilities[:, 0] - probabilities[:, 1]
    policy = np.where(score > .15, 0, np.where(score < -.15, 1, 2))
    confidence = probabilities.max(1)
    correct = predictions == labels
    ece = 0.0
    for low in np.arange(0, 1, .1):
        selected = (confidence > low) & (confidence <= low + .1)
        if selected.any():
            ece += selected.mean() * abs(correct[selected].mean() - confidence[selected].mean())
    return {
        "count": len(labels), "accuracy": float(accuracy_score(labels, predictions)),
        "macroF1": float(f1_score(labels, predictions, average="macro")),
        "classConfusionMatrix": confusion_matrix(labels, predictions, labels=[0, 1, 2]).tolist(),
        "classReport": classification_report(labels, predictions, labels=[0, 1, 2], target_names=LABELS, output_dict=True, zero_division=0),
        "policyAccuracy": float(accuracy_score(labels, policy)),
        "policyMacroF1": float(f1_score(labels, policy, average="macro")),
        "negativeRecall": float(((policy == 1) & (labels == 1)).sum() / max(1, (labels == 1).sum())),
        "negativeToNeutral": int(((policy == 2) & (labels == 1)).sum()),
        "nll": float(log_loss(labels, probabilities, labels=[0, 1, 2])),
        "brier": float(np.mean(np.sum((probabilities - np.eye(3)[labels]) ** 2, axis=1))),
        "ece10": float(ece), "confusionMatrix": confusion_matrix(labels, policy, labels=[0, 1, 2]).tolist(),
        "perClass": classification_report(labels, policy, labels=[0, 1, 2], target_names=LABELS, output_dict=True, zero_division=0),
    }


class Corpus:
    def __init__(self, rows, tokenizer, max_length):
        self.rows, self.tokenizer = rows, tokenizer
        self.tokens = tokenizer([model_text(r["text"]) for r in rows], truncation=True, max_length=max_length)

    def batches(self, batch_size, epoch=None):
        indices = np.arange(len(self.rows))
        if epoch is not None:
            rng = np.random.default_rng(SEED + epoch)
            rng.shuffle(indices)
            buckets = [sorted(indices[i:i + batch_size * 30], key=lambda j: len(self.tokens["input_ids"][j]))
                       for i in range(0, len(indices), batch_size * 30)]
            batches = [bucket[i:i + batch_size] for bucket in buckets for i in range(0, len(bucket), batch_size)]
            rng.shuffle(batches)
        else:
            batches = [indices[i:i + batch_size] for i in range(0, len(indices), batch_size)]
        for indices in batches:
            encoded = [{k: v[i] for k, v in self.tokens.items()} for i in indices]
            tokens = self.tokenizer.pad(encoded, padding=True, pad_to_multiple_of=8, return_tensors="pt")
            labels = torch.tensor([self.rows[i]["label"] for i in indices])
            weights = torch.tensor([.6 if self.rows[i]["source"] == "financial-phrasebank" else 1.0 for i in indices])
            yield tokens, labels, weights


def predict(model, corpus, device, batch_size):
    model.eval()
    outputs = []
    with torch.inference_mode():
        for tokens, _, _ in corpus.batches(batch_size):
            outputs.append(model(**tokens.to(device)).logits.cpu().numpy())
    return np.concatenate(outputs)


def train(args):
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(4)
    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    rows, splits = prepare()
    tokenizer = AutoTokenizer.from_pretrained(model_directory())
    corpora = {s: Corpus([r for r in rows if r["split"] == s], tokenizer, args.max_length)
               for s in ["train", "dev", "calibration"]}
    labels = {s: np.array([r["label"] for r in corpus.rows]) for s, corpus in corpora.items()}
    model = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager").to(device)
    args.output.mkdir(parents=True, exist_ok=True)
    log = args.output / "progress.jsonl"

    def report(event):
        event["elapsedSeconds"] = round(time.time() - started, 1)
        with log.open("a") as stream:
            stream.write(json.dumps(event) + "\n")
        print(json.dumps(event), flush=True)

    started = time.time()
    baseline = metrics(predict(model, corpora["dev"], device, args.batch_size), labels["dev"])
    report({"stage": "baseline_dev", "metrics": baseline})
    config = LoraConfig(task_type=TaskType.SEQ_CLS, r=args.rank, lora_alpha=args.rank * 2,
                        lora_dropout=.05, target_modules=["query", "value"],
                        layers_to_transform=list(range(12 - args.layers, 12)))
    model = get_peft_model(model, config)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    optimizer = torch.optim.AdamW([
        {"params": [p for n, p in model.named_parameters() if p.requires_grad and "lora_" in n], "lr": args.learning_rate},
        {"params": [p for n, p in model.named_parameters() if p.requires_grad and "lora_" not in n], "lr": args.learning_rate / 4},
    ], weight_decay=.01)
    steps = int(np.ceil(len(corpora["train"].rows) / args.batch_size))
    scheduler = get_linear_schedule_with_warmup(optimizer, max(1, int(steps * args.epochs * .06)), steps * args.epochs)
    frequencies = np.bincount(labels["train"], minlength=3)
    weights = (len(labels["train"]) / (3 * frequencies)) ** args.class_weight_power
    class_weights = torch.tensor(weights / weights.mean(), dtype=torch.float32, device=device)
    best, stale, selected_epoch, history = -1.0, 0, 0, []
    report({"stage": "training", "device": device, "trainableParameters": trainable,
            "rank": args.rank, "layers": args.layers, "stepsPerEpoch": steps})
    for epoch in range(args.epochs):
        model.train()
        total, count = 0.0, 0
        for step, (tokens, target, source_weight) in enumerate(corpora["train"].batches(args.batch_size, epoch), 1):
            optimizer.zero_grad(set_to_none=True)
            logits = model(**tokens.to(device)).logits
            losses = torch.nn.functional.cross_entropy(logits, target.to(device), weight=class_weights, reduction="none")
            loss = (losses * source_weight.to(device)).mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            total += loss.item()
            count += 1
            if step % 50 == 0 or step == steps:
                report({"stage": "batch", "epoch": epoch + 1, "step": step, "steps": steps, "loss": round(total / count, 5)})
        dev_logits = predict(model, corpora["dev"], device, args.batch_size)
        result = {"epoch": epoch + 1, "loss": total / count, "dev": metrics(dev_logits, labels["dev"])}
        history.append(result)
        report({"stage": "validation", **result})
        if result["dev"][args.selection_metric] > best + .001:
            best, stale, selected_epoch = result["dev"][args.selection_metric], 0, epoch + 1
            model.save_pretrained(args.output / "adapter")
            tokenizer.save_pretrained(args.output / "adapter")
            np.savez(args.output / "best-dev.npz", logits=dev_logits, labels=labels["dev"])
        else:
            stale += 1
        (args.output / "history.json").write_text(json.dumps(history, indent=2) + "\n")
        if stale >= 2:
            break
    from peft import PeftModel
    model.cpu()
    del model, optimizer
    if device == "mps":
        torch.mps.empty_cache()
    base = AutoModelForSequenceClassification.from_pretrained(model_directory(), attn_implementation="eager")
    model = PeftModel.from_pretrained(base, args.output / "adapter").to(device)
    calibration = predict(model, corpora["calibration"], device, args.batch_size)
    optimum = minimize_scalar(lambda t: log_loss(labels["calibration"], softmax(calibration / t, axis=1), labels=[0, 1, 2]),
                              bounds=(.4, 3.0), method="bounded")
    temp = float(optimum.x)
    dev = np.load(args.output / "best-dev.npz")
    calibrated_dev = metrics(dev["logits"], dev["labels"], temp)
    raw_dev = metrics(dev["logits"], dev["labels"])
    use_temperature = calibrated_dev[args.selection_metric] >= raw_dev[args.selection_metric] - .003
    summary = {
        "version": "gorisk-sentiment-v2", "baseModel": BASE, "baseRevision": REVISION,
        "seed": SEED, "device": device, "rank": args.rank, "layers": args.layers,
        "learningRate": args.learning_rate, "batchSize": args.batch_size, "maxLength": args.max_length,
        "trainableParameters": trainable, "classWeights": class_weights.cpu().tolist(),
        "phrasebankLossWeight": .6, "classWeightPower": args.class_weight_power,
        "selectionMetric": f"dev {args.selection_metric}", "history": history,
        "baselineDev": baseline, "selectedEpoch": selected_epoch,
        "temperature": temp if use_temperature else 1.0, "fittedTemperature": temp,
        "temperatureAccepted": bool(use_temperature), "selectedDev": calibrated_dev if use_temperature else raw_dev,
        "calibration": metrics(calibration, labels["calibration"], temp if use_temperature else 1.0),
        "splits": splits, "elapsedSeconds": round(time.time() - started, 1),
    }
    (args.output / "training.json").write_text(json.dumps(summary, indent=2) + "\n")
    report({"stage": "complete", "selectedEpoch": summary["selectedEpoch"], "temperature": summary["temperature"],
            "baselineDevF1": baseline[args.selection_metric], "trainedDevF1": summary["selectedDev"][args.selection_metric]})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / ".cache/sentiment-training/run-a")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--layers", type=int, default=6)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--class-weight-power", type=float, default=.5)
    parser.add_argument("--selection-metric", choices=["macroF1", "policyMacroF1"], default="macroF1")
    train(parser.parse_args())
