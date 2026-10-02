# GoRisk — S&P Global & Crisil Campus Hackathon

**Candidate Name:** Nishant Agarwal  
**College Email ID:** Pending — add before submission  
**College / Campus:** Delhi Technological University  
**Demo Video Link:** Pending — record and upload an unlisted YouTube walkthrough  
**Slide Deck Link:** Pending — the presentation has not been created

## 1. Project Overview / Problem Statement & Approach

Financial news arrives faster than an analyst can read it. GoRisk collects public news and community headlines, identifies companies, and turns the text into source-linked sentiment, event categories and severity signals. The dashboard connects these signals to **both required downstream modules**: a tactical stock index and a strategic portfolio stress test.

The engine combines pretrained **FinBERT sentiment** with a **news topic model trained for this project** on publicly annotated financial posts. It distinguishes company-specific sentences, groups similar coverage, flags uncertain topics, and retains the evidence behind each output. The interface includes a live dashboard, index lab, stress studio, searchable signal feed and model evaluation lab. A what-if sandbox previews a hypothetical headline alongside existing evidence without changing saved data.

Portfolio holdings and shock assumptions are synthetic. Live headlines are real public feed responses; the six optional demo headlines are explicitly fictional. This prototype does not execute trades, forecast returns, provide agency credit ratings or claim regulatory certification.

## 2. Architecture & Tech Stack

![GoRisk architecture](docs/architecture.png)

| Layer                    | Implementation                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Interface                | React 19, TypeScript, Vite, Recharts, Lucide                                       |
| API                      | Express 5, validated with Zod                                                      |
| Sentiment                | Transformers.js, quantized FinBERT, local CPU inference                            |
| Trained topic classifier | TF-IDF unigrams/bigrams + multinomial logistic regression                          |
| Training                 | Python, NumPy, scikit-learn; reproducible script and pinned corpus                 |
| Persistence              | SQLite, with separate Live and Demo workspaces                                     |
| Collection               | Google News RSS, Yahoo Finance RSS, Hacker News/Algolia; optional GDELT            |
| Verification             | Vitest, Supertest, Python/JavaScript inference parity, actual FinBERT smoke checks |

### Engine output and model boundaries

Every signal includes `sentiment` (−1 to +1), `event`, `impact` (1–10), company tickers, source URL, original text and timestamps. Additional fields expose the learned topic, competing probabilities, review flag, informative topic features, company sentence scores and duplicate-story grouping.

- **Sentiment:** `P(positive) − P(negative)`. Labels are positive above +0.15, negative below −0.15, otherwise neutral. FinBERT reads the first 512 tokens. Clearly separated company sentences are scored independently; shared clauses retain the headline score. Alias matching can still be ambiguous.
- **Topics:** the trained model predicts 20 original dataset topics. Probabilities below 0.45 are flagged for review. Softmax scores are not calibrated probabilities of correctness.
- **Events:** confident topics map to relevant events, with explicit credit, geopolitical and operational cues taking priority. For example, the dataset's Financials and Earnings topics map to Earnings. Ambiguous company/product news does not automatically mean a product launch. Unmapped topics use explicit cues or General. Topic accuracy does not measure this mapping's accuracy.
- **Impact:** a documented heuristic, not a trained market-loss predictor: `clamp(round(base + 2 × abs(sentiment) + severity − uncertainty), 1, 10)`. Bases: Credit 7; Geopolitical 6; Regulatory/Macro/M&A 5; Operational 4; Earnings/Product 3; General 2. Severe cues add 2; uncertainty cues subtract 1. Evidence shows the calculation. Negation, multiple events and context can defeat these rules.
- **Novelty:** normalized exact matches skip inference. Similar headlines within six hours with matching companies, event, sentiment direction and numerical facts are grouped using token overlap. Publisher suffixes are ignored. Repeated coverage remains visible but is excluded from another portfolio action. This conservative rule can miss paraphrases.

FinBERT is pinned to [`Xenova/finbert`](https://huggingface.co/Xenova/finbert) revision `8f269abebfdd9009d7d9b5e96af7e5c6bfe50b20`, based on [`ProsusAI/finbert`](https://huggingface.co/ProsusAI/finbert). A clearly labeled lexicon fallback is used if loading fails; its confidence is null.

### Module A — Tactical index

Twenty named large-cap stocks start at **5% each**. This is a mock selection, not a claim about today's official S&P 100 membership.

1. Use distinct company signals within the last 24 hours; exclude future publications.
2. Weight evidence by a six-hour half-life; social posts receive a 0.6 multiplier.
3. Aggregate sentiment as `sum(score × evidence_weight) / max(1, sum(evidence_weight))`. This also fades thin, old evidence toward zero.
4. Set raw targets to `0.05 × (1 + 0.8 × sentiment)` and project onto a portfolio totaling 100%, with **2–15% per stock**.
5. Interpolate from previous weights to limit **one-way turnover to 8% per update**.
6. Save material weight changes. Empty live refreshes can also reduce stale evidence. Old snapshots with an incompatible stock universe are reset to equal weights.

Positive sentiment raises the raw target and negative sentiment lowers it. Normalization, bounds, other companies and prior holdings affect final weights. The chart displays allocation history, not investment performance. `pp` means percentage points.

### Module B — Strategic stress testing

The seven assets in [`data/portfolio.json`](data/portfolio.json) total **$100m**: $40m loans, $30m bonds, $18m equities and $12m derivative mark-to-market value. Exposures are intentionally explicit rather than inferred from sentiment.

Fresh, distinct events with **impact > 7** automatically trigger and persist an adverse scenario. Shocks are selected by event type and scaled by `impact / 10`. Each test starts from the same baseline; successive events are not compounded. Tests do not require negative sentiment because a high-impact event can justify exploring an adverse scenario regardless of headline tone.

The stress studio also accepts custom equity, interest-rate, credit-spread and FX shocks:

- Loans/bonds: `−value × duration × rate_change / 10000`, plus an analogous spread-duration term.
- Equities: `value × beta × equity_change / 100`.
- Rate swaps: `signed_DV01 × rate_change_in_bps`.
- FX forwards: `foreign_currency_exposure × FX_change / 100`.

Values, exposures and P&L are in USD millions; DV01 is USD millions per basis point. Contributions reconcile to total P&L. The UI shows before/after values, asset drivers and saved triggering headlines. Linear approximations omit convexity, realized defaults, margin calls and nonlinear derivative payoffs; extreme shocks can produce unrealistic values.

## 3. Dataset Used

| Data                             | Included files                                                 | Purpose                                                      |
| -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Public annotated financial posts | `data/training/train.csv.gz`, `validation.csv.gz`, `SOURCE.md` | Train and evaluate the topic classifier                      |
| Six fictional scenarios          | `data/demo.json`                                               | Small offline demonstration, never model training/evaluation |
| Seven synthetic asset records    | `data/portfolio.json`                                          | Reproducible wholesale stress book                           |
| Source and model provenance      | `data/sources.json`                                            | URLs, revisions, data units and assumptions                  |
| Learned model and evaluation     | `models/topic.json.gz`, `metrics.json`, `parity.json`          | Runtime inference, measured results and parity fixtures      |

The training corpus is [`zeroshot/twitter-financial-news-topic`](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic), pinned to revision `acbc8af2a35ccf0916124efcbe9e6cf25f191012`. Its card declares MIT licensing. Compressed CSVs preserve the original bytes after decompression. The raw files contain 16,990 training and 4,118 validation examples. After normalized exact deduplication and overlap removal, this run used **15,233 training** and **3,349 validation** examples. Checksums and removal counts are recorded in the metrics file.

Live sources require no API keys. Google and Yahoo provide headline text; Hacker News provides community-submitted story titles, not X/Twitter posts. The HN adapter scans up to 100 stories from the last day for supported companies or financial terms. Google and Yahoo each return up to 20 headlines. GDELT is optional and uses observation time as a publication proxy. Source failures and empty responses remain visible. Feed coverage is partial and uneven.

Live responses are persisted locally and downloadable with **Export JSON**, including the active inputs, weights, stress history, asset book and model metrics. Save that export with the submission if a recorded demo uses a particular live run. Runtime databases, model caches and credentials are excluded from Git. Public feed content and company logos retain their owners' rights; no confidential client data is used.

## 4. Quickstart & Installation

**Runtime:** Node.js 22.13+ and npm. Application and real-model checks tested on macOS with Node 24. CI uses Ubuntu and Node 22. Python is only needed to retrain the topic model.

```sh
git clone https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon.git
cd DelhiTechnologicalUniversity-NishantAgarwal-Hackathon
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port **3001**. If 5173 is occupied, use the Vite URL printed in the terminal.

New workspaces start in **Live news**. FinBERT downloads on first use and is cached locally; allow time for the first download. The trained topic model is already bundled. Feed polling starts once the engine is ready, then repeats every five minutes. Manual refresh has a one-minute cooldown. This is near-real-time polling, not exchange-grade high-frequency infrastructure.

For a production build served by one local process:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. The site is local; GitHub hosts source code, not the running API.

### Demo walkthrough

1. Open Live news and fetch sources. Inspect provider status and an original source link in Signals.
2. Open **Index lab**. Select a company or sector; inspect weight history and the headlines behind its allocation.
3. Open **Stress studio**. Choose an event, adjust the four shocks and inspect each asset's P&L.
4. Open **Try a what-if**. Use the mixed-company example to see separate Apple/Tesla sentiment. The preview leaves stored signals, weights and stress history unchanged.
5. Switch to **Demo** for six fictional scenarios. The first two load on first selection; **Replay next events** processes two more. The credit-crisis scenario creates an automatic saved stress test.
6. Open **Model lab** for measured validation results and per-topic weaknesses. Export JSON for a reproducible run record.

Replay position persists and stops at the final scenario. To start a separate fresh workspace without deleting old data, use `DATABASE_PATH=data/fresh-demo.sqlite npm run dev`. Existing databases may contain records from earlier versions; those remain intact.

### Retrain the topic model

Training was tested with Python 3.14 on CPU. It does not need a GPU, paid API or runtime connection to Hugging Face; the pinned training files are included.

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-training.txt
npm run train:model
npm test
```

On Windows, activate with `.venv\Scripts\activate` and run `python scripts/train-topic.py` if `python3` is unavailable.

The script removes exact normalized duplicates, removes validation/train overlap, selects `C` from 1 and 4 on a stratified 20% split **inside training**, then fits the selected model on all cleaned training data. The publisher's validation set is held out until evaluation. It exports the model, metrics, confusion matrix and Python inference fixtures. JavaScript tests compare the exported predictions to Python. Near duplicates can remain, and the publisher split is not a time-forward evaluation.

### Configuration

Copy `.env.example` to `.env` if needed. Existing environment variables take precedence.

| Variable        | Default                  | Purpose                                                 |
| --------------- | ------------------------ | ------------------------------------------------------- |
| `PORT`          | `3001`                   | API port; Vite's default proxy expects 3001             |
| `HOST`          | `127.0.0.1`              | Local bind address                                      |
| `DATABASE_PATH` | `data/signaldesk.sqlite` | Local SQLite file; retained for compatibility           |
| `NEWS_SOURCE`   | `rss`                    | `gdelt` adds GDELT alongside the default sources        |
| `NLP_MODEL`     | `finbert`                | `lexicon` explicitly opts into the lightweight fallback |

### API

| Method | Route                  | Result                                             |
| ------ | ---------------------- | -------------------------------------------------- |
| GET    | `/api/health`          | Engine availability                                |
| GET    | `/api/dashboard`       | Active signals, holdings, history, sources         |
| GET    | `/api/signals`         | Machine-readable signals                           |
| GET    | `/api/model`           | Measured topic-model evaluation                    |
| GET    | `/api/stress`          | Asset book, presets and saved automatic tests      |
| GET    | `/api/export`          | Active workspace and stress/model evidence as JSON |
| POST   | `/api/analyze`         | Analyze and persist a document                     |
| POST   | `/api/preview`         | Hypothetical headline; no saved mutations          |
| POST   | `/api/stress/simulate` | Validated custom/preset stress scenario            |
| POST   | `/api/refresh`         | Collect live sources                               |
| POST   | `/api/replay`          | Next two demo events                               |
| POST   | `/api/mode`            | `{"mode":"live"}` or `{"mode":"demo"}`             |

`/analyze` requires `text` (10–6000 characters). Optional fields: `sourceKind`, `sourceName`, HTTP(S) `sourceUrl`, ISO `publishedAt`. It defaults to manual input and current time. `/preview` accepts only `text`. `/stress/simulate` accepts `event`, optional integer `impact` (1–10), and optional `shocks` with `equityPct`, `ratesBps`, `creditBps`, `fxPct`. One basis point is 0.01 percentage points.

### Verification

```sh
npm test
npm run build
npm run test:model
```

The tests cover input validation, entity attribution, model parity, duplicate handling, stale/future evidence, weight constraints, legacy weight repair, stress units, persisted triggers, source failures, workspace isolation and read-only previews. The actual FinBERT smoke check uses three synthetic examples; it is not an accuracy benchmark. GitHub Actions runs tests and the production build for each push.

## 5. Key Results & Domain Impact

| Measured topic-classification result          | Value              |
| --------------------------------------------- | ------------------ |
| Held-out accuracy                             | **81.73%**         |
| Macro-F1 across 20 topics                     | **78.33%**         |
| Majority-class baseline accuracy              | **21.95%**         |
| Training / validation examples after cleaning | **15,233 / 3,349** |

These metrics apply only to the trained topic classifier on the included publisher validation split. They do not measure FinBERT sentiment accuracy, event mapping, severity accuracy, future market losses or trading performance. Full class-level results and evaluation limitations are in [`models/metrics.json`](models/metrics.json).

The prototype demonstrates a traceable path from public text to constrained index changes and event-driven stress scenarios. Company sentence attribution, visible topic uncertainty, repeated-story grouping and an inspectable valuation model help an analyst challenge the output instead of treating a single score as a decision.

### Limitations and submission status

Historical English financial posts differ from current news. Near duplicates, ambiguous entity names, sarcasm, negation and shared-company clauses can produce errors. Impact and stress assumptions are heuristic. There is no price/return training set, backtest, execution model, authentication or multi-user isolation. The local API is intended for one research workspace.

AI assistance was used in development, documentation and synthetic scenario creation. The topic model was trained by this project's script using third-party annotations; FinBERT remains a third-party pretrained model. The candidate should review and be ready to explain both.

Original implementation and synthetic data use the [MIT license](LICENSE). Upstream models, public data and third-party assets retain their own terms. The repository includes the code, trained topic model, datasets, architecture and run instructions. **College email, presentation and demo video are still pending** before final submission.
