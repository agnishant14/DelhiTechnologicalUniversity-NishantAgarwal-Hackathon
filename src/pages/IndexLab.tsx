import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dashboard, QuotesPayload, Ticker } from "../../shared/types";
import { percent, signed, tone, sentimentTone } from "../lib/api";
import { SignalCard } from "../components/SignalCard";
import { StockLogo } from "../StockLogo";

export function IndexLab({
  data,
  quotes,
}: {
  data: Dashboard;
  quotes?: QuotesPayload;
}) {
  const [selected, setSelected] = useState<Ticker>("AAPL");
  const [sector, setSector] = useState("All sectors");
  const history = useMemo(
    () =>
      data.history.map((s, i) => ({
        ...s.weights,
        step: i,
        timestamp: new Date(s.timestamp).toLocaleTimeString(),
      })),
    [data.history],
  );
  const holding = data.holdings.find((h) => h.ticker === selected)!;
  const evidence = data.signals.filter(
    (s) =>
      s.tickers.includes(selected) &&
      !s.duplicateOf &&
      Date.now() - Date.parse(s.publishedAt) <= 86400000,
  );
  const latest = data.history.at(-1);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MODULE A · TACTICAL INDEX REBALANCING</span>
          <h1>Index rebalancing</h1>
          <p>
            A 20-stock mock index that responds to company sentiment, with clear
            allocation limits.
          </p>
        </div>
      </div>
      <div className="metrics-grid three">
        <div className="metric">
          <span>Allocated</span>
          <strong>
            {percent(
              data.holdings.reduce((s, h) => s + h.weight, 0),
              2,
            )}
          </strong>
          <p>Long-only · fully invested</p>
        </div>
        <div className="metric">
          <span>Latest one-way turnover</span>
          <strong>{percent(latest?.turnover ?? 0, 2)}</strong>
          <p>8% maximum per update</p>
        </div>
        <div className="metric accent">
          <span>Saved weight snapshots</span>
          <strong>{data.history.length}</strong>
          <p>Weights over time, not price performance</p>
        </div>
      </div>
      <div className="index-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">ALLOCATION OVER TIME</span>
              <h2>{selected} in the index</h2>
            </div>
            <span className="tag">{percent(holding.weight, 2)} now</span>
          </div>
          <div className="row wrap chart-select">
            {(["AAPL", "NVDA", "MSFT", "TSLA", "JPM"] as Ticker[]).map((ticker) => (
              <button
                className={`chip ${selected === ticker ? "active" : ""}`}
                key={ticker}
                onClick={() => setSelected(ticker)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <StockLogo ticker={ticker} size={16} />
                <b>{ticker}</b>
              </button>
            ))}
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={history}
                margin={{ top: 20, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0f4" />
                <XAxis
                  dataKey="step"
                  tickFormatter={(i: number) => history[i]?.timestamp ?? ""}
                  minTickGap={70}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(n: number) => percent(n, 0)}
                  domain={[0, 0.15]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(i) => history[Number(i)]?.timestamp}
                  formatter={(n) => percent(Number(n), 2)}
                />
                <ReferenceLine
                  y={0.05}
                  stroke="#a1a9b7"
                  strokeDasharray="4 4"
                  label={{
                    value: "5% starting weight",
                    position: "insideTopRight",
                    fill: "#667085",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey={selected}
                  stroke="#3564db"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="small muted">
            {latest?.reason ?? "Equal-weight starting index"}. Select any
            company below to inspect its allocation.
          </p>
        </section>
        <section className="panel policy-panel">
          <span className="eyebrow">ALLOCATION RULES</span>
          <h2>Portfolio limits</h2>
          <div className="policy-line">
            <b>2–15%</b>
            <span>Weight per company</span>
          </div>
          <div className="policy-line">
            <b>8%</b>
            <span>Maximum one-way turnover</span>
          </div>
          <div className="policy-line">
            <b>6 hours</b>
            <span>Evidence half-life</span>
          </div>
          <div className="policy-line">
            <b>24 hours</b>
            <span>Signal lookback</span>
          </div>
          <p className="small">
            Social posts receive 60% of the evidence weight of news. Repeated
            stories are excluded. No prices, execution costs or return forecasts
            are assumed.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">CURRENT HOLDINGS</span>
            <h2>Company weights</h2>
          </div>
          <select
            aria-label="Filter index sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {[
              "All sectors",
              ...new Set(data.holdings.map((h) => h.sector)),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Sector</th>
                <th>Price (TradingView)</th>
                <th>Sentiment</th>
                <th>Weight</th>
                <th>vs. 5% start</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings
                .filter((h) => sector === "All sectors" || h.sector === sector)
                .sort(
                  (a, b) =>
                    Math.abs(b.weight - 0.05) - Math.abs(a.weight - 0.05),
                )
                .map((h) => {
                  const q = quotes?.stocks[h.ticker];
                  return (
                    <tr
                      key={h.ticker}
                      className={selected === h.ticker ? "selected-row" : ""}
                    >
                      <td>
                        <button
                          className="stock-button"
                          onClick={() => setSelected(h.ticker)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <StockLogo ticker={h.ticker} size={22} />
                          <span>
                            <b>{h.ticker}</b>
                            <small>{h.name}</small>
                          </span>
                        </button>
                      </td>
                      <td className="muted">{h.sector}</td>
                      <td>
                        {q ? (
                          <div>
                            <b style={{ fontVariantNumeric: "tabular-nums" }}>
                              ${q.price.toFixed(2)}
                            </b>
                            <small
                              style={{
                                display: "block",
                                fontSize: 10.5,
                                fontWeight: 600,
                                color:
                                  q.changePct >= 0
                                    ? "var(--green)"
                                    : "var(--red)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {q.changePct >= 0 ? "+" : ""}
                              {q.changePct}%
                            </small>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={sentimentTone(h.sentiment)}>
                        {signed(h.sentiment)}
                      </td>
                    <td>
                      <div className="weight-cell">
                        <b>{percent(h.weight, 2)}</b>
                        <div>
                          <i style={{ width: `${(h.weight / 0.15) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className={tone(h.weight - 0.05)}>
                      {signed((h.weight - 0.05) * 100)} pp
                    </td>
                    <td>{h.signalCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>{selected}: behind the allocation</h2>
          <ArrowRight size={18} />
        </div>
        {evidence.length ? (
          evidence.slice(0, 5).map((s) => <SignalCard key={s.id} signal={s} />)
        ) : (
          <p className="empty">
            No eligible company signals in the last 24 hours. Its target starts
            from equal weight.
          </p>
        )}
      </section>
    </>
  );
}
