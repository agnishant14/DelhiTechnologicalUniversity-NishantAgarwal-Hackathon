# Sentiment training data

Only the files listed here are training inputs. Example prompts and application history are not training data.

| Source | Included file | Revision / version | Use |
| --- | --- | --- | --- |
| [Hugging Face: zeroshot/twitter-financial-news-sentiment](https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment) | `sent_train.csv.gz`, `sent_valid.csv.gz` | `ccbe24de388e287beb92dd393a335c376b350ac3` | Training, development, calibration and final evaluation |
| [Kaggle: ankurzing/sentiment-analysis-for-financial-news](https://www.kaggle.com/datasets/ankurzing/sentiment-analysis-for-financial-news) | `phrasebank-kaggle-v5.zip` | Version 5, 2020-05-27 | Financial PhraseBank training rehearsal, using its 75% agreement subset |

The Hugging Face card declares MIT licensing. The CSVs contain 9,543 training and 2,388 validation rows; counts in its prose differ. Compressed files preserve the downloaded CSV bytes after decompression. Original labels map Bearish → negative, Bullish → positive, Neutral → neutral.

The unmodified Kaggle archive includes the original Financial PhraseBank README and license. Kaggle metadata lists CC BY-NC-SA 4.0; the archive's authors specify **CC BY-NC-SA 3.0** and academic/noncommercial use. Preserve both notices; do not assume this data is covered by the repository's MIT code license. Attribution: Malo, P., Sinha, A., Korhonen, P., Wallenius, J., & Takala, P. (2014), *Good debt or bad debt: Detecting semantic orientations in economic texts*, JASIST 65(4), 782–796.

## Split discipline

`scripts/prepare_sentiment.py` removes URL/case/punctuation variants and conflicting exact labels. It groups near duplicates with word-trigram Jaccard similarity ≥0.8. This is conservative but cannot catch all paraphrases.

The publisher's validation set is reserved for the final test. Related training rows are excluded. Remaining financial-news training groups are split into eight folds for training, one for development and one for calibration, using seed 42. No story group crosses splits. PhraseBank is training-only and excluded where its groups overlap a held-out partition.

FinBERT already used Financial PhraseBank in its original training. Its 50% agreement corpus is also used to exclude exact known examples from the final test. PhraseBank is **not an independent benchmark**. The final test evaluates historical financial posts, not future news, all languages or investment performance. Prior pretraining overlap cannot be ruled out completely.

`splits.json` records actual counts, source checksums, split fingerprints and removal counts. Prepared records and training checkpoints live in the ignored local cache.
