import {
  useCallback,
  useEffect,
  useMemo,
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
  Pause,
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
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
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
  type MarketFlowForecast,
  type Signal,
  type Ticker,
} from "../shared/types";
import {
  generateInitialTicks,
  generateNextTick,
  generateMarketDepth,
  BASE_STOCK_PRICES,
  type MarketTick,
  type StockLiveState,
} from "./liveMarket";

type View =
  | "overview"
  | "flow"
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
  const [activeTimeframe, setActiveTimeframe] = useState("1 Day");
  const [chartMode, setChartMode] = useState<"price" | "weight">("price");
  const [isStreaming, setIsStreaming] = useState(true);
  const [showDepth, setShowDepth] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [analyze, setAnalyze] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [selectedStressScenario, setSelectedStressScenario] = useState(0);

  const [liveStocks, setLiveStocks] = useState<Record<string, StockLiveState>>(() => {
    const init: Record<string, StockLiveState> = {};
    for (const stk of STOCKS) {
      const { ticks, openPrice } = generateInitialTicks(stk.ticker, "1D", 0);
      const last = ticks[ticks.length - 1];
      init[stk.ticker] = {
        ticker: stk.ticker,
        price: last.price,
        prevPrice: last.price,
        openPrice,
        highPrice: Math.max(...ticks.map((t) => t.high)),
        lowPrice: Math.min(...ticks.map((t) => t.low)),
        dayChange: Number((last.price - openPrice).toFixed(2)),
        dayChangePct: Number((((last.price - openPrice) / openPrice) * 100).toFixed(2)),
        volume: ticks.reduce((acc, t) => acc + t.volume, 0),
        flash: null,
        history: ticks,
      };
    }
    return init;
  });

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
      setNotice(`${result.added} new signals ingested from live multi-source feeds.`);
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
          ? "Live feeds connected (Google News, GDELT, Yahoo Finance, HN)."
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

  const activeStockState = liveStocks[selectedStock] ?? {
    ticker: selectedStock,
    price: BASE_STOCK_PRICES[selectedStock] ?? 150,
    prevPrice: BASE_STOCK_PRICES[selectedStock] ?? 150,
    openPrice: BASE_STOCK_PRICES[selectedStock] ?? 150,
    highPrice: (BASE_STOCK_PRICES[selectedStock] ?? 150) * 1.01,
    lowPrice: (BASE_STOCK_PRICES[selectedStock] ?? 150) * 0.99,
    dayChange: 0,
    dayChangePct: 0,
    volume: 120000,
    flash: null,
    history: [],
  };

  const activeSentiment =
    data?.signals?.find((s) => s.tickers.includes(selectedStock))?.sentiment ?? 0;

  const marketDepth = useMemo(() => {
    return generateMarketDepth(activeStockState.price, activeSentiment);
  }, [activeStockState.price, activeSentiment]);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setLiveStocks((prev) => {
        const next = { ...prev };
        const curStock = next[selectedStock];
        if (curStock && curStock.history.length > 0) {
          const lastTick = curStock.history[curStock.history.length - 1];
          const matchingSignals =
            data?.signals?.filter((s) => s.tickers.includes(selectedStock)) ?? [];
          const latestSignal = matchingSignals[0];
          const sentiment = latestSignal ? latestSignal.sentiment : 0;
          const impact = latestSignal ? latestSignal.impact : 4;

          const nextTick = generateNextTick(
            lastTick,
            sentiment,
            impact,
            curStock.history.map((h) => h.price),
          );

          const flash =
            nextTick.price > curStock.price
              ? "up"
              : nextTick.price < curStock.price
                ? "down"
                : null;
          const newHigh = Math.max(curStock.highPrice, nextTick.high);
          const newLow = Math.min(curStock.lowPrice, nextTick.low);
          const change = Number((nextTick.price - curStock.openPrice).toFixed(2));
          const changePct = Number(
            ((change / curStock.openPrice) * 100).toFixed(2),
          );

          next[selectedStock] = {
            ...curStock,
            prevPrice: curStock.price,
            price: nextTick.price,
            highPrice: newHigh,
            lowPrice: newLow,
            dayChange: change,
            dayChangePct: changePct,
            volume: curStock.volume + nextTick.volume,
            flash,
            history: [...curStock.history.slice(-45), nextTick],
          };
        }

        for (const stk of STOCKS) {
          if (stk.ticker === selectedStock) continue;
          if (Math.random() > 0.45) continue;
          const bgStock = next[stk.ticker];
          if (bgStock && bgStock.history.length > 0) {
            const last = bgStock.history[bgStock.history.length - 1];
            const tick = generateNextTick(
              last,
              0,
              3,
              bgStock.history.map((h) => h.price),
            );
            const change = Number((tick.price - bgStock.openPrice).toFixed(2));
            const changePct = Number(
              ((change / bgStock.openPrice) * 100).toFixed(2),
            );
            next[stk.ticker] = {
              ...bgStock,
              prevPrice: bgStock.price,
              price: tick.price,
              dayChange: change,
              dayChangePct: changePct,
              volume: bgStock.volume + tick.volume,
              flash:
                tick.price > bgStock.price
                  ? "up"
                  : tick.price < bgStock.price
                    ? "down"
                    : null,
              history: [...bgStock.history.slice(-30), tick],
            };
          }
        }

        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isStreaming, selectedStock, data?.signals]);

  useEffect(() => {
    const cur = liveStocks[selectedStock];
    if (cur?.flash) {
      const t = setTimeout(() => {
        setLiveStocks((prev) => ({
          ...prev,
          [selectedStock]: { ...prev[selectedStock], flash: null },
        }));
      }, 450);
      return () => clearTimeout(t);
    }
  }, [liveStocks, selectedStock]);

  const handleTimeframeChange = (tf: string) => {
    setActiveTimeframe(tf);
    const matchingSignals =
      data?.signals?.filter((s) => s.tickers.includes(selectedStock)) ?? [];
    const sentiment = matchingSignals[0]?.sentiment ?? 0;
    const { ticks, openPrice } = generateInitialTicks(selectedStock, tf, sentiment);
    const last = ticks[ticks.length - 1];
    setLiveStocks((prev) => ({
      ...prev,
      [selectedStock]: {
        ...prev[selectedStock],
        price: last.price,
        prevPrice: last.price,
        openPrice,
        highPrice: Math.max(...ticks.map((t) => t.high)),
        lowPrice: Math.min(...ticks.map((t) => t.low)),
        dayChange: Number((last.price - openPrice).toFixed(2)),
        dayChangePct: Number((((last.price - openPrice) / openPrice) * 100).toFixed(2)),
        history: ticks,
      },
    }));
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
    const matchesSource =
      sourceFilter === "all" ||
      s.sourceName.toLowerCase().includes(sourceFilter.toLowerCase());
    const matchesImpact = !highImpactOnly || s.impact >= 7;
    return matchesSearch && matchesEvent && matchesSource && matchesImpact;
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

  const flowData = data?.flow;

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
            <span>Total Risk Capital</span>
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
            className={view === "flow" ? "active" : ""}
            onClick={() => setView("flow")}
          >
            <Sparkles size={18} />
            <span>AI Market Flow</span>
            <small
              style={{
                background: "#dbeafe",
                color: "#1d4ed8",
                fontWeight: 700,
              }}
            >
              NEW
            </small>
          </button>
          <button
            className={view === "portfolio" ? "active" : ""}
            onClick={() => setView("portfolio")}
          >
            <Layers3 size={18} />
            <span>Index Rebalance</span>
          </button>
          <button
            className={view === "stress" ? "active" : ""}
            onClick={() => setView("stress")}
          >
            <TrendingUp size={18} />
            <span>Stress Testing</span>
          </button>
          <button
            className={view === "signals" ? "active" : ""}
            onClick={() => setView("signals")}
          >
            <Radio size={18} />
            <span>News & Signals</span>
            <small>{data?.stats.total ?? "—"}</small>
          </button>
        </nav>

        <div className="sidebar-bottom-nav">
          <button
            className={view === "method" ? "active" : ""}
            onClick={() => setView("method")}
          >
            <BookOpen size={18} />
            <span>Methodology</span>
          </button>
          <button
            className={view === "sources" ? "active" : ""}
            onClick={() => setView("sources")}
          >
            <Database size={18} />
            <span>Data Sources</span>
            <span className="badge-dot">{data?.sources.length ?? 4}</span>
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
                  const live = liveStocks[stk.ticker];
                  const livePrice = live ? live.price : meta.price;
                  const liveDelta = live
                    ? live.dayChangePct
                    : (holding.weight - holding.previousWeight) * 100;
                  const isSelected = selectedStock === stk.ticker;
                  const sparklineVals =
                    live && live.history.length > 2
                      ? live.history.map((t) => t.price)
                      : data?.history.map((s) => s.weights[stk.ticker] ?? 0.1) ?? [
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
                          values={sparklineVals}
                          positive={liveDelta >= -0.005}
                        />
                      </div>
                      <div className="portfolio-card-metrics">
                        <div className="portfolio-metric-row">
                          <span>Live Price</span>
                          <b>${livePrice.toFixed(2)}</b>
                        </div>
                        <div className="portfolio-metric-row">
                          <span>Day Return</span>
                          <span
                            className={`metric-return ${
                              liveDelta > 0.005
                                ? "positive"
                                : liveDelta < -0.005
                                  ? "negative"
                                  : "neutral"
                            }`}
                          >
                            {liveDelta >= 0 ? "+" : ""}
                            {liveDelta.toFixed(2)}% {liveDelta >= 0 ? "↑" : "↓"}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3>
                            {STOCK_META[selectedStock]?.name ?? selectedStock}
                          </h3>
                          <span
                            className={`live-pulse-badge ${!isStreaming ? "paused" : ""}`}
                          >
                            <span className="live-dot" />
                            {isStreaming ? "LIVE STREAM" : "PAUSED"}
                          </span>
                        </div>
                        <span>{selectedStock} · S&P Large-Cap</span>
                      </div>
                    </div>
                    <div className="hero-chart-price-block">
                      <div className="hero-price-row">
                        <div
                          className={`hero-price-badge ${
                            activeStockState.dayChange >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {activeStockState.dayChange >= 0 ? "+" : ""}
                          ${activeStockState.dayChange.toFixed(2)} ({activeStockState.dayChangePct >= 0 ? "+" : ""}
                          {activeStockState.dayChangePct.toFixed(2)}%) {activeStockState.dayChange >= 0 ? "↑" : "↓"}
                        </div>
                        <span
                          className={`hero-price-val ${
                            activeStockState.flash ? `flash-${activeStockState.flash}` : ""
                          }`}
                        >
                          ${activeStockState.price.toFixed(2)}
                        </span>
                      </div>
                      <span className="hero-last-update">
                        {isStreaming ? "Real-time stochastic feed" : "Stream paused"} ·{" "}
                        {clock(data?.stats.lastUpdated ?? null)}
                      </span>
                    </div>
                  </div>

                  <div className="hero-chart-stats-strip">
                    <div className="stat-item">
                      <span>Day Open</span>
                      <b>${activeStockState.openPrice.toFixed(2)}</b>
                    </div>
                    <div className="stat-item">
                      <span>Day High</span>
                      <b>${activeStockState.highPrice.toFixed(2)}</b>
                    </div>
                    <div className="stat-item">
                      <span>Day Low</span>
                      <b>${activeStockState.lowPrice.toFixed(2)}</b>
                    </div>
                    <div className="stat-item">
                      <span>Volume</span>
                      <b>{(activeStockState.volume / 1000).toFixed(1)}k</b>
                    </div>
                    <div className="stat-item">
                      <span>VWAP</span>
                      <b>
                        $
                        {(
                          (activeStockState.highPrice +
                            activeStockState.lowPrice +
                            activeStockState.price) /
                          3
                        ).toFixed(2)}
                      </b>
                    </div>
                    <div className="stat-item">
                      <span>FinBERT Bias</span>
                      <b
                        style={{
                          color:
                            activeSentiment > 0.15
                              ? "#059669"
                              : activeSentiment < -0.15
                                ? "#dc2626"
                                : "#64748b",
                        }}
                      >
                        {activeSentiment > 0.15
                          ? "Bullish +0.4%"
                          : activeSentiment < -0.15
                            ? "Bearish -0.4%"
                            : "Neutral Drift"}
                      </b>
                    </div>
                  </div>

                  <div className="chart-toolbar-row">
                    <div className="timeframe-pill-bar">
                      {[
                        "1 Day",
                        "1 Week",
                        "1 Month",
                        "3 Month",
                        "1 Year",
                        "All",
                      ].map((pill) => (
                        <button
                          key={pill}
                          className={`time-pill ${activeTimeframe === pill ? "active" : ""}`}
                          onClick={() => handleTimeframeChange(pill)}
                        >
                          {pill === "1 Day" ? "1D (Live)" : pill}
                        </button>
                      ))}
                    </div>

                    <div className="chart-actions-group">
                      <button
                        className={`chart-mode-pill ${chartMode === "price" ? "active" : ""}`}
                        onClick={() => setChartMode("price")}
                        title="Live stock market price and volume"
                      >
                        <TrendingUp size={12} />
                        Price ($)
                      </button>
                      <button
                        className={`chart-mode-pill ${chartMode === "weight" ? "active" : ""}`}
                        onClick={() => setChartMode("weight")}
                        title="Tactical index allocation history"
                      >
                        <Layers3 size={12} />
                        Weight (%)
                      </button>
                      <button
                        className="stream-ctrl-btn"
                        onClick={() => setIsStreaming(!isStreaming)}
                        title={isStreaming ? "Pause live stream" : "Resume live stream"}
                      >
                        {isStreaming ? (
                          <Pause size={12} />
                        ) : (
                          <Play size={12} fill="currentColor" />
                        )}
                        {isStreaming ? "Pause" : "Live"}
                      </button>
                      <button
                        className={`stream-ctrl-btn ${showDepth ? "active" : ""}`}
                        onClick={() => setShowDepth(!showDepth)}
                        title="Toggle Level 2 Market Depth (Order Book)"
                      >
                        <BarChart3 size={12} />
                        Depth
                      </button>
                    </div>
                  </div>

                  <div className="hero-line-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartMode === "price" ? (
                        <ComposedChart
                          data={activeStockState.history}
                          margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="liveAreaGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={
                                  activeStockState.dayChange >= 0
                                    ? "#10b981"
                                    : "#ef4444"
                                }
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="95%"
                                stopColor={
                                  activeStockState.dayChange >= 0
                                    ? "#10b981"
                                    : "#ef4444"
                                }
                                stopOpacity={0.0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="volGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#94a3b8"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="100%"
                                stopColor="#94a3b8"
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            stroke="#f1f3f7"
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="price"
                            domain={["auto", "auto"]}
                            tickFormatter={(v) => `$${Number(v).toFixed(1)}`}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            orientation="right"
                          />
                          <YAxis
                            yAxisId="vol"
                            domain={[0, "dataMax * 3.5"]}
                            hide
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#0f172a",
                              border: "none",
                              borderRadius: 12,
                              color: "#ffffff",
                              fontSize: 12,
                              padding: "10px 14px",
                              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                            }}
                            labelFormatter={(label) => `Time: ${label}`}
                            formatter={(value, name) => [
                              name === "price"
                                ? `$${Number(value).toFixed(2)}`
                                : name === "ma"
                                  ? `$${Number(value).toFixed(2)}`
                                  : `${Number(value).toLocaleString()} shares`,
                              name === "price"
                                ? "Live Price"
                                : name === "ma"
                                  ? "MA(7)"
                                  : "Traded Volume",
                            ]}
                          />
                          <Bar
                            yAxisId="vol"
                            dataKey="volume"
                            fill="url(#volGrad)"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={10}
                            isAnimationActive={false}
                          />
                          <Area
                            yAxisId="price"
                            type="monotone"
                            dataKey="price"
                            stroke={
                              activeStockState.dayChange >= 0
                                ? "#059669"
                                : "#dc2626"
                            }
                            strokeWidth={2.4}
                            fill="url(#liveAreaGrad)"
                            isAnimationActive={false}
                            activeDot={{
                              r: 5,
                              stroke: "#ffffff",
                              strokeWidth: 2,
                              fill:
                                activeStockState.dayChange >= 0
                                  ? "#059669"
                                  : "#dc2626",
                            }}
                          />
                          <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="ma"
                            stroke="#6366f1"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      ) : (
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
                            labelFormatter={(v) => `Snapshot step #${v}`}
                            formatter={(v) => [
                              `${Number(v).toFixed(2)}%`,
                              "Portfolio Weight",
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
                            activeDot={{
                              r: 5,
                              strokeWidth: 2,
                              stroke: "#ffffff",
                            }}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {showDepth && (
                    <div className="market-depth-panel">
                      <div className="depth-header">
                        <h4>
                          <Activity size={13} />
                          Level 2 Market Depth (Live Orders)
                        </h4>
                        <div className="depth-ratio-wrapper">
                          <span style={{ color: "#2563eb" }}>
                            Bids: {marketDepth.totalBuyQty.toLocaleString()}
                          </span>
                          <div className="depth-ratio-bar">
                            <div
                              className="depth-ratio-fill"
                              style={{
                                width: `${(
                                  (marketDepth.totalBuyQty /
                                    (marketDepth.totalBuyQty +
                                      marketDepth.totalSellQty)) *
                                  100
                                ).toFixed(0)}%`,
                              }}
                            />
                          </div>
                          <span style={{ color: "#dc2626" }}>
                            Asks: {marketDepth.totalSellQty.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="depth-grid">
                        <div className="depth-col bids">
                          <table>
                            <thead>
                              <tr>
                                <th>Orders</th>
                                <th>Qty</th>
                                <th>Bid Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {marketDepth.bids.map((b, i) => (
                                <tr key={i}>
                                  <td>{b.orders}</td>
                                  <td>{b.quantity.toLocaleString()}</td>
                                  <td>${b.price.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>Total</td>
                                <td>
                                  {marketDepth.totalBuyQty.toLocaleString()}
                                </td>
                                <td>—</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="depth-col asks">
                          <table>
                            <thead>
                              <tr>
                                <th>Ask Price</th>
                                <th>Qty</th>
                                <th>Orders</th>
                              </tr>
                            </thead>
                            <tbody>
                              {marketDepth.asks.map((a, i) => (
                                <tr key={i}>
                                  <td>${a.price.toFixed(2)}</td>
                                  <td>{a.quantity.toLocaleString()}</td>
                                  <td>{a.orders}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>—</td>
                                <td>
                                  {marketDepth.totalSellQty.toLocaleString()}
                                </td>
                                <td>Total</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
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
                      const live = liveStocks[stk.ticker];
                      const livePrice = live ? live.price : meta.price;
                      const liveDelta = live ? live.dayChangePct : 0;
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
                            <b
                              className={
                                live?.flash ? `flash-${live.flash}` : ""
                              }
                            >
                              ${livePrice.toFixed(2)}
                            </b>
                            <span
                              className={
                                liveDelta > 0.005
                                  ? "positive"
                                  : liveDelta < -0.005
                                    ? "negative"
                                    : "neutral"
                              }
                            >
                              {liveDelta >= 0 ? "+" : ""}
                              {liveDelta.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {flowData && (
                <div className="flow-engine-card">
                  <div className="flow-engine-header">
                    <div>
                      <span className="banner-pill" style={{ marginBottom: 6 }}>
                        <Sparkles size={12} />
                        NOVEL AI ENGINE: PREDICTIVE MARKET FLOW
                      </span>
                      <h3>AI Market Regime & Institutional Flow Forecast</h3>
                      <p>
                        Using FinBERT sentiment momentum, event clustering, and volume
                        decay to forecast next-24h capital flows across index holdings.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => setView("flow")}
                    >
                      Deep Dive Analytics <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="flow-grid-summary">
                    <div className="flow-stat-box">
                      <span>Predicted Market Regime</span>
                      <strong style={{ fontSize: 18 }}>{flowData.regime}</strong>
                      <small className="positive">
                        {flowData.predictedDirection}
                      </small>
                    </div>
                    <div className="flow-stat-box">
                      <span>Inflow Probability</span>
                      <strong>{pct(flowData.inflowProbability, 0)}</strong>
                      <small
                        className={
                          flowData.inflowProbability >= 0.5
                            ? "positive"
                            : "negative"
                        }
                      >
                        Net Score: {flowData.netFlowScore > 0 ? "+" : ""}
                        {flowData.netFlowScore}/100
                      </small>
                    </div>
                    <div className="flow-stat-box">
                      <span>Predicted Equity Flow</span>
                      <strong
                        style={{
                          color:
                            flowData.crossAssetFlows.equitiesMillions >= 0
                              ? "#059669"
                              : "#dc2626",
                        }}
                      >
                        {flowData.crossAssetFlows.equitiesMillions >= 0
                          ? "+"
                          : ""}
                        ${flowData.crossAssetFlows.equitiesMillions}M
                      </strong>
                      <small className="muted">24h Institutional Flow</small>
                    </div>
                    <div className="flow-stat-box">
                      <span>Predicted Volatility</span>
                      <strong>{flowData.predicted24hVolatility}%</strong>
                      <small className="muted">
                        Historical Accuracy: {flowData.historicalAccuracy.directionalAccuracy}%
                      </small>
                    </div>
                  </div>
                </div>
              )}

              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-head">
                  <div>
                    <h2>
                      Multi-Source Signal Intelligence{" "}
                      <span className="count-pill">
                        {filteredSignals.length}
                      </span>
                    </h2>
                    <p>Live news from Google News, GDELT, Yahoo Finance & Hacker News</p>
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
                  <div className="select-box">
                    <Database size={14} />
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                    >
                      <option value="all">All News Sources</option>
                      <option value="Google">Google News RSS</option>
                      <option value="Yahoo">Yahoo Finance</option>
                      <option value="GDELT">GDELT Global</option>
                      <option value="Hacker">Hacker News</option>
                      <option value="Manual">Manual Input</option>
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

          {view === "flow" && flowData && (
            <div className="flow-engine-card">
              <div className="flow-engine-header">
                <div>
                  <span className="banner-pill" style={{ marginBottom: 6 }}>
                    <Sparkles size={12} />
                    NOVEL PREDICTIVE MODEL
                  </span>
                  <h2>AI Market Flow & Regime Forecaster</h2>
                  <p>
                    Predicts systematic institutional capital reallocations by
                    calculating sentiment velocity, event clustering, and FinBERT
                    probabilities across multi-source financial feeds.
                  </p>
                </div>
              </div>

              <div className="flow-grid-summary">
                <div className="flow-stat-box">
                  <span>Current Market Regime</span>
                  <strong style={{ fontSize: 18 }}>{flowData.regime}</strong>
                  <small className="positive">
                    {flowData.predictedDirection}
                  </small>
                </div>
                <div className="flow-stat-box">
                  <span>Net Inflow Probability</span>
                  <strong>{pct(flowData.inflowProbability, 0)}</strong>
                  <small className="positive">
                    Score: {flowData.netFlowScore > 0 ? "+" : ""}
                    {flowData.netFlowScore}/100
                  </small>
                </div>
                <div className="flow-stat-box">
                  <span>Predicted Volatility</span>
                  <strong>{flowData.predicted24hVolatility}%</strong>
                  <small className="muted">Expected 24h Band</small>
                </div>
                <div className="flow-stat-box">
                  <span>Model Directional Accuracy</span>
                  <strong>
                    {flowData.historicalAccuracy.directionalAccuracy}%
                  </strong>
                  <small className="positive">
                    Info Ratio: {flowData.historicalAccuracy.simulatedInformationRatio}
                  </small>
                </div>
              </div>

              <div className="section-head" style={{ marginTop: 20 }}>
                <h2>Cross-Asset Predicted Capital Flows</h2>
                <span>Projected 24-Hour Capital Flow Direction</span>
              </div>

              <div className="cross-asset-row">
                <div className="asset-flow-tile">
                  <span>Large-Cap Equities</span>
                  <b
                    style={{
                      color:
                        flowData.crossAssetFlows.equitiesMillions >= 0
                          ? "#059669"
                          : "#dc2626",
                    }}
                  >
                    {flowData.crossAssetFlows.equitiesMillions >= 0 ? "+" : ""}
                    ${flowData.crossAssetFlows.equitiesMillions}M
                  </b>
                </div>
                <div className="asset-flow-tile">
                  <span>Sovereign & IG Bonds</span>
                  <b
                    style={{
                      color:
                        flowData.crossAssetFlows.bondsMillions >= 0
                          ? "#059669"
                          : "#dc2626",
                    }}
                  >
                    {flowData.crossAssetFlows.bondsMillions >= 0 ? "+" : ""}
                    ${flowData.crossAssetFlows.bondsMillions}M
                  </b>
                </div>
                <div className="asset-flow-tile">
                  <span>Money Market / Cash</span>
                  <b
                    style={{
                      color:
                        flowData.crossAssetFlows.moneyMarketMillions >= 0
                          ? "#059669"
                          : "#dc2626",
                    }}
                  >
                    {flowData.crossAssetFlows.moneyMarketMillions >= 0 ? "+" : ""}
                    ${flowData.crossAssetFlows.moneyMarketMillions}M
                  </b>
                </div>
              </div>

              <div className="section-head" style={{ marginTop: 24 }}>
                <h2>Stock-by-Stock Institutional Order Flow Matrix</h2>
                <span>Predicted Net Flow, Regime, Momentum & Primary Driver</span>
              </div>

              <div className="table-scroll">
                <table className="flow-matrix-table">
                  <thead>
                    <tr>
                      <th>ASSET</th>
                      <th>PREDICTED FLOW</th>
                      <th>REGIME</th>
                      <th>MOMENTUM</th>
                      <th>EXPECTED DRIFT</th>
                      <th>PRIMARY DRIVING HEADLINE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowData.stockFlows.map((sf) => (
                      <tr key={sf.ticker}>
                        <td>
                          <b>{sf.name}</b> ({sf.ticker})
                        </td>
                        <td>
                          <b
                            style={{
                              color:
                                sf.predictedFlowMillions >= 0
                                  ? "#059669"
                                  : "#dc2626",
                            }}
                          >
                            {sf.predictedFlowMillions >= 0 ? "+" : "-"}$
                            {Math.abs(sf.predictedFlowMillions).toFixed(1)}M
                          </b>
                        </td>
                        <td>
                          <span
                            className={`regime-badge ${sf.regime.toLowerCase()}`}
                          >
                            {sf.regime}
                          </span>
                        </td>
                        <td>
                          <span>{sf.momentumScore}/100</span>
                          <span className="meter-track">
                            <span
                              className="meter-fill"
                              style={{ width: `${sf.momentumScore}%` }}
                            />
                          </span>
                        </td>
                        <td
                          style={{
                            color:
                              sf.expectedDriftPct >= 0
                                ? "#059669"
                                : "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          {sf.expectedDriftPct >= 0 ? "+" : ""}
                          {sf.expectedDriftPct.toFixed(2)}%
                        </td>
                        <td
                          style={{
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#475569",
                          }}
                          title={sf.primaryDriver}
                        >
                          {sf.primaryDriver}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                  <p>Filter by company, news source, event severity, and NLP sentiment</p>
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
                <div className="select-box">
                  <Database size={14} />
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                  >
                    <option value="all">All News Sources</option>
                    <option value="Google">Google News RSS</option>
                    <option value="Yahoo">Yahoo Finance</option>
                    <option value="GDELT">GDELT Global</option>
                    <option value="Hacker">Hacker News</option>
                    <option value="Manual">Manual Input</option>
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
                    Ingesting public news headlines into FinBERT sentiment pipeline.
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
                  "Multi-Source Ingestion",
                  "Google News RSS, GDELT Project, Yahoo Finance, and Hacker News ingested with deduplication.",
                ],
                [
                  "02",
                  "FinBERT NLP Inference",
                  "Local quantized FinBERT calculates positive, negative, and neutral probabilities with transparent arithmetic.",
                ],
                [
                  "03",
                  "Predictive Market Flow Engine",
                  "Novel AI order flow model forecasts institutional inflows, volatility shifts, and cross-asset flow reallocations.",
                ],
                [
                  "04",
                  "Tactical Index Rebalancing",
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
          title="Analyze text into risk signal & predicted flow"
          subtitle="Submit custom financial text for real-time FinBERT inference, flow forecasting, and index rebalancing."
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
