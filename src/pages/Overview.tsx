import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BrainCircuit,
  Globe2,
  Layers3,
  Sparkles,
} from "lucide-react";
import type { Dashboard, Ticker } from "../../shared/types";
import type { StressDashboard } from "../../shared/types";
import { money, signed, tone } from "../lib/api";
import { SignalCard } from "../components/SignalCard";

export function Overview({
  data,
  stress,
  navigate,
  openSandbox,
  selectTicker,
}: {
  data: Dashboard;
  stress?: StressDashboard;
  navigate: (page: string) => void;
  openSandbox: () => void;
  selectTicker: (ticker: Ticker) => void;
}) {
  const fresh = data.signals.filter(
    (s) => Date.now() - Date.parse(s.publishedAt) <= 86400000 && !s.duplicateOf,
  );
  const active = data.sources.filter((s) => s.status === "ok").length;
  const tilt = data.holdings.filter(
    (h) => Math.abs(h.weight - 0.05) > 0.001,
  ).length;
  const latestStress = stress?.history[0];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i className="status-dot" /> YOUR NEWS-TO-RISK WORKSPACE
          </span>
          <h1>
            Read the news.
            <br />
            <span>See the ripple.</span>
          </h1>
          <p>
            Turn market noise into a clearer picture. Follow the evidence,
            explore your index, and put your portfolio to the test.
          </p>
          <button className="button dark" onClick={openSandbox}>
            <Sparkles size={17} /> Try a what-if <ArrowUpRight size={17} />
          </button>
          <span className="hero-caption">
            One headline. Two ways to understand the impact.
          </span>
        </div>
        <div
          className="pipeline-art"
          aria-label="News and community posts flow through two language models to an index and a stress test"
        >
          <svg viewBox="0 0 510 300" aria-hidden="true">
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="18"
                height="18"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="#d8dbcc" />
              </pattern>
            </defs>
            <rect width="510" height="300" fill="url(#dots)" />
            <path
              d="M105 92 C170 92 163 150 240 150 M105 213 C170 213 163 150 240 150 M282 150 C347 150 335 92 402 92 M282 150 C347 150 335 213 402 213"
              fill="none"
              stroke="#b4bca4"
              strokeWidth="2"
              strokeDasharray="4 5"
              className="flow-path"
            />
            <circle cx="257" cy="150" r="79" fill="none" stroke="#dbe2c2" />
            <circle cx="257" cy="150" r="63" fill="none" stroke="#cad6aa" />
          </svg>
          <div className="pipeline-node source-one">
            <Globe2 size={20} />
            <span>News feeds</span>
          </div>
          <div className="pipeline-node source-two">
            <AudioLines size={20} />
            <span>Community</span>
          </div>
          <div className="pipeline-core">
            <BrainCircuit size={32} />
            <b>GoRisk</b>
            <small>2 NLP models</small>
          </div>
          <button
            className="pipeline-node target-one"
            onClick={() => navigate("index")}
          >
            <Layers3 size={20} />
            <span>Index lab</span>
            <ArrowUpRight size={13} />
          </button>
          <button
            className="pipeline-node target-two"
            onClick={() => navigate("stress")}
          >
            <Sparkles size={20} />
            <span>Stress studio</span>
            <ArrowUpRight size={13} />
          </button>
          <span className="art-caption">COLLECT → UNDERSTAND → EXPLORE</span>
        </div>
      </section>
      <section className="metrics-grid">
        <div className="metric">
          <span>Fresh, distinct signals</span>
          <strong>
            {fresh.length}
            <small>/ 24h</small>
          </strong>
          <p>
            {data.signals.filter((s) => s.duplicateOf).length} repeated stories
            grouped
          </p>
        </div>
        <div className="metric">
          <span>Index positions tilted</span>
          <strong>
            {tilt}
            <small>/ 20</small>
          </strong>
          <p>Against a 5% equal-weight start</p>
        </div>
        <div className="metric">
          <span>High-impact events</span>
          <strong>
            {fresh.filter((s) => s.impact > 7).length}
            <small>flagged</small>
          </strong>
          <p>Severity above 7 triggers Module B</p>
        </div>
        <div className="metric accent">
          <span>Latest stress scenario</span>
          <strong>{latestStress ? money(latestStress.pnl) : "—"}</strong>
          <p>
            {latestStress
              ? `${latestStress.event} · hypothetical P&L`
              : "Waiting for a high-impact event"}
          </p>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">THE SIGNAL, BEHIND THE HEADLINE</span>
              <h2>On the radar</h2>
            </div>
            <button className="text-button" onClick={() => navigate("signals")}>
              All signals <ArrowRight size={16} />
            </button>
          </div>
          {data.signals.length ? (
            data.signals
              .slice(0, 3)
              .map((s) => <SignalCard key={s.id} signal={s} compact />)
          ) : (
            <div className="empty">
              <Globe2 size={32} />
              <h3>
                {data.busy
                  ? "Reading the latest headlines…"
                  : "Your radar is ready"}
              </h3>
              <p>
                Fetch live sources above, or switch to Demo for six short
                scenarios.
              </p>
            </div>
          )}
        </section>
        <div className="stack">
          <section className="panel source-panel">
            <div className="section-title">
              <h2>Source check</h2>
              <span className="tag">
                {active}/{data.sources.length} connected
              </span>
            </div>
            {data.sources.map((s) => (
              <div className="source-row" key={s.name}>
                <i className={`status-dot ${s.status}`} />
                <div>
                  <b>{s.name}</b>
                  <small>
                    {s.error ??
                      (s.status === "idle"
                        ? "Ready to fetch"
                        : `${s.fetched} records in last fetch`)}
                  </small>
                </div>
                <span className="tag">{s.kind}</span>
              </div>
            ))}
            <p className="small muted">
              Feeds refresh every 5 minutes in Live mode. Empty and failed feeds
              stay visible.
            </p>
          </section>
          <section className="panel mint">
            <span className="eyebrow">BUILT TO BE QUESTIONED</span>
            <h2>A model you can inspect.</h2>
            <p>
              See the validation results, competing topics, and the words behind
              each topic prediction.
            </p>
            <button className="text-button" onClick={() => navigate("model")}>
              Open the model lab <ArrowUpRight size={16} />
            </button>
          </section>
        </div>
      </div>
      <section className="panel heatmap-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">20 COMPANIES · ONE MOCK INDEX</span>
            <h2>The sentiment landscape</h2>
          </div>
          <span className="small muted">
            Select a company to follow its evidence
          </span>
        </div>
        <div className="stock-heatmap">
          {data.holdings.map((h) => (
            <button
              key={h.ticker}
              className={`heat-cell ${tone(h.sentiment)}`}
              onClick={() => selectTicker(h.ticker)}
              title={`${h.name}: ${h.signalCount} eligible signals`}
            >
              <b>{h.ticker}</b>
              <span>{h.signalCount ? signed(h.sentiment) : "No signal"}</span>
              <div className="heat-bar">
                <i
                  style={{
                    width: `${Math.max(3, Math.abs(h.sentiment) * 100)}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
