import {
  ArrowUpRight,
  ChevronDown,
  MessageSquare,
  Newspaper,
} from "lucide-react";
import type { Signal } from "../../shared/types";
import { ago, percent, signed, tone } from "../lib/api";
import { StockLogo } from "../StockLogo";

export function SignalCard({
  signal,
  compact = false,
}: {
  signal: Signal;
  compact?: boolean;
}) {
  return (
    <article className={`signal-card ${compact ? "compact" : ""}`}>
      <div className="row between">
        <div className="row muted small">
          {signal.sourceKind === "social" ? (
            <MessageSquare size={14} />
          ) : (
            <Newspaper size={14} />
          )}
          <span>{signal.sourceName}</span>
          <span>·</span>
          <time title={new Date(signal.publishedAt).toLocaleString()}>
            {ago(signal.publishedAt)}
          </time>
        </div>
        <span
          className={`impact ${signal.impact > 7 ? "high" : ""}`}
          aria-label={`Impact ${signal.impact} out of 10`}
        >
          <span className="impact-label">Impact</span>
          <b>{signal.impact}</b>
          <small>/10</small>
        </span>
      </div>
      <h3>{signal.text}</h3>
      <div className="row wrap signal-tags">
        <span className={`tag ${signal.sentimentLabel}`}>
          <span className="sentiment-label">{signal.sentimentLabel}</span> ·{" "}
          {signed(signal.sentiment, 3)}
        </span>
        <span className="tag">{signal.event}</span>
        {signal.creditContext && signal.creditContext !== "reported" && (
          <span className="tag">{signal.creditContext}</span>
        )}
        {signal.tickers.map((ticker) => (
          <span
            className="ticker-tag"
            key={ticker}
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <StockLogo ticker={ticker} size={15} />
            {ticker}
          </span>
        ))}
        {signal.isSample && (
          <span className="tag amber">Fictional scenario</span>
        )}
        {signal.duplicateOf && <span className="tag">Repeated coverage</span>}
        {signal.topic?.needsReview && (
          <span className="tag amber">Topic needs review</span>
        )}
      </div>
      {!compact && (
        <details className="signal-details">
          <summary>
            Why this signal? <ChevronDown size={14} />
          </summary>
          <div className="explanation-grid">
            <div>
              <span className="eyebrow">Sentiment · {signal.model}</span>
              {signal.probabilities ? (
                Object.entries(signal.probabilities).map(
                  ([label, probability]) => (
                    <div className="probability" key={label}>
                      <span>{label}</span>
                      <div>
                        <i style={{ width: percent(probability) }} />
                      </div>
                      <b>{percent(probability)}</b>
                    </div>
                  ),
                )
              ) : (
                <p>
                  Word-lexicon fallback is active. No model probabilities are
                  available.
                </p>
              )}
              <p className="small muted">
                Sentiment = P(positive) − P(negative). Confidence scores are not
                calibrated.
              </p>
            </div>
            <div>
              <span className="eyebrow">
                Learned topic ·{" "}
                {signal.topic
                  ? percent(signal.topic.confidence)
                  : "legacy signal"}
              </span>
              <h4>
                {signal.topic?.label ??
                  "Analyze a new headline to use the trained model"}
              </h4>
              <div className="row wrap">
                {signal.topic?.terms.map((term) => (
                  <span
                    className="term"
                    key={term.term}
                    title={`Contribution against runner-up: ${term.contribution.toFixed(3)}`}
                  >
                    {term.term}
                  </span>
                ))}
              </div>
              <p className="small muted">
                Terms support the topic over its runner-up. They do not explain
                FinBERT sentiment.
              </p>
            </div>
          </div>
          {signal.companySentiments && signal.companySentiments.length > 1 && (
            <div className="company-scores">
              {signal.companySentiments.map((c) => (
                <div key={c.ticker} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StockLogo ticker={c.ticker} size={18} />
                  <div>
                    <b>
                      {c.ticker}{" "}
                      <span className={tone(c.sentiment)}>
                        {signed(c.sentiment)}
                      </span>
                    </b>
                    <span className="small muted">
                      {" "}· {c.scope} · {c.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {signal.modelInput && signal.modelInput !== signal.text && (
            <p className="model-input">
              <b>Model input:</b> {signal.modelInput}
            </p>
          )}
          <ul className="evidence">
            {signal.evidence.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {signal.sourceUrl && (
            <a
              className="text-link"
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open original source <ArrowUpRight size={15} />
            </a>
          )}
        </details>
      )}
    </article>
  );
}
