import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Database,
  Download,
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
import type { Dashboard, Ticker } from "../../shared/types";
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
  history: { time: string; price: number }[];
}

const DEFAULT_RADAR: RadarStockConfig[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 128.4,
    delta: 2.84,
    history: [
      { time: "Apr", price: 112.5 },
      { time: "May", price: 121.8 },
      { time: "Jun", price: 128.4 },
    ],
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 228.1,
    delta: -0.96,
    history: [
      { time: "Apr", price: 236.0 },
      { time: "May", price: 231.5 },
      { time: "Jun", price: 228.1 },
    ],
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 448.2,
    delta: 1.45,
    history: [
      { time: "Apr", price: 422.0 },
      { time: "May", price: 436.5 },
      { time: "Jun", price: 448.2 },
    ],
  },
  {
    ticker: "META",
    name: "Meta Platforms",
    price: 576.8,
    delta: -1.82,
    history: [
      { time: "Apr", price: 598.0 },
      { time: "May", price: 585.0 },
      { time: "Jun", price: 576.8 },
    ],
  },
];

export function Overview({
  data,
  stress,
  navigate,
  openSandbox,
  selectTicker,
  onRunEvent,
  onSwitchMode,
  busy,
}: {
  data: Dashboard;
  stress?: StressDashboard;
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
    const holding = data.holdings.find((h) => h.ticker === item.ticker);
    if (!holding) return item;
    const sentimentShift = holding.sentiment * 3.5;
    const currentDelta = item.delta + sentimentShift;
    return {
      ...item,
      delta: currentDelta,
      history: item.history.map((h, i) =>
        i === 2
          ? { ...h, price: item.price * (1 + currentDelta / 100) }
          : h,
      ),
    };
  });

  return (
    <>
      {/* Top Grid: Greeting & Current Portfolio on Left, Revenue & Flow Stats on Right */}
      <div className="investio-top-grid">
        <div className="left-stack">
          {/* Greeting Card */}
          <div className="investio-card greeting-card">
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

            <div className="greeting-actions-grid">
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

          {/* Current Portfolio Card */}
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
          <h3>Investment radar</h3>
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
                        Updated: 10:36am
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

                  <button
                    className="btn-link-advanced"
                    onClick={() => {
                      selectTicker(item.ticker);
                      navigate("index");
                    }}
                  >
                    Advanced chart
                  </button>
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
              onClick={() => {
                selectTicker(h.ticker);
                navigate("index");
              }}
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
