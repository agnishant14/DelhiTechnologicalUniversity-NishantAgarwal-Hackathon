import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  Database,
  Download,
  ExternalLink,
  Eye,
  Globe2,
  Play,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dashboard, QuotesPayload, Ticker } from "../../shared/types";
import type { StressDashboard } from "../../shared/types";
import { money, signed, sentimentTone } from "../lib/api";
import { SignalCard } from "../components/SignalCard";
import { StockLogo } from "../StockLogo";

const MONTHLY_FLOW_DATA = [
  { month: "Jan 2026", flow: 600 },
  { month: "Feb 2026", flow: -200 },
  { month: "Mar 2026", flow: 480 },
  { month: "Apr 2026", flow: 750 },
  { month: "May 2026", flow: 320 },
  { month: "Jun 2026", flow: -250 },
];

interface RadarStockConfig {
  ticker: Ticker;
  name: string;
  price: number;
  delta: number;
  symbol?: string;
  updatedAt?: string;
  history: { time: string; price: number }[];
}

const DEFAULT_RADAR: RadarStockConfig[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 230.86,
    delta: 1.09,
    symbol: "NASDAQ:NVDA",
    history: [
      { time: "3M", price: 197.15 },
      { time: "2M", price: 206.96 },
      { time: "1M", price: 216.75 },
      { time: "Now", price: 230.86 },
    ],
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 330.32,
    delta: -0.81,
    symbol: "NASDAQ:AAPL",
    history: [
      { time: "3M", price: 294.12 },
      { time: "2M", price: 305.56 },
      { time: "1M", price: 317.0 },
      { time: "Now", price: 330.32 },
    ],
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 512.8,
    delta: -0.02,
    symbol: "NASDAQ:MSFT",
    history: [
      { time: "3M", price: 384.48 },
      { time: "2M", price: 441.0 },
      { time: "1M", price: 497.52 },
      { time: "Now", price: 512.8 },
    ],
  },
  {
    ticker: "META",
    name: "Meta Platforms",
    price: 725.93,
    delta: 0.1,
    symbol: "NASDAQ:META",
    history: [
      { time: "3M", price: 607.89 },
      { time: "2M", price: 583.0 },
      { time: "1M", price: 558.35 },
      { time: "Now", price: 725.93 },
    ],
  },
];

export function Overview({
  data,
  stress,
  quotes,
  navigate,
  openSandbox,
  selectTicker,
  onRunEvent,
  onSwitchMode,
  busy,
}: {
  data: Dashboard;
  stress?: StressDashboard;
  quotes?: QuotesPayload;
  navigate: (page: string) => void;
  openSandbox: () => void;
  selectTicker: (ticker: Ticker) => void;
  onRunEvent?: () => void;
  onSwitchMode?: () => void;
  busy?: boolean;
}) {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    NVDA: true,
    AAPL: false,
    MSFT: true,
    META: false,
  });

  const fresh = data.signals.filter(
    (s) => Date.now() - Date.parse(s.publishedAt) <= 86400000 && !s.duplicateOf,
  );
  const active = data.sources.filter((s) => s.status === "ok").length;
  const tilt = data.holdings.filter(
    (h) => Math.abs(h.weight - 0.05) > 0.001,
  ).length;
  const latestStress = stress?.history[0];

  const radarList = DEFAULT_RADAR.map((item) => {
    const q = quotes?.stocks[item.ticker];
    const holding = data.holdings.find((h) => h.ticker === item.ticker);
    const sentimentShift = (holding?.sentiment ?? 0) * 0.5;
    const basePrice = q?.price ?? item.price;
    const baseDelta = q?.changePct ?? item.delta;
    const currentDelta = baseDelta + sentimentShift;
    const baseHistory = q?.history ?? item.history;

    return {
      ...item,
      price: basePrice,
      delta: Number(currentDelta.toFixed(2)),
      history: baseHistory.map((h, i) =>
        i === baseHistory.length - 1 ? { ...h, price: basePrice } : h,
      ),
      symbol: q?.symbol ?? item.symbol ?? `NASDAQ:${item.ticker}`,
      updatedAt: q?.updatedAt
        ? new Date(q.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Live",
    };
  });

  return (
    <>
      {/* Top Grid: Greeting & Current Portfolio on Left, Revenue & Flow Stats on Right */}
      <div className="investio-top-grid">
        <div className="left-stack">
          <div className="investio-card greeting-card">
            <div className="greeting-head-row">
              <div className="greeting-card-info">
                <div className="greeting-badge-row">
                  <span className="live-status-dot" />
                  <span>
                    NLP Risk Engine ·{" "}
                    {data.mode === "live" ? "Live Feeds Active" : "Demo Replay"}
                  </span>
                </div>
                <h2>Hello Nishant, it's good to be back.</h2>
                <p className="greeting-subtitle">
                  AI sentiment surveillance driving Module A tactical index
                  rebalancing &amp; Module B strategic portfolio stress testing.
                </p>
              </div>

              <button
                className="greeting-pill-action"
                onClick={onRunEvent}
                disabled={busy}
                title="Sync live financial feeds or replay next scenario"
              >
                <Code2 size={13} color="#2563eb" />
                <span>{data.mode === "demo" ? "Run Next Event" : "Synch Live Feeds"}</span>
              </button>
            </div>

            <div className="greeting-actions-row">
              <button
                className="greeting-action-btn primary"
                onClick={onRunEvent}
                disabled={busy}
                title={
                  data.mode === "demo"
                    ? "Replay next event scenario"
                    : "Fetch live financial feeds"
                }
              >
                <Play size={13} />
                <span>
                  {data.mode === "demo" ? "Run Next Event" : "Sync Feeds"}
                </span>
              </button>

              <button
                className="greeting-action-btn"
                onClick={onSwitchMode}
                disabled={busy}
                title="Toggle between Live Feeds and Demo Replay"
              >
                <RefreshCw size={13} />
                <span>{data.mode === "live" ? "Demo Mode" : "Live Feeds"}</span>
              </button>

              <button
                className="greeting-action-btn dataset"
                onClick={() => navigate("signals")}
                title="Explore Hugging Face & Kaggle benchmark records"
              >
                <Database size={13} />
                <span>Dataset (920+)</span>
              </button>

              <button
                className="greeting-action-btn sandbox"
                onClick={openSandbox}
                title="Interactive counterfactual simulation with Explainable AI token attribution"
              >
                <Sparkles size={13} />
                <span>What-If (XAI)</span>
              </button>
            </div>
          </div>

          <div className="investio-card current-portfolio-card">
            <div className="card-header-row">
              <h3>Current portfolio</h3>
              <div className="card-header-actions">
                <button
                  type="button"
                  className="dropdown-pill cursor-pointer"
                  onClick={() => navigate("index")}
                >
                  Tactical index <ChevronDown size={12} />
                </button>
                <button
                  className="btn-secondary-pill"
                  onClick={openSandbox}
                  title="Test tactical rebalancing with custom shock"
                >
                  <Plus size={13} />
                  Add wallet
                </button>
              </div>
            </div>

            <div className="portfolio-metrics-split">
              <div className="metric-block">
                <span className="metric-label">My holdings</span>
                <h4>$ 32,568.56</h4>
                <span className="metric-sub positive">
                  Today: +95.89 (+0.67%)
                </span>
              </div>

              <div className="metric-block">
                <span className="metric-label">My revenue</span>
                <h4 style={{ color: "#059669" }}>
                  $ 5,216.40 <small style={{ fontSize: 16 }}>(+16.02%)</small>
                </h4>
                <span className="metric-sub negative">
                  This month: -232.56 (-2.24%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Revenue stats (Matching reference design) */}
        <div className="investio-card revenue-stats-card">
          <div className="card-header-row">
            <h3>Revenue stats</h3>
            <div className="card-header-actions">
              <span className="dropdown-pill">
                Monthly <ChevronDown size={12} />
              </span>
              <button
                className="btn-secondary-pill"
                onClick={() => navigate("stress")}
              >
                <Eye size={13} />
                View report
              </button>
            </div>
          </div>

          <div className="revenue-stats-body">
            <div className="revenue-stats-left">
              <div className="rev-metric-lead">
                <span>Average monthly revenue</span>
                <h4>$ 324.18</h4>
                <small>m/m: -543.89 (-186%)</small>
              </div>

              <div className="rev-sub-details">
                <div>
                  <span>Dividend profit:</span>
                  <b>$ 86.05</b>
                </div>
                <div>
                  <span>2 forthcoming dividends</span>
                </div>
                <div>
                  <span>Transactions:</span>
                  <b>4</b>
                </div>
              </div>

              <button
                className="link-download-report"
                onClick={() => window.open("/api/export", "_blank")}
              >
                <Download size={13} />
                Download pdf report
              </button>
            </div>

            <div className="revenue-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={MONTHLY_FLOW_DATA}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    stroke="#f1f5f9"
                    strokeDasharray="2 2"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[-300, 800]}
                    ticks={[-250, 0, 250, 500, 750]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: 8,
                      color: "#ffffff",
                      fontSize: 11,
                      padding: "6px 10px",
                    }}
                    formatter={(v) => [`$${Number(v)}M`, "Net Capital Flow"]}
                  />
                  <Bar dataKey="flow" radius={[3, 3, 0, 0]}>
                    {MONTHLY_FLOW_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.flow >= 0 ? "#1d4ed8" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Investment Radar (4 Cards) */}
      <section className="investment-radar-section">
        <div className="radar-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3>Investment radar</h3>
            <span
              className="tag"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#2563eb",
                background: "#eff6ff",
                borderColor: "#bfdbfe",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Real-time stock quotes fetched from TradingView"
            >
              <span className="live-status-dot" style={{ width: 6, height: 6 }} />
              TradingView Live
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="dropdown-pill">
              Edit list <ChevronDown size={12} />
            </span>
            <button className="btn-secondary-pill" onClick={openSandbox}>
              <Plus size={13} />
              Add instrument
            </button>
          </div>
        </div>

        <div className="radar-grid">
          {radarList.map((item) => {
            const isPositive = item.delta >= 0;
            const isNotifOn = notifications[item.ticker] ?? false;

            return (
              <div key={item.ticker} className="radar-card">
                <div className="radar-card-header">
                  <div className="radar-company-info">
                    <StockLogo ticker={item.ticker} size={28} />
                    <div className="radar-company-titles">
                      <b>
                        {item.ticker} ({item.name.split(" ")[0]})
                      </b>
                      <span>
                        <span
                          className="live-status-dot"
                          style={{
                            width: 6,
                            height: 6,
                            display: "inline-block",
                            marginRight: 4,
                          }}
                        />
                        Updated: {item.updatedAt ?? "Live"}
                      </span>
                    </div>
                  </div>

                  <div className="radar-price-block">
                    <span className="radar-price-val">
                      {item.price.toFixed(2)} USD
                    </span>
                    <span
                      className={`radar-delta ${isPositive ? "positive" : "negative"}`}
                    >
                      {signed(item.delta)}%
                    </span>
                  </div>
                </div>

                <div className="radar-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={item.history}
                      margin={{ top: 6, right: 4, bottom: 0, left: -26 }}
                    >
                      <defs>
                        <linearGradient
                          id={`grad-${item.ticker}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={isPositive ? "#3b82f6" : "#ef4444"}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={isPositive ? "#3b82f6" : "#ef4444"}
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#94a3b8", fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fill: "#94a3b8", fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        orientation="right"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "none",
                          borderRadius: 8,
                          color: "#ffffff",
                          fontSize: 11,
                          padding: "6px 10px",
                        }}
                        formatter={(v) => [
                          `$${Number(v).toFixed(2)}`,
                          "Price",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "#2563eb" : "#dc2626"}
                        strokeWidth={1.8}
                        fill={`url(#grad-${item.ticker})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="radar-card-footer">
                  <div
                    className="toggle-switch-wrap"
                    onClick={() =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.ticker]: !isNotifOn,
                      }))
                    }
                    title="Toggle alert stream notifications"
                  >
                    <div
                      className={`toggle-switch-track ${isNotifOn ? "on" : ""}`}
                    >
                      <div className="toggle-switch-thumb" />
                    </div>
                    <span>Notifications</span>
                  </div>

                  <a
                    className="btn-link-advanced"
                    href={`https://www.tradingview.com/symbols/${item.symbol || item.ticker}/`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${item.ticker} live chart on TradingView`}
                    style={{
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    TradingView <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Institutional Telemetry Strip */}
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
          <p>Against a 5% equal-weight baseline</p>
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
              ? `${latestStress.event} · ${latestStress.analysisVersion ? "hypothetical P&L" : "historical result"}`
              : "Waiting for a high-impact event"}
          </p>
        </div>
      </section>

      {/* Bottom Grid: Recent Signals & Source Health */}
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
                {active}/{data.sources.length}{" "}
                {data.mode === "demo" ? "ready" : "connected"}
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
                        : `${s.fetched} records ${data.mode === "demo" ? "in workspace" : "in last fetch"}`)}
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

      {/* 20 Constituent Sentiment Heatmap */}
      <section className="panel heatmap-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">20 S&amp;P CONSTITUENTS · MOCK INDEX</span>
            <h2>Company sentiment &amp; Market prices</h2>
          </div>
          <span className="small muted">
            Real-time TradingView quotes and AI surveillance sentiment
          </span>
        </div>
        <div className="stock-heatmap">
          {data.holdings.map((h) => {
            const q = quotes?.stocks[h.ticker];
            return (
              <button
                key={h.ticker}
                className={`heat-cell ${sentimentTone(h.sentiment)}`}
                onClick={() => {
                  selectTicker(h.ticker);
                  navigate("index");
                }}
                title={`${h.name}: ${h.signalCount} signals${q ? ` · $${q.price.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct}%)` : ""}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <b>{h.ticker}</b>
                  {q && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-main)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${q.price.toFixed(2)}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "2px 0 6px",
                  }}
                >
                  <span style={{ margin: 0, fontSize: 10.5 }}>
                    {h.signalCount ? signed(h.sentiment) : "No signal"}
                  </span>
                  {q && (
                    <span
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        color:
                          q.changePct >= 0 ? "var(--green)" : "var(--red)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {q.changePct >= 0 ? "+" : ""}
                      {q.changePct}%
                    </span>
                  )}
                </div>
                <div className="heat-bar">
                  <i
                    style={{
                      width: `${Math.max(3, Math.abs(h.sentiment) * 100)}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
