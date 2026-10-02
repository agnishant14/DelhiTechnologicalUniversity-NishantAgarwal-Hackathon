# GoRisk — S&P Global & Crisil Campus Hackathon

**Candidate Name:** Nishant Agarwal\
**College Email ID:** Pending — add before submission\
**College / Campus:** Delhi Technological University\
**Demo Video Link:** Pending — record an unlisted YouTube walkthrough\
**Slide Deck Link:** Pending — presentation not created

## 1. Project Overview / Problem Statement & Approach

GoRisk turns public financial headlines into structured sentiment, event and severity signals. It connects one NLP engine to **both Module A (index rebalancing)** and **Module B (portfolio stress testing)**. Each signal retains its source, original text, model probabilities and reasoning.

The engine combines **FinBERT sentiment fine-tuned for this project** on Kaggle and Hugging Face data with a **trained topic classifier** for financial posts. The dashboard includes source status, company filters, allocation history, adjustable stress scenarios and model evaluation. A what-if tester previews headlines without saving portfolio changes.

Live feed responses are real public headlines. Portfolios and six optional demo scenarios are synthetic. This is a local research prototype; it does not execute trades or predict investment returns.

## 2. Architecture & Tech Stack

![GoRisk architecture](docs/architecture.png)

| Layer          | Technology                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| Interface      | React 19, TypeScript, Vite, Recharts                                          |
| API & storage  | Express 5, Zod, SQLite; separate Live and Demo workspaces                     |
| Sentiment      | Transformers.js, fine-tuned FinBERT (float16), local CPU inference              |
| Trained topics | TF-IDF + logistic regression; Python, NumPy, scikit-learn                     |
| Sources        | Google News RSS, Yahoo Finance RSS, Hacker News/Algolia; optional GDELT       |
| Checks         | Vitest, Supertest, Python/JavaScript model parity, actual FinBERT regressions |

### Risk engine

Signals include `sentiment` (−1 to +1), `event`, `impact` (1–10), companies, topic, timestamps, source and evidence. The API also exposes normalized `modelInput`, `analysisVersion`, company sentence scores and duplicate-story grouping.

- **Sentiment:** `P(positive) − P(negative)`. The label is the highest-probability class; a neutral label can still have a directional score. FinBERT reads the first 128 tokens. Clearly separated company sentences are scored independently. A temperature fitted on a separate calibration split adjusts confidence.
- **Headline formatting:** URLs are removed, spacing is normalized and missing terminal punctuation is added for inference, while original text is retained. Training and inference use the same preprocessing; bankruptcy sentiment is inferred by the model.
- **Topics:** the trained classifier predicts 20 topics. Scores below 0.45 flag the topic for review. Confidence is not calibrated.
- **Events:** mapped topics combine with explicit credit, geopolitical and operational cues. Topic accuracy does not measure event accuracy.
- **Impact:** a heuristic: `clamp(round(base + 2 × abs(sentiment) + severity − uncertainty), 1, 10)`. Bases are Credit 7, Geopolitical 6, Regulatory/Macro/M&A 5, Operational 4, Earnings/Product 3 and General 2. Severe cues add 2; uncertainty subtracts 1. Credit denials/recovery cap impact at 3; speculative credit events cap it at 7. These limited context rules can still fail on complex language.
- **Duplicates:** normalized exact matches skip inference. Similar coverage within six hours is grouped using companies, event, sentiment direction, numbers and token overlap. Repeated stories remain visible but do not cause another portfolio action.

The sentiment model adapts [`ProsusAI/finbert`](https://huggingface.co/ProsusAI/finbert), revision `4556d13015211d73dccd3fdd39d39232506f3e43`, using LoRA and a trained classification head. See the [model card, training commands and limitations](models/sentiment/README.md). The app checks the released weights against a pinned SHA-256 checksum, then caches them for offline use. If unavailable, it clearly labels its lower-quality lexicon fallback; confidence is null.

After an analysis-version change, a ready FinBERT engine rescores stored inputs once, preserving original text, sources and timestamps. Historical allocation snapshots and stress reports remain intact; recalculated weights receive a new snapshot. Rescoring does not replay old stress triggers. Older stress reports are labeled as historical.

### Module A — Tactical index

Twenty large-cap stocks start at **5% each**. This mock selection is not a claim about current official S&P 100 membership.

1. Use distinct company signals from the last 24 hours; exclude future publications.
2. Apply a six-hour evidence half-life. Social posts receive 60% of news weight.
3. Aggregate as `sum(sentiment × evidence_weight) / max(1, sum(evidence_weight))`.
4. Set raw targets to `0.05 × (1 + 0.8 × sentiment)`; normalize to 100%, with **2–15% per stock**.
5. Limit one-way turnover to **8% per update** and save material weight changes.

Positive sentiment raises the raw target; negative sentiment lowers it. Final weights also depend on other stocks, normalization and limits. Live refreshes fade old evidence. The chart shows allocation history, not returns. `pp` means percentage points.

### Module B — Strategic stress test

The [seven-asset book](data/portfolio.json) totals **$100m**: $40m loans, $30m bonds, $18m equities and $12m derivative mark-to-market value.

Fresh, distinct events with **impact > 7** trigger an adverse preset scaled by `impact / 10`. Each test starts from the same baseline; losses are not compounded. The studio also supports temporary equity, rate, credit-spread and FX shocks. What-if previews can explore a preset below the automatic threshold and label this distinction.

| Asset exposure | Simplified change in value                                            |
| -------------- | --------------------------------------------------------------------- |
| Loans / bonds  | `−value × duration × rate_bps / 10000`, plus the spread-duration term |
| Equities       | `value × beta × equity_change / 100`                                  |
| Rate swaps     | `signed_DV01 × rate_bps`                                              |
| FX forwards    | `FX_exposure × currency_change / 100`                                 |

Values and P&L are in USD millions; DV01 is USD millions per basis point. Asset contributions reconcile to total P&L. Linear approximations omit convexity, realized defaults, margin calls and nonlinear payoffs. Extreme shocks can produce unrealistic values.

## 3. Dataset Used

| Included data                                                  | Purpose                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `data/training/train.csv.gz`, `validation.csv.gz`, `SOURCE.md` | Original annotated corpus, provenance and checksums                 |
| `data/demo.json`                                               | Six fictional demo headlines; never used for training or evaluation |
| `data/portfolio.json`                                          | Seven synthetic assets and their exposures                          |
| `data/sources.json`                                            | Feed/model URLs, revisions, units and assumptions                   |
| `models/topic.json.gz`, `metrics.json`, `parity.json`          | Trained topic model, evaluation and inference fixtures              |
| `data/sentiment/` | Original Hugging Face sentiment CSVs, Kaggle PhraseBank archive, source notices and split checksums |
| `models/sentiment/` | Trained adapter, compressed tokenizer, evaluation, test predictions and release manifest |

The topic training corpus is [`zeroshot/twitter-financial-news-topic`](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic), revision `acbc8af2a35ccf0916124efcbe9e6cf25f191012`; its card declares MIT licensing. Compressed files preserve the original bytes. Raw training/validation sizes are 16,990/4,118; normalized deduplication and overlap removal leave **15,233/3,349**.

Sentiment training uses **10,895 human-annotated examples** from [Hugging Face financial-news sentiment](https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment) and [Kaggle Financial PhraseBank](https://www.kaggle.com/datasets/ankurzing/sentiment-analysis-for-financial-news). Separate development/calibration/final-test partitions contain **932/932/2,367** examples. Synthetic scenarios are never training inputs. PhraseBank is training-only because FinBERT already saw it during pretraining. See [source versions, licenses and split discipline](data/sentiment/SOURCE.md).

Live sources need no API keys. Google and Yahoo return up to 20 headlines each. Hacker News scans up to 100 recent community stories for company/financial terms; these are not X/Twitter posts. Optional GDELT uses observation time as a publication proxy. Coverage is partial; failed and empty sources remain visible.

**Export JSON** downloads active inputs, weights, stress results, assets and model metrics. Include that export in your submission data if your recording uses a particular live run. Local databases, model caches, dependencies and credentials are ignored by Git. No confidential client data is used; public content retains its owners' rights.

## 4. Quickstart & Installation

**Runtime:** Node.js 22.13+ and npm. Tested on macOS with Node 24; CI uses Ubuntu and Node 22. Python is needed only for model training and evaluation.

```sh
git clone https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon.git
cd DelhiTechnologicalUniversity-NishantAgarwal-Hackathon
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**; API port **3001**. The fine-tuned FinBERT weights download from the [model release](https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon/releases/tag/sentiment-v2.0.0) on first use (**209 MiB**). Later starts use the verified local cache. The trained topic model is bundled. Live feeds poll every five minutes; manual refresh has a one-minute cooldown. New workspaces start in Live news.

For a production build, run `npm run build` then `npm start`, and open **http://127.0.0.1:3001**. GitHub hosts the source, not the running API.

### Try the prototype

1. Fetch Live news and inspect a signal's source and explanation.
2. Select a company in Index lab to inspect its allocation and supporting headlines.
3. Adjust a slider in Stress studio and inspect before/after values and asset losses.
4. Open What-if and test `apple goes bankrupt`, a denial, or mixed-company news.
5. Switch to Demo to replay six fictional scenarios. Replay position persists.
6. Inspect Model lab; expand topic results or export the current workspace.

To create a fresh workspace while keeping existing data: `DATABASE_PATH=data/fresh-demo.sqlite npm run dev`.

### Train and verify

For **sentiment fine-tuning**, use Python 3.12, `requirements-sentiment.txt` and the [reproducible training instructions](models/sentiment/README.md#reproduce). The following commands train the separate **topic classifier**:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-training.txt
npm run train:model
npm test
npm run build
npm run test:model
```

On Windows, activate with `.venv\Scripts\activate`; use `python scripts/train-topic.py` if `python3` is unavailable. Training was tested with Python 3.14 on CPU. It requires no paid API or GPU.

Training chooses regularization from `C ∈ {1, 4}` using a stratified 20% split **inside training**, then fits all cleaned training rows. Publisher validation is held out until evaluation. Exports include metrics, a confusion matrix and Python fixtures checked against JavaScript inference. Near duplicates can remain; the evaluation is not time-forward.

`npm test` checks validation, attribution, negation, duplicates, allocation constraints, stress units, saved-signal migration, source failures, model-download integrity and workspace isolation. `npm run test:model` runs **14 actual fine-tuned FinBERT regression cases**, including bankruptcy variants and mixed-company sentiment. These are targeted examples, not a sentiment accuracy benchmark. GitHub Actions runs tests and the production build on pushes.

<details>
<summary>Configuration and API</summary>

Copy `.env.example` to `.env` if needed. Existing environment variables take precedence.

| Variable        | Default                  | Purpose                                   |
| --------------- | ------------------------ | ----------------------------------------- |
| `PORT` / `HOST` | `3001` / `127.0.0.1`     | Local API address                         |
| `DATABASE_PATH` | `data/signaldesk.sqlite` | Persistent local database                 |
| `NEWS_SOURCE`   | `rss`                    | `gdelt` adds an extra source              |
| `NLP_MODEL`     | `finbert`                | `lexicon` explicitly selects the fallback |

GET `/api/health`, `/api/dashboard`, `/api/signals`, `/api/model`, `/api/model/sentiment`, `/api/stress`, `/api/export` expose state and results. `/api/model` retains topic metrics; `/api/model/sentiment` returns the sentiment artifact manifest and its separate evaluation.

POST endpoints:

- `/api/analyze`: `text` (10–6000 characters); optional source kind/name, HTTP(S) source URL and ISO publication time. Saves the document.
- `/api/preview`: `text`; returns signal, index and stress preview without saving.
- `/api/stress/simulate`: `event`, optional integer `impact` (1–10), optional `shocks` with `equityPct`, `ratesBps`, `creditBps`, `fxPct`.
- `/api/refresh`, `/api/replay`: fetch live sources or replay the next two demo scenarios.
- `/api/mode`: `{"mode":"live"}` or `{"mode":"demo"}`.

One basis point is 0.01 percentage points. The local API is for one research workspace; it has no multi-user authentication.

</details>

## 5. Key Results & Domain Impact

Sentiment results on **2,367 held-out financial posts**, with identical preprocessing and argmax labels:

| Measured sentiment result | Base FinBERT | Fine-tuned release |
| --- | --- | --- |
| Accuracy | 69.16% | **83.69%** |
| Macro-F1 | 64.62% | **79.73%** |
| Negative precision | 44.97% | **68.46%** |
| Negative recall | 82.90% | 81.16% |
| Calibration error, 10 bins | 12.97% | **2.11%** |

False negative labels still occur: negative recall declined slightly even as precision and overall performance improved. The float16 release matches all float32 class predictions on this test set. All 14 fixed model regressions pass, including `apple goes bankrupt` (−0.723) and `apple files for bankruptcy` (−0.635). These examples were not training inputs. See [full sentiment results](models/sentiment/evaluation.json) and the [selection rationale](models/sentiment/README.md).

| Measured topic result                  | Value              |
| -------------------------------------- | ------------------ |
| Held-out accuracy                      | **81.73%**         |
| Macro-F1 across 20 topics              | **78.33%**         |
| Majority-class baseline accuracy       | **21.95%**         |
| Cleaned training / validation examples | **15,233 / 3,349** |

These metrics measure the **topic classifier only**. They do not measure FinBERT sentiment, event mapping, severity, market losses or trading performance. Full results are in [models/metrics.json](models/metrics.json).

GoRisk demonstrates a traceable route from news to constrained allocation changes and event-driven stress scenarios. Company attribution, repeated-story grouping and visible assumptions let an analyst inspect and challenge each step.

**Limitations:** historical English posts differ from current news. Sarcasm, ambiguous company names, complex negation and shared-company clauses can fail. Impact and stress are assumptions; there is no price training set, backtest or execution model.

AI assistance was used in development, training, documentation and synthetic scenarios. The sentiment model fine-tunes third-party FinBERT weights; both classifiers use third-party annotations. Original code and synthetic data use the [MIT license](LICENSE); upstream models and data retain their own terms, including PhraseBank's noncommercial restrictions. See [model/data notices](models/sentiment/LICENSE.md). **College email, presentation and demo video remain pending before submission.**
