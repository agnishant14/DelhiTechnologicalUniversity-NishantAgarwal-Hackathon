import { useEffect, useState } from "react";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import type modelMetrics from "../../models/metrics.json";
import { api, percent } from "../lib/api";

export function ModelLab({ openSandbox }: { openSandbox: () => void }) {
  const [metrics, setMetrics] = useState<typeof modelMetrics>();
  const [error, setError] = useState("");
  const [sort, setSort] = useState("Weakest first");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<typeof modelMetrics>("model", undefined, controller.signal)
      .then(setMetrics)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  if (!metrics)
    return (
      <div className="empty" role="status">
        {error || "Loading measured model results…"}
      </div>
    );
  const classes = [...metrics.perClass].sort((a, b) =>
    sort === "Weakest first"
      ? a["f1-score"] - b["f1-score"]
      : b["f1-score"] - a["f1-score"],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">NLP MODELS · VALIDATION</span>
          <h1>Model evaluation</h1>
          <p>
            Inspect measured topic results and test financial sentiment on your
            own headlines.
          </p>
        </div>
        <button className="button dark" onClick={openSandbox}>
          <FlaskConical size={17} /> Test a headline
        </button>
      </div>
      <div className="metrics-grid">
        <div className="metric accent">
          <span>Topic accuracy</span>
          <strong>{percent(metrics.accuracy)}</strong>
          <p>Held-out publisher validation split</p>
        </div>
        <div className="metric">
          <span>Macro-F1</span>
          <strong>{percent(metrics.macroF1)}</strong>
          <p>Equal importance to each of 20 topics</p>
        </div>
        <div className="metric">
          <span>Training examples</span>
          <strong>{metrics.trainCount.toLocaleString()}</strong>
          <p>Real annotated financial posts</p>
        </div>
        <div className="metric">
          <span>Validation examples</span>
          <strong>{metrics.validationCount.toLocaleString()}</strong>
          <p>Excluded from training and tuning</p>
        </div>
      </div>
      <div className="model-grid">
        <section className="panel">
          <div className="section-title">
            <h2>From words to topics</h2>
          </div>
          <span className="tag positive">Trained for this project</span>
          <h3>TF-IDF + logistic regression</h3>
          <p>
            A compact supervised model learns{" "}
            {metrics.features.toLocaleString()} word and phrase features from
            the financial-news topic dataset.
          </p>
          <div className="benchmark">
            <div>
              <span>Trained model</span>
              <b>{percent(metrics.accuracy)}</b>
            </div>
            <i style={{ width: percent(metrics.accuracy) }} />
            <div>
              <span>Always predict the majority class</span>
              <b>{percent(metrics.majorityAccuracy)}</b>
            </div>
            <i
              className="baseline"
              style={{ width: percent(metrics.majorityAccuracy) }}
            />
          </div>
          <p className="small muted">
            Same held-out examples for both. This is topic accuracy, not
            sentiment accuracy or investment performance.
          </p>
          <a
            className="text-link"
            href="https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic"
            target="_blank"
            rel="noreferrer"
          >
            Inspect the annotated dataset <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>From tone to sentiment</h2>
            <span className="tag">Pretrained</span>
          </div>
          <h3>FinBERT · financial language</h3>
          <p>
            FinBERT scores positive, negative and neutral financial tone. The
            engine uses P(positive) − P(negative), on a scale from −1 to +1.
          </p>
          <p>
            Short headlines receive a final period before inference. Company
            sentences are scored separately when possible. The original text and
            model probabilities remain visible in each signal.
          </p>
          <p className="small muted">
            FinBERT was not trained here. The topic model's reported metrics do
            not apply to FinBERT. Mixed-company clauses and sarcasm remain
            difficult.
          </p>
          <a
            className="text-link"
            href="https://huggingface.co/ProsusAI/finbert"
            target="_blank"
            rel="noreferrer"
          >
            Read the FinBERT model card <ArrowUpRight size={15} />
          </a>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">
                WHERE IT WORKS · WHERE IT STRUGGLES
              </span>
              <h2>Results by topic</h2>
            </div>
            <select
              aria-label="Sort model topics"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option>Weakest first</option>
              <option>Strongest first</option>
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>F1</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? classes : classes.slice(0, 6)).map((row) => (
                  <tr key={row.label}>
                    <td>
                      <b>{row.label}</b>
                    </td>
                    <td>
                      <div className="model-score">
                        <div className="model-score-track">
                          <i
                            style={{
                              width: percent(row["f1-score"]),
                              background:
                                row["f1-score"] >= 0.75
                                  ? "#10b981"
                                  : row["f1-score"] >= 0.5
                                    ? "#2563eb"
                                    : "#f59e0b",
                            }}
                          />
                        </div>
                        <span>{percent(row["f1-score"])}</span>
                      </div>
                    </td>
                    <td>{percent(row.precision)}</td>
                    <td>{percent(row.recall)}</td>
                    <td>{row.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="text-button show-more"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
          >
            {showAll
              ? "Show fewer topics"
              : `Show all ${classes.length} topics`}
          </button>
        </section>
        <aside className="stack">
          <section className="panel subtle">
            <span className="eyebrow">REVIEW THRESHOLD</span>
            <h2>When to review</h2>
            <p>
              Topic confidence below {percent(metrics.reviewThreshold, 0)} is
              flagged for review. Explicit event cues can still supply an event
              label.
            </p>
            <div className="policy-line">
              <b>{percent(metrics.coverageAtThreshold)}</b>
              <span>Validation coverage above threshold</span>
            </div>
            <div className="policy-line">
              <b>{percent(metrics.accuracyAtThreshold)}</b>
              <span>Topic accuracy on that subset</span>
            </div>
            <p className="small">
              Softmax confidence is not calibrated. The threshold is a policy
              choice.
            </p>
          </section>
          <details className="panel disclosure">
            <summary>Training & evaluation method</summary>
            <ul className="evidence">
              <li>
                Removed {metrics.removedTrainDuplicates.toLocaleString()}{" "}
                normalized duplicate training rows.
              </li>
              <li>
                Removed{" "}
                {metrics.removedValidationDuplicatesOrOverlap.toLocaleString()}{" "}
                duplicate or overlapping validation rows.
              </li>
              <li>
                Chose regularization using only a stratified split within
                training, with seed {metrics.seed}.
              </li>
              <li>
                Exported model output is checked against Python predictions.
              </li>
            </ul>
            <p className="small muted">{metrics.version}</p>
          </details>
        </aside>
      </div>
      <details className="panel disclosure">
        <summary>Model limitations & financial assumptions</summary>
        <ul className="evidence">
          {metrics.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>
            Event categories combine learned topics and explicit rules. Severity
            and stress shocks are policy assumptions; they are not learned
            market-loss predictions.
          </li>
        </ul>
      </details>
    </>
  );
}
