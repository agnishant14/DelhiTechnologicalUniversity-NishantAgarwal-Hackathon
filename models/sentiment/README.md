# GoRisk financial sentiment model

A FinBERT model fine-tuned for this project on human-annotated financial headlines and posts. Inference runs locally on CPU; no paid API or Python server is required.

## Data and evaluation

Training uses **10,895 examples**: 7,448 from Hugging Face's `zeroshot/twitter-financial-news-sentiment` and 3,447 from Kaggle's Financial PhraseBank, using its 75% annotator-agreement subset. There are no synthetic training examples. Original inputs, revisions, attribution and checksums are in [data/sentiment](../../data/sentiment/SOURCE.md).

The other partitions contain 932 development examples, 932 calibration examples and 2,367 final test examples. Exact duplicates, conflicting labels and overlapping near-duplicate groups are filtered before training. Development data and fixed engineering regressions select the release checkpoint; calibration data fits one temperature. Test labels are excluded from training, calibration and selection. Known PhraseBank examples occur only in training. Because FinBERT already trained on PhraseBank, PhraseBank is never presented as an independent benchmark.

`evaluation.json` contains classification results, per-class precision/recall, confusion matrices, calibration metrics and a paired bootstrap interval for the accuracy improvement. `test-predictions.jsonl.gz` stores probabilities linked to reproducible example IDs, without duplicating headline text. Labels use the largest probability. Fields prefixed with `policy` describe the previous ±0.15 label rule and are included for comparison only.

| Final test metric | Base FinBERT | Released model |
| --- | --- | --- |
| Accuracy | 69.16% | 83.69% |
| Macro-F1 | 64.62% | 79.73% |
| Negative precision | 44.97% | 68.46% |
| Negative recall | 82.90% | 81.16% |
| Expected calibration error (10 bins) | 12.97% | 2.11% |

The accuracy gain is 14.53 percentage points (paired bootstrap 95% interval: 12.72–16.35 points). This is uncertainty within this dataset, not a forecast for future news. Negative recall decreased slightly; fewer neutral headlines were falsely labeled negative. The float16 and float32 models agree on all test class predictions. CPU inference measured 37.7 headlines/second, one unpadded headline at a time, excluding startup.

Evaluation audit: Run B was evaluated before its bankruptcy-filing smoke failure was found. It was rejected using that pre-existing engineering check, without using test metrics to choose or tune the replacement. Run A's final report is the one published here. No test labels or handcrafted probes were added to training.

## Training

Base model: [`ProsusAI/finbert`](https://huggingface.co/ProsusAI/finbert), revision `4556d13015211d73dccd3fdd39d39232506f3e43`. Label order: positive, negative, neutral. The tokenizer removes URLs, normalizes whitespace and supplies missing terminal punctuation. Both the baseline and trained model use the first 128 tokens in the comparison.

LoRA adapts BERT query/value projections and trains the classifier head. AdamW uses weight decay 0.01, gradient clipping at 1, 6% warmup and linear learning-rate decay. The head learning rate is one quarter of the adapter rate. PhraseBank has a 0.6 loss multiplier to preserve general financial language while emphasizing the target financial-post domain. Batch size is 24, with length bucketing and dynamic padding; seed is 42.

Two configurations are compared on development data:

| Run | Rank / final BERT layers | Epochs | Adapter learning rate | Class-weight exponent | Checkpoint criterion |
| --- | --- | --- | --- | --- | --- |
| A | 8 / 6 | 4 | 0.0002 | 0.5 | Previous policy macro-F1 |
| B | 16 / 8 | 3 | 0.0002 | 0.25 | Classification macro-F1 |

Run A, **epoch 4**, was selected: **84.44% development accuracy / 81.34% macro-F1**, compared with the base model's **70.17% / 65.89%**. Run B reached 85.19% / 81.57%, but failed the fixed `apple files for bankruptcy` release check. Run A passes all 14 existing model regressions. This release decision used development results and the predetermined engineering checks, not test metrics. `training.json` records the comparison and fitted temperature of 1.1273.

Temperature is applied inside the exported graph, once; it changes probability confidence but not class ranking. The ONNX export merges the adapter into FinBERT and uses **float16** weights. This retains **100% class agreement on 932 development examples** while halving the float32 model's size. Signed and unsigned 8-bit variants changed too many predictions and were rejected. Development checks require at least 99.5% agreement and no more than 0.3 macro-F1 percentage points of loss. Runtime evaluation uses one unpadded headline at a time, matching the backend.

## Reproduce

Tested with Python 3.12 and PyTorch 2.10 on an Apple M1 using MPS. CUDA and CPU are also supported; floating-point results and timings may vary. No paid cloud training was used.

```sh
python3.12 -m venv .cache/sentiment-env
source .cache/sentiment-env/bin/activate
pip install -r requirements-sentiment.txt
python scripts/prepare_sentiment.py
python scripts/train_sentiment.py --output .cache/sentiment-training/run-a --epochs 4 --selection-metric policyMacroF1
python scripts/train_sentiment.py --output .cache/sentiment-training/run-b --epochs 3 --rank 16 --layers 8 --class-weight-power 0.25 --selection-metric macroF1
```

Select using development results before evaluating the final test. Export and evaluation commands for the selected run are recorded in `training.json`. The app remains pinned to the published artifact in `manifest.json`; retraining does not silently replace deployed weights. Raw checkpoints, Python dependencies and large ONNX files stay in the ignored cache. The compact adapter is included for reproducibility; the inference weights are a GitHub release asset.

For compression experiments, the export script also accepts `--precision int8` or `--precision uint8`; use a separate `--output` directory. A failed quality gate leaves experimental graphs in that cache and does not replace the repository's model assets.

## Output and limitations

The model returns positive, negative and neutral probabilities. `sentimentLabel` is the most likely class. The independent continuous score is `P(positive) - P(negative)`; a neutral label can therefore coexist with a directional score. The portfolio rebalancer consumes that score. Clearly separated company sentences are inferred independently.

Confidence calibration is measured on this historical English dataset, not guaranteed for future news. Sarcasm, unfamiliar entities, longer articles, double negation and mixed-company clauses remain difficult. This is a sentiment model: it does not retrieve news, verify claims, predict returns, or learn portfolio losses. News retrieval remains the feed pipeline; event mapping and impact scores retain their existing topic/rule logic. The topic classifier's separate metrics are unchanged.

For example, `Apple cannot avoid bankruptcy` can still receive a neutral class despite a negative directional score. Credit-event guardrails remain separate from learned sentiment; they do not repair the model's class prediction.

Actual model regressions cover bankruptcy variants, default, insolvency, profits, losses, neutral news and company-specific scoring. Credit denials, recovery and speculation are also checked against the downstream stress guardrails. These targeted cases are engineering checks, not an independent accuracy benchmark.

See [LICENSE.md](LICENSE.md) for model and training-data notices. Source code licensing does not override third-party terms.
