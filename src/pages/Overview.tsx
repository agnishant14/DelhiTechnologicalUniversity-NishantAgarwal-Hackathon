import { ArrowRight, Globe2, SlidersHorizontal } from "lucide-react";
import type { Dashboard, Ticker } from "../../shared/types";
import type { StressDashboard } from "../../shared/types";
import { money, signed, sentimentTone } from "../lib/api";
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
      <div className="page-heading">
        <div>
          <span className="eyebrow">NEWS → SIGNALS → PORTFOLIO</span>
          <h1>Risk overview</h1>
          <p>
            Follow financial news and explore its effect on your index and
            portfolio.
          </p>
        </div>
        <button className="button dark" onClick={openSandbox}>
          <SlidersHorizontal size={16} /> Try a what-if
        </button>
      </div>
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
              <span className="eyebrow">LATEST INTELLIGENCE</span>
              <h2>Recent signals</h2>
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
        </div>
      </div>
      <section className="panel heatmap-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">20 COMPANIES · ONE MOCK INDEX</span>
            <h2>Company sentiment</h2>
          </div>
          <span className="small muted">
            Select a company to follow its evidence
          </span>
        </div>
        <div className="stock-heatmap">
          {data.holdings.map((h) => (
            <button
              key={h.ticker}
              className={`heat-cell ${sentimentTone(h.sentiment)}`}
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
