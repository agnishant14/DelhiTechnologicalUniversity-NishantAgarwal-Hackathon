# Submission data

## Demo input

[`demo.json`](demo.json) contains all 24 fictional scenarios used by the built-in demo: 17 news-style headlines and 7 social-style posts. The application loads this file directly through `server/demo.ts`.

| Field | Meaning |
| --- | --- |
| `id` | Stable scenario identifier |
| `text` | Fictional headline or post sent to the NLP engine |
| `sourceKind` | `news` or `social` |

These scenarios were created for this prototype with AI assistance. They are not historical news, actual social posts, or claims about the named companies. Company names represent a synthetic ten-stock index; no S&P Global or Crisil client data is used.

The demo assigns source names and simulation timestamps at runtime. The first 12 records seed the dashboard; subsequent replay steps process two records each. Model scores are computed at runtime rather than supplied as ground-truth labels. No dataset is used to train or fine-tune FinBERT in this project.

## Live sources

[`sources.json`](sources.json) lists each provider, source URL, coverage, access assumptions, and the pinned sentiment model. Live mode fetches fresh public titles independently of the synthetic demo. The social query currently focuses on NVIDIA.

Live responses are dynamic and are not needed to reproduce the default demo. Use **Export data** in the live workspace to capture the records and signals from a particular run. User-entered text, local databases, model caches, and arbitrary runtime exports are not automatically published to GitHub.

The MIT license covers the original synthetic scenarios. Live content and model weights retain their upstream terms and licenses.
