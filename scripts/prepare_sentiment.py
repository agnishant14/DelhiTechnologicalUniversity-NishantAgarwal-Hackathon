import csv
import gzip
import hashlib
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from sklearn.model_selection import StratifiedGroupKFold

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/sentiment"
LABELS = ["positive", "negative", "neutral"]
SEED = 42


def model_text(text):
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if re.search(r"[.!?][\"'”’)]*$", text) else text + "."


def key(text):
    return " ".join(re.findall(r"[a-z0-9]+", model_text(text).lower()))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def load_sources():
    rows = []
    for name, origin in [("sent_train.csv.gz", "publisher_train"),
                         ("sent_valid.csv.gz", "publisher_validation")]:
        raw = gzip.decompress((DATA / name).read_bytes()).decode("utf-8")
        for r in csv.DictReader(io.StringIO(raw)):
            rows.append({"text": r["text"], "label": {"0": 1, "1": 0, "2": 2}[r["label"]],
                         "source": "twitter-financial-news", "origin": origin})
    with zipfile.ZipFile(DATA / "phrasebank-kaggle-v5.zip") as archive:
        raw = archive.read("FinancialPhraseBank/Sentences_75Agree.txt").decode("latin-1")
        known = archive.read("FinancialPhraseBank/Sentences_50Agree.txt").decode("latin-1")
    for line in raw.splitlines():
        text, label = line.rsplit("@", 1)
        rows.append({"text": text, "label": LABELS.index(label.strip()),
                     "source": "financial-phrasebank", "origin": "rehearsal"})
    return rows, {key(line.rsplit("@", 1)[0]) for line in known.splitlines()}


def group_similar(rows):
    parents = list(range(len(rows)))

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    shingles, postings = [], defaultdict(list)
    for i, row in enumerate(rows):
        words = key(row["text"]).split()
        grams = {tuple(words[j:j + 3]) for j in range(len(words) - 2)}
        shingles.append(grams)
        candidates = set()
        for gram in grams:
            if len(postings[gram]) < 150:
                candidates.update(postings[gram])
        for j in sorted(candidates):
            other = shingles[j]
            if len(grams) >= 4 and len(grams & other) / len(grams | other) >= .8:
                a, b = find(i), find(j)
                parents[max(a, b)] = min(a, b)
        for gram in grams:
            postings[gram].append(i)
    return [rows[find(i)]["id"] for i in range(len(rows))]


def prepare():
    raw, known_pretraining = load_sources()
    exact = defaultdict(list)
    for row in raw:
        exact[key(row["text"])].append(row)
    clean, conflicts = [], 0
    for identity, copies in sorted(exact.items()):
        if not identity or len({r["label"] for r in copies}) != 1:
            conflicts += len(copies)
            continue
        row = min(copies, key=lambda r: (r["origin"] != "publisher_validation", r["origin"] == "rehearsal"))
        clean.append({**row, "id": digest(identity.encode())[:24]})
    groups = group_similar(clean)
    for row, group in zip(clean, groups):
        row["group"] = group
    test_groups = {r["group"] for r in clean if r["origin"] == "publisher_validation"}
    test, seen = [], set()
    for r in clean:
        if r["origin"] == "publisher_validation" and r["group"] not in seen and key(r["text"]) not in known_pretraining:
            test.append({**r, "split": "test"})
            seen.add(r["group"])
    pool = [r for r in clean if r["origin"] == "publisher_train" and r["group"] not in test_groups]
    splitter = StratifiedGroupKFold(n_splits=10, shuffle=True, random_state=SEED)
    for fold, (_, indices) in enumerate(splitter.split(pool, [r["label"] for r in pool], [r["group"] for r in pool])):
        for i in indices:
            pool[i]["split"] = "dev" if fold == 0 else "calibration" if fold == 1 else "train"
    excluded = test_groups | {r["group"] for r in pool if r["split"] != "train"}
    rehearsal = [{**r, "split": "train"} for r in clean if r["source"] == "financial-phrasebank" and r["group"] not in excluded]
    records = sorted(pool + rehearsal + test, key=lambda r: (r["split"], r["id"]))
    split_names = ["train", "dev", "calibration", "test"]
    group_sets = [{r["group"] for r in records if r["split"] == s} for s in split_names]
    assert all(not a & b for i, a in enumerate(group_sets) for b in group_sets[i + 1:])
    summary = {
        "seed": SEED, "rawCount": len(raw), "exactUniqueCount": len(clean),
        "conflictingRowsRemoved": conflicts, "exactDuplicateRowsRemoved": len(raw) - conflicts - len(clean),
        "nearDuplicateGroups": len(set(groups)), "crossSplitGroupOverlap": 0,
        "rowsExcludedForHoldoutOrNearDuplicates": len(clean) - len(records),
        "sourceHashes": {p.name: digest(p.read_bytes()) for p in sorted(DATA.iterdir()) if p.suffix in [".gz", ".zip"]},
        "splits": {},
    }
    for name in split_names:
        subset = [r for r in records if r["split"] == name]
        summary["splits"][name] = {
            "count": len(subset), "labels": dict(Counter(LABELS[r["label"]] for r in subset)),
            "sources": dict(Counter(r["source"] for r in subset)),
            "fingerprint": digest(json.dumps(subset, sort_keys=True).encode()),
        }
    cache = ROOT / ".cache/sentiment-training"
    cache.mkdir(parents=True, exist_ok=True)
    (cache / "prepared.json").write_text(json.dumps(records))
    (DATA / "splits.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2), flush=True)
    return records, summary


if __name__ == "__main__":
    prepare()
