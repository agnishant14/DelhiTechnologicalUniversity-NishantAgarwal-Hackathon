import csv
import gzip
import hashlib
import io
import json
import re
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
LABELS = [
    "Analyst Update", "Fed | Central Banks", "Company | Product News",
    "Treasuries | Corporate Debt", "Dividend", "Earnings", "Energy | Oil",
    "Financials", "Currencies", "General News | Opinion",
    "Gold | Metals | Materials", "IPO", "Legal | Regulation", "M&A | Investments",
    "Macro", "Markets", "Politics", "Personnel Change", "Stock Commentary", "Stock Movement",
]
VERSION = "gorisk-topic-v1"


def clean(text):
    return re.sub(r"https?://\S+", " ", text.lower())


def key(text):
    return " ".join(re.findall(r"\b[a-z][a-z0-9]{1,}\b", clean(text)))


def read(name):
    raw = gzip.decompress((ROOT / "data/training" / name).read_bytes())
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8"))))
    return rows, hashlib.sha256(raw).hexdigest()


def deduplicate(rows, excluded=None):
    seen = set(excluded or [])
    result = []
    for row in rows:
        identity = key(row["text"])
        if identity and identity not in seen:
            result.append(row)
            seen.add(identity)
    return result


def vectorizer():
    return TfidfVectorizer(preprocessor=clean, token_pattern=r"\b[a-z][a-z0-9]{1,}\b",
                           ngram_range=(1, 2), max_features=12000, min_df=2, sublinear_tf=True)


def fit(x, y, c):
    return LogisticRegression(C=c, max_iter=700, class_weight="balanced", random_state=42).fit(x, y)


def main():
    raw_train, train_hash = read("train.csv.gz")
    raw_valid, valid_hash = read("validation.csv.gz")
    train = deduplicate(raw_train)
    valid = deduplicate(raw_valid, [key(row["text"]) for row in train])
    text = [r["text"] for r in train]
    labels = [int(r["label"]) for r in train]
    fit_text, tune_text, fit_y, tune_y = train_test_split(text, labels, test_size=.2, stratify=labels, random_state=42)
    tuning_vectorizer = vectorizer()
    fit_x = tuning_vectorizer.fit_transform(fit_text)
    tune_x = tuning_vectorizer.transform(tune_text)
    tuning = []
    for c in [1.0, 4.0]:
        score = f1_score(tune_y, fit(fit_x, fit_y, c).predict(tune_x), average="macro")
        tuning.append({"C": c, "macroF1": round(float(score), 6)})
        print("Training-only selection:", tuning[-1], flush=True)
    selected = max(tuning, key=lambda row: row["macroF1"])["C"]
    vec = vectorizer()
    model = fit(vec.fit_transform(text), labels, selected)
    valid_text = [r["text"] for r in valid]
    y = np.array([int(r["label"]) for r in valid])
    probabilities = model.predict_proba(vec.transform(valid_text))
    predictions = probabilities.argmax(axis=1)
    report = classification_report(y, predictions, target_names=LABELS, output_dict=True, zero_division=0)
    baseline = np.full(len(y), np.bincount(labels).argmax())
    accepted = probabilities.max(axis=1) >= .45
    export = {
        "version": VERSION, "labels": LABELS, "vocabulary": {k: int(v) for k, v in vec.vocabulary_.items()},
        "idf": vec.idf_.round(7).tolist(), "coefficients": model.coef_.round(7).tolist(),
        "intercept": model.intercept_.round(7).tolist(), "threshold": .45,
    }
    artifact = gzip.compress(json.dumps(export, separators=(",", ":")).encode(), mtime=0)
    (ROOT / "models").mkdir(exist_ok=True)
    (ROOT / "models/topic.json.gz").write_bytes(artifact)
    metrics = {
        "version": VERSION, "model": "TF-IDF + multinomial logistic regression",
        "dataset": "zeroshot/twitter-financial-news-topic",
        "revision": "acbc8af2a35ccf0916124efcbe9e6cf25f191012",
        "trainCount": len(train), "validationCount": len(valid),
        "removedTrainDuplicates": len(raw_train) - len(train),
        "removedValidationDuplicatesOrOverlap": len(raw_valid) - len(valid),
        "dataHashes": {"train": train_hash, "validation": valid_hash},
        "artifactSha256": hashlib.sha256(artifact).hexdigest(),
        "features": len(vec.vocabulary_), "seed": 42, "selectedC": selected, "tuning": tuning,
        "accuracy": float(accuracy_score(y, predictions)), "macroF1": float(f1_score(y, predictions, average="macro")),
        "majorityAccuracy": float(accuracy_score(y, baseline)),
        "majorityMacroF1": float(f1_score(y, baseline, average="macro")),
        "reviewThreshold": .45, "coverageAtThreshold": float(accepted.mean()),
        "accuracyAtThreshold": float(accuracy_score(y[accepted], predictions[accepted])),
        "perClass": [{"label": label, **report[label]} for label in LABELS],
        "confusionMatrix": confusion_matrix(y, predictions).tolist(),
        "limitations": [
            "Validation is the publisher's held-out split, not a time-forward market backtest.",
            "Exact normalized duplicates and train/validation overlap removed; near duplicates can remain.",
            "Historical English financial tweets differ from current news and community posts.",
            "Softmax scores are uncalibrated confidence estimates. The 0.45 review threshold is a policy choice.",
            "Topic accuracy does not measure sentiment accuracy, event mapping accuracy, impact prediction or investment returns.",
        ],
    }
    (ROOT / "models/metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    fixtures = [{"text": t, "probabilities": p.round(6).tolist()} for t, p in zip(valid_text[:6], probabilities[:6])]
    (ROOT / "models/parity.json").write_text(json.dumps(fixtures, indent=2) + "\n")
    print(json.dumps({k: metrics[k] for k in ["trainCount", "validationCount", "accuracy", "macroF1", "majorityAccuracy"]}, indent=2))


if __name__ == "__main__":
    main()
