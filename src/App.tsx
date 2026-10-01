import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  MessageSquare,
  Newspaper,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
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
import {
  EVENTS,
  STOCKS,
  type Dashboard,
  type Holding,
  type Signal,
  type Ticker,
} from "../shared/types";

type View =
  | "overview"
  | "signals"
  | "portfolio"
  | "stress"
  | "sources"
  | "method";

const STOCK_META: Record<
  string,
  { name: string; bg: string; color: string; price: number; initial: string }
> = {
  AAPL: { name: "Apple", bg: "#000000", color: "#ffffff", price: 150.7, initial: "" },
  META: { name: "Meta", bg: "#0866ff", color: "#ffffff", price: 140.45, initial: "M" },
  MSFT: { name: "Microsoft", bg: "#00a4ef", color: "#ffffff", price: 240.98, initial: "田" },
  GOOGL: { name: "Google", bg: "#ea4335", color: "#ffffff", price: 99.12, initial: "G" },
  NVDA: { name: "NVIDIA", bg: "#76b900", color: "#ffffff", price: 124.5, initial: "N" },
  AMZN: { name: "Amazon", bg: "#ff9900", color: "#ffffff", price: 182.3, initial: "a" },
  TSLA: { name: "Tesla", bg: "#e82127", color: "#ffffff", price: 210.15, initial: "T" },
  JPM: { name: "JPMorgan", bg: "#0a2f64", color: "#ffffff", price: 198.4, initial: "J" },
  XOM: { name: "Exxon Mobil", bg: "#ed1b2d", color: "#ffffff", price: 112.6, initial: "X" },
  JNJ: { name: "Johnson & Johnson", bg: "#d51900", color: "#ffffff", price: 162.2, initial: "+" },
};

const SAMPLE_PROMPTS = [
  "Apple reports record quarterly iPhone revenue and expanding cloud services margins",
  "DOJ and FTC initiate joint antitrust probe into major artificial intelligence developers",
  "Tesla faces NHTSA investigation following reports of autonomous driving software incidents",
  "Federal Reserve signals potential interest rate cuts as corporate credit defaults moderate",
  "NVIDIA reveals next-generation Blackwell AI architecture with massive enterprise demand",
];

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
const tone = (n: number) =>
  n > 0.15 ? "positive" : n < -0.15 ? "negative" : "neutral";
const clock = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api/${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("The API is unavailable. Check that the server is running.");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The request failed.");
  return result;
}

function Modal({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#2563eb",
                letterSpacing: "0.5px",
              }}
            >
              RISK ENGINE INTEL
            </span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="header-circle-btn"
            style={{ width: 32, height: 32 }}
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function SignalDetail({
  signal: s,
  close,
}: {
  signal: Signal;
  close: () => void;
}) {
  const [json, setJson] = useState(false);
  return (
    <Modal
      title="Inside the signal"
      subtitle={`${s.sourceName} · ${clock(s.publishedAt)} · ${s.model}`}
      close={close}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span
          className="time-pill"
          style={{ padding: "3px 10px", fontSize: 11 }}
        >
          {s.isSample
            ? "Fictional demo"
            : s.sourceKind === "manual"
              ? "Manual input"
              : "Live source"}
        </span>
        {s.tickers.map((t) => (
          <span
            key={t}
            className="time-pill"
            style={{
              padding: "3px 10px",
              fontSize: 11,
              background: "#eff6ff",
              color: "#2563eb",
              borderColor: "#bfdbfe",
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0", lineHeight: 1.5 }}>
        {s.text}
      </h3>
      <div className="detail-scores">
        <div>
          <span>Sentiment</span>
          <strong
            style={{
              color:
                s.sentiment > 0.15
                  ? "#059669"
                  : s.sentiment < -0.15
                    ? "#dc2626"
                    : "#64748b",
            }}
          >
            {signed(s.sentiment)}
          </strong>
        </div>
        <div>
          <span>Impact estimate</span>
          <strong>
            {s.impact}
            <small style={{ fontSize: 12, color: "#94a3b8" }}>/10</small>
          </strong>
        </div>
        <div>
          <span>Model confidence</span>
          <strong>
            {s.confidence === null ? "N/A" : pct(s.confidence, 0)}
          </strong>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "16px 0",
        }}
      >
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Event classification:
        </span>
        <span className={`event-tag event-${s.event.split(" ")[0].toLowerCase()}`}>
          {s.event}
        </span>
      </div>
      <h4 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 8px" }}>
        How this was scored:
      </h4>
      <ul style={{ paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
        {s.evidence.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginTop: 16 }}>
        Impact is a rule-based severity estimate. Model confidence describes
        sentiment classification, not market probability.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button className="button secondary" onClick={() => setJson(!json)}>
          <Database size={14} />
          {json ? "Hide JSON" : "View JSON"}
        </button>
        {s.sourceUrl && (
          <a
            className="button secondary"
            href={s.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Original source <ExternalLink size={14} />
          </a>
        )}
      </div>
      {json && (
        <pre
          style={{
            background: "#f8fafc",
            border: "1px solid #edf0f4",
            borderRadius: 12,
            padding: 14,
            fontSize: 11,
            maxHeight: 220,
            overflow: "auto",
            marginTop: 14,
          }}
        >
          {JSON.stringify(s, null, 2)}
        </pre>
      )}
    </Modal>
  );
}

function MiniSparkline({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const points = values.length >= 2 ? values : [0.1, 0.1];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min > 0.0001 ? max - min : 0.01;
  const width = 52;
  const height = 24;

  const path = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const color = positive ? "#10b981" : "#ef4444";

  return (
    <svg className="stock-sparkline-svg" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState<View>("overview");
  const [connectionError, setConnectionError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedStock, setSelectedStock] = useState<Ticker>("AAPL");
  const [activeTimeframe, setActiveTimeframe] = useState("1 Week");
  const [showBalance, setShowBalance] = useState(true);
  const [analyze, setAnalyze] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [selectedStressScenario, setSelectedStressScenario] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await api<Dashboard>("dashboard"));
      setConnectionError("");
    } catch (e) {
      setConnectionError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const action = async (name: string, fn: () => Promise<void>) => {
    setPending(name);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending("");
    }
  };

  const refresh = () =>
    action("refresh", async () => {
      const result = await api<{ added: number; sources: Dashboard["sources"] }>(
        "refresh",
        {},
      );
      setNotice(`${result.added} new signals ingested from live feeds.`);
    });

  const replay = () =>
    action("replay", async () => {
      const r = await api<{ added: number }>("replay", {});
      setNotice(`${r.added} demo scenarios analyzed. Index weights updated.`);
    });

  const switchMode = () =>
    action("mode", async () => {
      await api("mode", { mode: data?.mode === "demo" ? "live" : "demo" });
      setNotice(
        data?.mode === "demo"
          ? "Live feeds connected. Auto-refresh enabled."
          : "Demo dataset restored.",
      );
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void action("analyze", async () => {
      const r = await api<{ added: number; signals: Signal[] }>("analyze", {
        text,
        sourceKind: "manual",
        sourceName: "Manual input",
      });
      setAnalyze(false);
      setText("");
      if (r.signals[0]) setSelectedSignal(r.signals[0]);
      else setNotice("Signal already exists in feed. No duplicate added.");
    });
  };

  const busy = !!pending || !!data?.busy || !data?.ready;

  const currentHolding =
    data?.holdings.find((h) => h.ticker === selectedStock) ??
    data?.holdings[0] ?? {
      ticker: "AAPL",
      name: "Apple",
      sector: "Technology",
      weight: 0.1,
      previousWeight: 0.1,
      sentiment: 0,
      signalCount: 0,
    };

  const stockDelta =
    ((currentHolding.weight - currentHolding.previousWeight) * 100);

  const stockHistoryData =
    data && data.history.length > 0
      ? data.history.map((s, idx) => ({
          tick: idx === 0 ? "15" : `${15 + idx}`,
          val: ((s.weights[selectedStock] ?? 0.1) * 100).toFixed(2),
        }))
      : [
          { tick: "15", val: "10.00" },
          { tick: "16", val: "11.20" },
          { tick: "17", val: "10.80" },
          { tick: "18", val: "12.40" },
          { tick: "19", val: "11.90" },
          { tick: "20", val: "13.50" },
          { tick: "21", val: "14.20" },
          { tick: "22", val: "14.80" },
        ];

  const filteredSignals = (data?.signals ?? []).filter((s) => {
    const matchesSearch =
      `${s.text} ${s.tickers.join(" ")} ${s.sourceName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesEvent = eventFilter === "all" || s.event === eventFilter;
    const matchesImpact = !highImpactOnly || s.impact >= 7;
    return matchesSearch && matchesEvent && matchesImpact;
  });

  const basePortfolio = [
    { name: "Corporate Loans", base: 40_000_000 },
    { name: "Sovereign & IG Bonds", base: 30_000_000 },
    { name: "Large-Cap Equities", base: 18_000_000 },
    { name: "Rates & FX Derivatives", base: 12_000_000 },
  ];

  const stressScenarios = [
    {
      title: "Geopolitical Shock",
      severity: 8,
      shocks: [-0.035, 0.02, -0.125, -0.04],
      desc: "Regional conflict triggers equity selloff, bond safe-haven inflows, and credit spread blowout.",
    },
    {
      title: "Credit Default Contagion",
      severity: 9,
      shocks: [-0.09, -0.065, -0.07, -0.08],
      desc: "Institutional credit defaults cascade across corporate loan facilities and bond tranches.",
    },
    {
      title: "Macro Rate Shock (+250 bps)",
      severity: 7,
      shocks: [0.015, -0.082, -0.08, -0.05],
      desc: "Unanticipated central bank rate hike devalues fixed duration bonds with loan margin offset.",
    },
    {
      title: "Antitrust & Regulatory Probe",
      severity: 7,
      shocks: [-0.01, 0.0, -0.1, -0.015],
      desc: "Regulatory remedy decrees impact Big Tech equity valuations across portfolio holdings.",
    },
  ];

  const scenario = stressScenarios[selectedStressScenario];
  const totalBase = 100_000_000;
  const stressedAssets = basePortfolio.map((asset, i) => {
    const shock = scenario.shocks[i];
    const stressed = asset.base * (1 + shock);
    const delta = stressed - asset.base;
    return { ...asset, shock, stressed, delta };
  });
  const totalStressed = stressedAssets.reduce((sum, a) => sum + a.stressed, 0);
  const totalDelta = totalStressed - totalBase;
  const totalPct = (totalDelta / totalBase) * 100;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
        >
          <span className="brand-icon">
            <Zap size={18} fill="currentColor" />
          </span>
          <b>GoRisk</b>
        </a>

        <div className="sidebar-wallet-card">
          <div className="wallet-card-header">
            <span>Total Investment</span>
            <span className="wallet-pill">+18,10% ↑</span>
          </div>
          <div className="wallet-balance">
            <strong>{showBalance ? "$5,380,90" : "••••••"}</strong>
            <button
              onClick={() => setShowBalance(!showBalance)}
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </div>

        <nav aria-label="Main sidebar">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button
            className={view === "portfolio" ? "active" : ""}
            onClick={() => setView("portfolio")}
          >
            <Layers3 size={18} />
            <span>Wallet / Index</span>
          </button>
          <button
            className={view === "signals" ? "active" : ""}
            onClick={() => setView("signals")}
          >
            <Radio size={18} />
            <span>News & Signals</span>
            <small>{data?.stats.total ?? "—"}</small>
          </button>
          <button
            className={view === "stress" ? "active" : ""}
            onClick={() => setView("stress")}
          >
            <TrendingUp size={18} />
            <span>Stock & Fund</span>
            <ChevronDown size={14} style={{ marginLeft: "auto" }} />
          </button>
          {view === "stress" && (
            <div className="nav-subgroup">
              <span className="nav-subitem active">Stress Testing (Mod B)</span>
              <span className="nav-subitem">10-Stock Index (Mod A)</span>
            </div>
          )}
        </nav>

        <div className="sidebar-bottom-nav">
          <button
            className={view === "method" ? "active" : ""}
            onClick={() => setView("method")}
          >
            <BookOpen size={18} />
            <span>Our Community</span>
          </button>
          <button
            className={view === "sources" ? "active" : ""}
            onClick={() => setView("sources")}
          >
            <Database size={18} />
            <span>Settings</span>
            <span className="badge-dot">2</span>
          </button>
          <button onClick={() => setAnalyze(true)}>
            <Plus size={18} />
            <span>Analyze Text</span>
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="header-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Press "⌘K" to search for various stocks...'
            />
          </div>

          <div className="topbar-actions">
            <button
              className="header-circle-btn"
              onClick={() => setAnalyze(true)}
              title="Add text for NLP analysis"
            >
              <Mail size={16} />
            </button>
            <button
              className="header-circle-btn"
              onClick={() => setView("signals")}
              title="Notifications"
            >
              <Bell size={16} />
              <span className="header-badge" />
            </button>
            <div className="top-divider" />
            <div className="header-user" onClick={() => setView("method")}>
              <div className="header-user-avatar">SP</div>
              <b>Nishant Agarwal</b>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        <main>
          <div className="banner-strip">
            <div>
              <span className={`banner-pill ${data?.mode === "live" ? "live" : ""}`}>
                {data?.mode === "live" ? <Globe2 size={13} /> : <Play size={11} />}
                {data?.mode === "live" ? "LIVE SOURCES" : "DEMO WORKSPACE"}
              </span>
              <p>
                S&P Global & CRISIL Risk Intelligence Engine ·{" "}
                {data?.engine.status === "ready"
                  ? "FinBERT CPU Online"
                  : "Lexicon Fallback"}
              </p>
            </div>
            <div className="banner-actions">
              <button
                className="button secondary"
                onClick={() => setAnalyze(true)}
                disabled={busy}
              >
                <Plus size={14} />
                Analyze Text
              </button>
              <button
                className="button primary"
                onClick={() =>
                  void (data?.mode === "demo" ? replay() : refresh())
                }
                disabled={busy}
              >
                {pending ? (
                  <LoaderCircle className="spin" size={14} />
                ) : data?.mode === "demo" ? (
                  <Play size={13} fill="currentColor" />
                ) : (
                  <RefreshCw size={13} />
                )}
                {data?.mode === "demo" ? "Run Next Event" : "Fetch Live"}
              </button>
              <button
                className="button secondary"
                onClick={() => void switchMode()}
                disabled={busy}
              >
                {data?.mode === "live" ? "Demo Mode" : "Live Feeds"}
              </button>
            </div>
          </div>

          {(error || connectionError) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 18px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 14,
                marginBottom: 20,
                color: "#b91c1c",
                fontSize: 12,
              }}
            >
              <CircleHelp size={16} />
              <span style={{ flex: 1 }}>{error || connectionError}</span>
              <button
                onClick={() => {
                  setError("");
                  setConnectionError("");
                }}
                style={{ background: "none", border: 0, color: "inherit" }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {notice && (
            <div className="toast">
              <Check size={16} />
              {notice}
            </div>
          )}

          {view === "overview" && (
            <>
              <div className="section-head">
                <h2>My Portfolio</h2>
                <span>10 S&P Large-Cap Holdings</span>
              </div>

              <div className="portfolio-row">
                {STOCKS.slice(0, 4).map((stk) => {
                  const holding = data?.holdings.find(
                    (h) => h.ticker === stk.ticker,
                  ) ?? {
                    weight: 0.1,
                    previousWeight: 0.1,
                    sentiment: 0,
                  };
                  const meta = STOCK_META[stk.ticker] ?? {
                    name: stk.name,
                    bg: "#000",
                    color: "#fff",
                    price: 150,
                    initial: stk.ticker[0],
                  };
                  const delta = (holding.weight - holding.previousWeight) * 100;
                  const isSelected = selectedStock === stk.ticker;
                  const historyVals =
                    data?.history.map((s) => s.weights[stk.ticker] ?? 0.1) ?? [
                      0.1, 0.1,
                    ];

                  return (
                    <div
                      key={stk.ticker}
                      className={`portfolio-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedStock(stk.ticker)}
                    >
                      <div className="portfolio-card-top">
                        <div className="portfolio-card-brand">
                          <span
                            className="stock-icon-circle"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.initial}
                          </span>
                          <div>
                            <b>{meta.name}</b>
                          </div>
                        </div>
                        <MiniSparkline
                          values={historyVals}
                          positive={delta >= -0.005}
                        />
                      </div>
                      <div className="portfolio-card-metrics">
                        <div className="portfolio-metric-row">
                          <span>Total Shares</span>
                          <b>${meta.price.toFixed(2)}</b>
                        </div>
                        <div className="portfolio-metric-row">
                          <span>Total Return</span>
                          <span
                            className={`metric-return ${
                              delta > 0.005
                                ? "positive"
                                : delta < -0.005
                                  ? "negative"
                                  : "neutral"
                            }`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(2)}% {delta >= 0 ? "↑" : "↓"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="main-dashboard-grid">
                <div className="hero-chart-card">
                  <div className="hero-chart-header">
                    <div className="hero-chart-stock-info">
                      <span
                        className="hero-stock-avatar"
                        style={{
                          background:
                            STOCK_META[selectedStock]?.bg ?? "#000000",
                          color:
                            STOCK_META[selectedStock]?.color ?? "#ffffff",
                        }}
                      >
                        {STOCK_META[selectedStock]?.initial ?? selectedStock[0]}
                      </span>
                      <div className="hero-stock-titles">
                        <h3>
                          {STOCK_META[selectedStock]?.name ?? selectedStock} inc
                        </h3>
                        <span>{selectedStock}</span>
                      </div>
                    </div>
                    <div className="hero-chart-price-block">
                      <div
                        className={`hero-price-badge ${
                          stockDelta >= -0.005 ? "positive" : "negative"
                        }`}
                      >
                        {stockDelta >= 0 ? "+" : ""}
                        {stockDelta.toFixed(2)}% {stockDelta >= 0 ? "↑" : "↓"}
                      </div>
                      <span className="hero-price-val">
                        ${(STOCK_META[selectedStock]?.price ?? 150.7).toFixed(2)}
                      </span>
                      <span className="hero-last-update">
                        Last update at{" "}
                        {clock(data?.stats.lastUpdated ?? null)}
                      </span>
                    </div>
                  </div>

                  <div className="timeframe-pill-bar">
                    {[
                      "1 Day",
                      "1 Week",
                      "1 Month",
                      "3 Month",
                      "6 Month",
                      "1 Year",
                      "5 Year",
                      "All",
                    ].map((pill) => (
                      <button
                        key={pill}
                        className={`time-pill ${activeTimeframe === pill ? "active" : ""}`}
                        onClick={() => setActiveTimeframe(pill)}
                      >
                        {pill}
                      </button>
                    ))}
                  </div>

                  <div className="hero-line-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stockHistoryData}
                        margin={{ top: 10, right: 10, bottom: 0, left: -26 }}
                      >
                        <CartesianGrid
                          stroke="#f1f3f7"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="tick"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 22]}
                          ticks={[0, 5, 10, 15, 20]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "none",
                            borderRadius: 12,
                            color: "#ffffff",
                            fontSize: 12,
                            padding: "8px 12px",
                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                          }}
                          labelFormatter={(v) => `21 Sept on ${v}.00`}
                          formatter={(v) => [
                            `$${Number(v) * 12.8},90 (${v}%)`,
                            "Weight",
                          ]}
                        />
                        <ReferenceLine
                          y={10}
                          stroke="#cbd5e1"
                          strokeDasharray="4 4"
                        />
                        <Line
                          type="monotone"
                          dataKey="val"
                          stroke="#14b8a6"
                          strokeWidth={2.8}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="watchlist-card">
                  <div className="watchlist-header">
                    <h3>My watchlist</h3>
                    <button
                      onClick={() => setAnalyze(true)}
                      title="Add headline"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="watchlist-list">
                    {STOCKS.map((stk) => {
                      const meta = STOCK_META[stk.ticker] ?? {
                        name: stk.name,
                        bg: "#000",
                        color: "#fff",
                        price: 100,
                        initial: stk.ticker[0],
                      };
                      const holding = data?.holdings.find(
                        (h) => h.ticker === stk.ticker,
                      ) ?? {
                        weight: 0.1,
                        previousWeight: 0.1,
                      };
                      const delta =
                        (holding.weight - holding.previousWeight) * 100;
                      const isSelected = selectedStock === stk.ticker;

                      return (
                        <div
                          key={stk.ticker}
                          className={`watchlist-item ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedStock(stk.ticker)}
                        >
                          <div className="watchlist-item-left">
                            <span
                              className="watchlist-item-avatar"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {meta.initial}
                            </span>
                            <div className="watchlist-item-names">
                              <b>{stk.ticker}</b>
                              <span>{meta.name}</span>
                            </div>
                          </div>
                          <div className="watchlist-item-right">
                            <b>${meta.price.toFixed(2)}</b>
                            <span
                              className={
                                delta > 0.005
                                  ? "positive"
                                  : delta < -0.005
                                    ? "negative"
                                    : "neutral"
                              }
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-head">
                  <div>
                    <h2>
                      Signal Intelligence Feed{" "}
                      <span className="count-pill">
                        {filteredSignals.length}
                      </span>
                    </h2>
                    <p>Real-time news & social data parsed by FinBERT</p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setView("signals")}
                  >
                    View All Signals <ArrowRight size={14} />
                  </button>
                </div>

                <div className="feed-filters">
                  <div className="search-box">
                    <Search size={14} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search headlines, company or event..."
                    />
                  </div>
                  <div className="select-box">
                    <SlidersHorizontal size={14} />
                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                    >
                      <option value="all">All Events</option>
                      {EVENTS.map((ev) => (
                        <option key={ev} value={ev}>
                          {ev}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className={`chip-btn ${highImpactOnly ? "active" : ""}`}
                    onClick={() => setHighImpactOnly(!highImpactOnly)}
                  >
                    <Zap size={13} />
                    Impact ≥ 7
                  </button>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>HEADLINE / SOURCE</th>
                        <th>EVENT</th>
                        <th>SENTIMENT</th>
                        <th>IMPACT</th>
                        <th>
                          <span className="sr-only">Inspect</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSignals.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="signal-headline">
                              <span className={`source-icon ${s.sourceKind}`}>
                                {s.sourceKind === "news" ? (
                                  <Newspaper size={15} />
                                ) : s.sourceKind === "social" ? (
                                  <MessageSquare size={15} />
                                ) : (
                                  <Sparkles size={15} />
                                )}
                              </span>
                              <div>
                                <button
                                  className="headline-button"
                                  onClick={() => setSelectedSignal(s)}
                                >
                                  {s.text}
                                </button>
                                <div className="source-line">
                                  {s.tickers.map((t) => (
                                    <b key={t}>{t}</b>
                                  ))}
                                  <span>{s.sourceName}</span>
                                  <span>·</span>
                                  <time>{clock(s.publishedAt)}</time>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`event-tag event-${s.event.split(" ")[0].toLowerCase()}`}
                            >
                              {s.event}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`sentiment-badge ${tone(s.sentiment)}`}
                            >
                              {s.sentiment > 0.15 ? (
                                <ArrowUpRight size={14} />
                              ) : s.sentiment < -0.15 ? (
                                <ArrowDownRight size={14} />
                              ) : (
                                <span>~</span>
                              )}
                              {signed(s.sentiment)}
                            </span>
                          </td>
                          <td>
                            <div className="impact-dots">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span
                                  key={i}
                                  className={`impact-dot ${
                                    i < Math.ceil(s.impact / 2)
                                      ? s.impact >= 7
                                        ? "high"
                                        : "filled"
                                      : ""
                                  }`}
                                />
                              ))}
                              <b style={{ marginLeft: 6, fontSize: 11 }}>
                                {s.impact}/10
                              </b>
                            </div>
                          </td>
                          <td>
                            <button
                              className="header-circle-btn"
                              style={{ width: 28, height: 28 }}
                              onClick={() => setSelectedSignal(s)}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === "signals" && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-head">
                <div>
                  <h2>
                    Signal Intelligence Explorer{" "}
                    <span className="count-pill">
                      {filteredSignals.length}
                    </span>
                  </h2>
                  <p>Filter by company, event severity, and NLP sentiment</p>
                </div>
              </div>

              <div className="feed-filters">
                <div className="search-box">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search company, ticker or keyword..."
                  />
                </div>
                <div className="select-box">
                  <SlidersHorizontal size={14} />
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                  >
                    <option value="all">All Events</option>
                    {EVENTS.map((ev) => (
                      <option key={ev} value={ev}>
                        {ev}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className={`chip-btn ${highImpactOnly ? "active" : ""}`}
                  onClick={() => setHighImpactOnly(!highImpactOnly)}
                >
                  <Zap size={13} />
                  Impact ≥ 7
                </button>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>HEADLINE / SOURCE</th>
                      <th>EVENT</th>
                      <th>SENTIMENT</th>
                      <th>IMPACT</th>
                      <th>
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignals.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="signal-headline">
                            <span className={`source-icon ${s.sourceKind}`}>
                              {s.sourceKind === "news" ? (
                                <Newspaper size={15} />
                              ) : s.sourceKind === "social" ? (
                                <MessageSquare size={15} />
                              ) : (
                                <Sparkles size={15} />
                              )}
                            </span>
                            <div>
                              <button
                                className="headline-button"
                                onClick={() => setSelectedSignal(s)}
                              >
                                {s.text}
                              </button>
                              <div className="source-line">
                                {s.tickers.map((t) => (
                                  <b key={t}>{t}</b>
                                ))}
                                <span>{s.sourceName}</span>
                                <span>·</span>
                                <time>{clock(s.publishedAt)}</time>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`event-tag event-${s.event.split(" ")[0].toLowerCase()}`}
                          >
                            {s.event}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`sentiment-badge ${tone(s.sentiment)}`}
                          >
                            {s.sentiment > 0.15 ? (
                              <ArrowUpRight size={14} />
                            ) : s.sentiment < -0.15 ? (
                              <ArrowDownRight size={14} />
                            ) : (
                              <span>~</span>
                            )}
                            {signed(s.sentiment)}
                          </span>
                        </td>
                        <td>
                          <div className="impact-dots">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span
                                key={i}
                                className={`impact-dot ${
                                  i < Math.ceil(s.impact / 2)
                                    ? s.impact >= 7
                                      ? "high"
                                      : "filled"
                                    : ""
                                }}`}
                              />
                            ))}
                            <b style={{ marginLeft: 6, fontSize: 11 }}>
                              {s.impact}/10
                            </b>
                          </div>
                        </td>
                        <td>
                          <button
                            className="header-circle-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => setSelectedSignal(s)}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "portfolio" && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-head">
                <div>
                  <h2>Tactical Rebalancing Allocation (Module A)</h2>
                  <p>10-Stock S&P Portfolio Target Weights (5% to 20% Bounds)</p>
                </div>
              </div>

              <div className="table-scroll" style={{ padding: "16px 26px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>COMPANY</th>
                      <th>SECTOR</th>
                      <th>CURRENT ALLOCATION</th>
                      <th>PREVIOUS WEIGHT</th>
                      <th>SENTIMENT</th>
                      <th>SIGNALS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.holdings.map((h) => {
                      const delta = (h.weight - h.previousWeight) * 100;
                      return (
                        <tr key={h.ticker}>
                          <td>
                            <b>{h.name}</b> ({h.ticker})
                          </td>
                          <td>{h.sector}</td>
                          <td>
                            <b>{pct(h.weight, 2)}</b>
                          </td>
                          <td>{pct(h.previousWeight, 2)}</td>
                          <td
                            style={{
                              color:
                                h.sentiment > 0.15
                                  ? "#059669"
                                  : h.sentiment < -0.15
                                    ? "#dc2626"
                                    : "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            {signed(h.sentiment)}
                          </td>
                          <td>{h.signalCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "stress" && (
            <div className="stress-card">
              <div className="stress-header">
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    MODULE B: STRESS TESTING
                  </span>
                  <h2>Wholesale Banking Portfolio Stress Test</h2>
                  <p>
                    Simulate real-world NLP risk shocks on a synthetic $100M
                    banking asset portfolio.
                  </p>
                </div>
              </div>

              <div className="stress-scenarios-bar">
                {stressScenarios.map((sc, i) => (
                  <button
                    key={sc.title}
                    className={`scenario-pill ${
                      selectedStressScenario === i ? "active" : ""
                    }`}
                    onClick={() => setSelectedStressScenario(i)}
                  >
                    <Zap size={13} />
                    {sc.title} (Severity {sc.severity}/10)
                  </button>
                ))}
              </div>

              <div className="stress-metrics-grid">
                <div className="stress-stat">
                  <span>Pre-Stress Portfolio</span>
                  <strong>$100.00M</strong>
                  <small style={{ color: "#64748b" }}>Baseline assets</small>
                </div>
                <div className="stress-stat">
                  <span>Post-Stress Portfolio</span>
                  <strong>${(totalStressed / 1_000_000).toFixed(2)}M</strong>
                  <small
                    style={{
                      color: totalPct < 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {totalPct.toFixed(2)}% net change
                  </small>
                </div>
                <div className="stress-stat">
                  <span>Simulated Value Impact</span>
                  <strong
                    style={{
                      color: totalDelta < 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {totalDelta < 0 ? "-" : "+"}$
                    {(Math.abs(totalDelta) / 1_000_000).toFixed(2)}M
                  </strong>
                  <small style={{ color: "#64748b" }}>Asset markdown</small>
                </div>
                <div className="stress-stat">
                  <span>Basel Capital Status</span>
                  <strong
                    style={{
                      color: totalPct < -5 ? "#dc2626" : "#059669",
                    }}
                  >
                    {totalPct < -5 ? "Buffer Impaired" : "Adequate Capital"}
                  </strong>
                  <small style={{ color: "#64748b" }}>Tier-1 capital test</small>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ASSET CLASS</th>
                      <th>INITIAL VALUE</th>
                      <th>APPLIED SHOCK</th>
                      <th>STRESSED VALUE</th>
                      <th>VALUE DELTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressedAssets.map((r) => (
                      <tr key={r.name}>
                        <td>
                          <b>{r.name}</b>
                        </td>
                        <td>${(r.base / 1_000_000).toFixed(1)}M</td>
                        <td
                          style={{
                            color:
                              r.shock > 0
                                ? "#059669"
                                : r.shock < 0
                                  ? "#dc2626"
                                  : "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {r.shock >= 0 ? "+" : ""}
                          {(r.shock * 100).toFixed(1)}%
                        </td>
                        <td>
                          <b>${(r.stressed / 1_000_000).toFixed(2)}M</b>
                        </td>
                        <td
                          style={{
                            color:
                              r.delta > 0
                                ? "#059669"
                                : r.delta < 0
                                  ? "#dc2626"
                                  : "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {r.delta >= 0 ? "+" : "-"}$
                          {(Math.abs(r.delta) / 1_000_000).toFixed(2)}M
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "sources" && (
            <div className="source-cards">
              {data?.sources.map((s) => (
                <div className="source-card" key={s.name}>
                  <div className="source-card-top">
                    <span className="source-large-icon">
                      {s.kind === "news" ? (
                        <Newspaper size={20} />
                      ) : (
                        <MessageSquare size={20} />
                      )}
                    </span>
                    <span className="status-pill">
                      <i
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#10b981",
                        }}
                      />
                      Active
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0" }}>
                    {s.name}
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                    Ingesting public headlines into FinBERT sentiment pipeline.
                  </p>
                  <div
                    style={{
                      borderTop: "1px solid #edf0f4",
                      paddingTop: 12,
                      marginTop: 16,
                      fontSize: 11,
                      color: "#94a3b8",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{s.fetched} documents</span>
                    <span>Last fetch {clock(s.lastFetched)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "method" && (
            <div className="method-grid">
              {[
                [
                  "01",
                  "Data Ingestion",
                  "Multi-source RSS news feeds and Hacker News discussions ingested with duplicate suppression.",
                ],
                [
                  "02",
                  "FinBERT NLP Inference",
                  "Local quantized FinBERT calculates positive, negative, and neutral probabilities with transparent arithmetic.",
                ],
                [
                  "03",
                  "Risk Scoring",
                  "Deterministic event classification and impact formulas estimate market severity from 1 to 10.",
                ],
                [
                  "04",
                  "Index Rebalancing",
                  "Decayed sentiment informs target stock weights bounded between 5% and 20% with 8% turnover limit.",
                ],
              ].map(([num, title, body]) => (
                <div key={num} className="method-card">
                  <span className="method-number">{num}</span>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          )}

          <footer>
            <span>
              <Activity size={14} />
              <b>GoRisk</b> · S&P Global & CRISIL Campus Hackathon
            </span>
            <div>
              <span>Updated {clock(data?.stats.lastUpdated ?? null)}</span>
              <a href="/api/export" download>
                <Download size={14} />
                Export Data
              </a>
            </div>
          </footer>
        </main>
      </div>

      {selectedSignal && (
        <SignalDetail
          signal={selectedSignal}
          close={() => setSelectedSignal(null)}
        />
      )}

      {analyze && (
        <Modal
          title="Analyze text into risk signal"
          subtitle="Submit custom financial text for real-time FinBERT inference and index rebalancing."
          close={() => setAnalyze(false)}
        >
          <form onSubmit={submit}>
            <div className="sample-chips">
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 2,
                }}
              >
                Sample scenarios (click to test):
              </span>
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  className="sample-chip"
                  onClick={() => setText(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              id="headline"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              minLength={10}
              maxLength={6000}
              rows={4}
              required
              placeholder="e.g. Apple reports record quarterly iPhone revenue beating Wall Street estimates…"
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() => setAnalyze(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={!!pending || text.trim().length < 10}
              >
                {pending ? (
                  <LoaderCircle size={14} className="spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Analyze Signal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
