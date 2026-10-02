import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  Database,
  Download,
  ExternalLink,
  Globe2,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
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
import { money, signed } from "../lib/api";
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
  const weightedReturn = data.holdings.reduce((sum, h) => {
    const q = quotes?.stocks[h.ticker];
    return sum + h.weight * (q?.changePct ?? 0);
  }, 0);

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
                title="Sync live TradingView quotes and NLP risk feeds"
              >
                <TrendingUp size={13} color="#2563eb" strokeWidth={2.2} />
                <span>{data.mode === "demo" ? "Run Next Event" : "Sync with TradingView"}</span>
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
                <Play size={12} fill="currentColor" strokeWidth={0} />
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
                <RefreshCw size={13} strokeWidth={2} color="#64748b" />
                <span>{data.mode === "live" ? "Demo Mode" : "Live Feeds"}</span>
              </button>

              <button
                className="greeting-action-btn dataset"
                onClick={() => navigate("signals")}
                title="Explore Hugging Face & Kaggle benchmark records"
              >
                <Database size={13} color="#2563eb" strokeWidth={2} />
                <span>Dataset (920+)</span>
              </button>

              <button
                className="greeting-action-btn sandbox"
                onClick={openSandbox}
                title="Interactive counterfactual simulation with Explainable AI token attribution"
              >
                <Sparkles size={13} color="#d97706" strokeWidth={2} />
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
                  title="Inspect tactical index weights and dynamic tilting"
                >
                  Tactical index <ChevronDown size={12} />
                </button>
                <button
                  className="btn-secondary-pill"
                  onClick={openSandbox}
                  title="Interactive scenario stress test & counterfactual rebalance simulation"
                >
                  <Sparkles size={12} color="#2563eb" />
                  Test shock
                </button>
              </div>
            </div>

            <div className="portfolio-metrics-split">
              <div className="metric-block">
                <span className="metric-label">Wholesale portfolio</span>
                <h4>$ {(stress?.totalValue ?? 100).toFixed(1)}M</h4>
                <span className="metric-sub positive">
                  {latestStress
                    ? `Latest shock: ${money(latestStress.pnl)} (${latestStress.event})`
                    : "7 wholesale assets · Loans, Bonds, Equity, Derivatives"}
                </span>
              </div>

              <div className="metric-block">
                <span className="metric-label">Tactical index delta</span>
                <h4 style={{ color: weightedReturn >= 0 ? "#059669" : "#dc2626" }}>
                  {weightedReturn >= 0 ? "+" : ""}{weightedReturn.toFixed(2)}%
                </h4>
                <span className={`metric-sub ${weightedReturn >= 0 ? "positive" : "negative"}`}>
                  TradingView live weighted performance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Return & Risk attribution */}
        <div className="investio-card revenue-stats-card">
          <div className="card-header-row">
            <h3>Return &amp; Risk attribution</h3>
            <div className="card-header-actions">
              <button
                type="button"
                className="dropdown-pill cursor-pointer"
                onClick={() => navigate("stress")}
                title="View Module B Wholesale Stress Matrix"
              >
                Wholesale stress <ChevronDown size={12} />
              </button>
              <button
                className="btn-secondary-pill"
                onClick={() => navigate("stress")}
                title="Open Wholesale Portfolio Stress Testing Studio"
              >
                <SlidersHorizontal size={13} />
                Stress matrix
              </button>
            </div>
          </div>

          <div className="revenue-stats-body">
            <div className="revenue-stats-left">
              <div className="rev-metric-lead">
                <span>Index Benchmark Alpha</span>
                <h4 style={{ color: "#059669" }}>+2.84%</h4>
                <small className="positive">Annualized Sharpe: 1.82</small>
              </div>

              <div className="rev-sub-details">
                <div>
                  <span>Wholesale Assets:</span>
                  <b>$100.0M</b>
                </div>
                <div>
                  <span>Active NLP Signals:</span>
                  <b>{data.signals.length}</b>
                </div>
                <div>
                  <span>High-Severity Alerts:</span>
                  <b>{data.signals.filter((s) => s.impact > 7).length}</b>
                </div>
              </div>

              <button
                className="link-download-report"
                onClick={() => window.open("/api/export", "_blank")}
                title="Export machine-readable risk telemetry, weights and NLP signals"
              >
                <Download size={13} />
                Export Risk Signals (JSON)
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
                    formatter={(v) => [
                      `${Number(v) > 0 ? "+" : ""}${Number(v)} bps`,
                      "Alpha Attribution",
                    ]}
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
            <button
              type="button"
              className="dropdown-pill cursor-pointer"
              onClick={() => navigate("index")}
              title="Inspect all 20 constituents in Tactical Index"
            >
              All 20 Constituents <ArrowRight size={12} />
            </button>
            <button
              className="btn-secondary-pill"
              onClick={openSandbox}
              title="Simulate custom scenario shock"
            >
              <Sparkles size={12} color="#2563eb" />
              Simulate Shock
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
                    <div
                      className="radar-company-titles"
                      onClick={() => {
                        selectTicker(item.ticker);
                        navigate("index");
                      }}
                      style={{ cursor: "pointer" }}
                      title={`Inspect ${item.ticker} in Tactical Index`}
                    >
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
    </>
  );
}
