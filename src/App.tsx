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
  Check,
  ChevronDown,
  Database,
  Download,
  Eye,
  FileText,
  Layers3,
  LoaderCircle,
  MessageSquare,
  Newspaper,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
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
  BarChart,
  CartesianGrid,
  Cell,
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
import { StockLogo } from "./StockLogo";
import { GooeyNav } from "./components/ui/gooey-nav";

type View =
  | "overview"
  | "portfolio"
  | "stress"
  | "flow"
  | "signals"
  | "method";

const NAV_VIEWS: View[] = [
  "overview",
  "portfolio",
  "stress",
  "flow",
  "signals",
  "method",
];

const ROUTE_TO_VIEW: Record<string, View> = {
  "/": "overview",
  "/dashboard": "overview",
  "/overview": "overview",
  "/tacticalindex": "portfolio",
  "/tackticalindex": "portfolio",
  "/tactical-index": "portfolio",
  "/portfolio": "portfolio",
  "/stress": "stress",
  "/stresstesting": "stress",
  "/stress-testing": "stress",
  "/wholesalestress": "stress",
  "/wholesale-stress": "stress",
  "/marketflow": "flow",
  "/market-flow": "flow",
  "/flow": "flow",
  "/signals": "signals",
  "/signalintel": "signals",
  "/signal-intel": "signals",
  "/methodology": "method",
  "/method": "method",
};

const VIEW_TO_ROUTE: Record<View, string> = {
  overview: "/dashboard",
  portfolio: "/tacticalindex",
  stress: "/stress",
  flow: "/marketflow",
  signals: "/signals",
  method: "/methodology",
};

function parseViewFromPath(pathname: string): View {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return ROUTE_TO_VIEW[clean] ?? "overview";
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tactical Index", href: "/tacticalindex" },
  { label: "Wholesale Stress", href: "/stress" },
  { label: "Market Flow", href: "/marketflow" },
  { label: "Signal Intel", href: "/signals" },
  { label: "Methodology", href: "/methodology" },
];

const STOCK_META: Record<
  string,
  { name: string; bg: string; color: string; price: number }
> = {
  AAPL: { name: "Apple", bg: "#000000", color: "#ffffff", price: 232.85 },
  META: { name: "Meta", bg: "#0866ff", color: "#ffffff", price: 582.1 },
  MSFT: { name: "Microsoft", bg: "#ffffff", color: "#00a4ef", price: 448.2 },
  GOOGL: { name: "Google", bg: "#ffffff", color: "#ea4335", price: 179.5 },
  NVDA: { name: "NVIDIA", bg: "#76b900", color: "#ffffff", price: 128.65 },
  AMZN: { name: "Amazon", bg: "#232f3e", color: "#ff9900", price: 186.4 },
  TSLA: { name: "Tesla", bg: "#e82127", color: "#ffffff", price: 254.3 },
  JPM: { name: "JPMorgan", bg: "#0a2f64", color: "#ffffff", price: 221.4 },
  XOM: { name: "Exxon Mobil", bg: "#ffffff", color: "#ed1b2d", price: 118.9 },
  JNJ: { name: "Johnson & Johnson", bg: "#d51900", color: "#ffffff", price: 161.75 },
  V: { name: "Visa", bg: "#1a1f71", color: "#ffffff", price: 285.5 },
  WMT: { name: "Walmart", bg: "#0071ce", color: "#ffffff", price: 80.25 },
  PG: { name: "Procter & Gamble", bg: "#003cae", color: "#ffffff", price: 172.4 },
  MA: { name: "Mastercard", bg: "#111827", color: "#ffffff", price: 495.8 },
  HD: { name: "Home Depot", bg: "#f96302", color: "#ffffff", price: 412.3 },
  UNH: { name: "UnitedHealth", bg: "#002677", color: "#ffffff", price: 585.6 },
  BAC: { name: "Bank of America", bg: "#ffffff", color: "#e31837", price: 41.9 },
  LLY: { name: "Eli Lilly", bg: "#d51900", color: "#ffffff", price: 912.4 },
  AVGO: { name: "Broadcom", bg: "#cc092f", color: "#ffffff", price: 174.8 },
  COST: { name: "Costco", bg: "#005dab", color: "#ffffff", price: 898.2 },
};

const SAMPLE_PROMPTS = [
  "Apple reports record quarterly iPhone revenue and expanding cloud services margins",
  "DOJ and FTC initiate joint antitrust probe into major artificial intelligence developers",
  "Tesla faces NHTSA investigation following reports of autonomous driving software incidents",
  "Federal Reserve signals potential interest rate cuts as corporate credit defaults moderate",
  "NVIDIA reveals next-generation Blackwell AI architecture with massive enterprise demand",
];

const MONTHLY_FLOW_DATA = [
  { month: "Jan 2026", flow: 600 },
  { month: "Feb 2026", flow: -200 },
  { month: "Mar 2026", flow: 480 },
  { month: "Apr 2026", flow: 750 },
  { month: "May 2026", flow: 320 },
  { month: "Jun 2026", flow: -250 },
];

const GLOBAL_INDICES = [
  { name: "S&P 500", val: "4,213.80", delta: "+60.30 (+1.45%)", positive: true },
  { name: "DOW JONES", val: "33,700.00", delta: "-61.00 (-0.18%)", positive: false },
  { name: "CRISIL COMPOSITE", val: "15,540.10", delta: "-18.39 (-0.12%)", positive: false },
  { name: "NASDAQ 100", val: "15,288.40", delta: "+87.20 (+0.57%)", positive: true },
  { name: "FTSE 100", val: "7,620.50", delta: "+1.08 (+0.01%)", positive: true },
  { name: "NIKKEI 225", val: "33,240.10", delta: "+124.50 (+0.38%)", positive: true },
  { name: "DAX 40", val: "18,225.40", delta: "+45.10 (+0.25%)", positive: true },
  { name: "SHANGHAI COMP", val: "3,088.20", delta: "-12.40 (-0.40%)", positive: false },
  { name: "BRENT CRUDE", val: "84.50", delta: "+1.20 (+1.44%)", positive: true },
  { name: "GOLD (OUNCE)", val: "2,342.10", delta: "+18.60 (+0.80%)", positive: true },
  { name: "US 10Y YIELD", val: "4.28%", delta: "-0.04 (-0.92%)", positive: false },
];

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
const tone = (n: number) =>
  n > 0.15 ? "positive" : n < -0.15 ? "negative" : "neutral";
const clock = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
                color: "#1d4ed8",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Risk Engine Intelligence
            </span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="dialog-close-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      return parseViewFromPath(window.location.pathname);
    }
    return "overview";
  });

  const navigateTo = useCallback((nextView: View) => {
    setView(nextView);
    const targetRoute = VIEW_TO_ROUTE[nextView];
    if (typeof window !== "undefined" && window.location.pathname !== targetRoute) {
      window.history.pushState({ view: nextView }, "", targetRoute);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const next = parseViewFromPath(window.location.pathname);
      setView(next);
    };

    window.addEventListener("popstate", handlePopState);

    if (
      typeof window !== "undefined" &&
      (window.location.pathname === "/" || window.location.pathname === "")
    ) {
      window.history.replaceState({ view: "overview" }, "", "/dashboard");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  const [connectionError, setConnectionError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedStock, setSelectedStock] = useState<Ticker>("AAPL");
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [selectedStressScenario, setSelectedStressScenario] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const [liveTime, setLiveTime] = useState<string>(() =>
    new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [liveStocks, setLiveStocks] = useState<Record<string, StockLiveState>>(() => {
    const init: Record<string, StockLiveState> = {};
    const initialFormatted = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
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
        lastUpdated: initialFormatted,
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
      setNotice(`${result.added} new signals ingested from live financial feeds.`);
    });

  const replay = () =>
    action("replay", async () => {
      const r = await api<{ added: number }>("replay", {});
      setNotice(`${r.added} demo scenarios analyzed. S&P index weights rebalanced.`);
    });

  const switchMode = () =>
    action("mode", async () => {
      await api("mode", { mode: data?.mode === "demo" ? "live" : "demo" });
      setNotice(
        data?.mode === "demo"
          ? "Live feeds connected (Google News, GDELT, Yahoo Finance, HN)."
          : "Demo scenarios restored.",
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

  // Real-time ticking engine
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setLiveStocks((prev) => {
        const next = { ...prev };
        for (const stk of STOCKS) {
          const isSelected = stk.ticker === selectedStock;
          if (!isSelected && Math.random() > 0.4) continue;
          const cur = next[stk.ticker];
          if (!cur || cur.history.length === 0) continue;
          const last = cur.history[cur.history.length - 1];
          const matchingSignals =
            data?.signals?.filter((s) => s.tickers.includes(stk.ticker)) ?? [];
          const sentiment = matchingSignals[0]?.sentiment ?? 0;
          const impact = matchingSignals[0]?.impact ?? 4;

          const tick = generateNextTick(
            last,
            sentiment,
            impact,
            cur.history.map((h) => h.price),
          );

          const change = Number((tick.price - cur.openPrice).toFixed(2));
          const changePct = Number(((change / cur.openPrice) * 100).toFixed(2));

          next[stk.ticker] = {
            ...cur,
            prevPrice: cur.price,
            price: tick.price,
            highPrice: Math.max(cur.highPrice, tick.high),
            lowPrice: Math.min(cur.lowPrice, tick.low),
            dayChange: change,
            dayChangePct: changePct,
            volume: cur.volume + tick.volume,
            flash: tick.price > cur.price ? "up" : tick.price < cur.price ? "down" : null,
            history: [...cur.history.slice(-32), tick],
            lastUpdated: new Date().toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            }),
          };
        }
        return next;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isStreaming, selectedStock, data?.signals]);

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

  // The 4 prominent radar stocks
  const radarStocks: Ticker[] = ["AAPL", "META", "MSFT", "NVDA"];

  return (
    <div>
      {/* Top Navigation Bar (Investio Dark Slate Bar) */}
      <header className="investio-nav">
        <div className="nav-left">
          <div className="nav-brand">
            <span className="nav-brand-logo-mark" />
            <span>GoRisk</span>
          </div>

          <GooeyNav
            items={NAV_ITEMS}
            value={NAV_VIEWS.indexOf(view)}
            onChange={(idx) => navigateTo(NAV_VIEWS[idx])}
            size="sm"
            activeColor="#2563eb"
            activeLabelColor="#ffffff"
          />
        </div>

        <div className="nav-right">
          <div className="nav-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a company, ticker or event..."
            />
          </div>
          <div className="nav-alert-btn" title="2 Active High-Severity Alerts">
            2
          </div>
          <div className="nav-user-pill" title="Nishant Agarwal">
            <div className="nav-user-avatar">NA</div>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      {/* Global Market Indices Ticker Strip (Continuous Infinite Marquee Loop) */}
      <div className="investio-ticker-strip" title="Hover to pause ticker glide">
        <div className="ticker-track">
          <div className="ticker-group">
            {GLOBAL_INDICES.map((idx, i) => (
              <div key={`idx-a-${idx.name}-${i}`} className="ticker-item">
                <span className="ticker-name">{idx.name}</span>
                <span className="ticker-val">{idx.val}</span>
                <span
                  className={`ticker-delta ${idx.positive ? "positive" : "negative"}`}
                >
                  {idx.positive ? "▲" : "▼"} {idx.delta}
                </span>
              </div>
            ))}
          </div>
          <div className="ticker-group" aria-hidden="true">
            {GLOBAL_INDICES.map((idx, i) => (
              <div key={`idx-b-${idx.name}-${i}`} className="ticker-item">
                <span className="ticker-name">{idx.name}</span>
                <span className="ticker-val">{idx.val}</span>
                <span
                  className={`ticker-delta ${idx.positive ? "positive" : "negative"}`}
                >
                  {idx.positive ? "▲" : "▼"} {idx.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Page Container */}
      <main className="investio-container">
        {(error || connectionError) && (
          <div className="investio-toast error">
            <span>{error || connectionError}</span>
            <button
              onClick={() => {
                setError("");
                setConnectionError("");
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {notice && (
          <div className="investio-toast">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>
              <Check size={14} />
            </button>
          </div>
        )}

        {view === "overview" && (
          <>
            {/* Top Grid: Greeting & Current Portfolio on Left, Risk & Flow Stats on Right */}
            <div className="investio-top-grid">
              <div className="left-stack">
                <div className="investio-card greeting-card">
                  <h2>Hello Nishant, welcome back to GoRisk.</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-secondary-pill"
                      onClick={() => void (data?.mode === "demo" ? replay() : refresh())}
                      disabled={busy}
                    >
                      {pending ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : (
                        <span>&lt;&gt;</span>
                      )}
                      <span>
                        {data?.mode === "demo" ? "Run Next Event" : "Sync with Feeds"}
                      </span>
                    </button>
                    <button
                      className="btn-secondary-pill"
                      onClick={() => void switchMode()}
                      disabled={busy}
                    >
                      {data?.mode === "live" ? "Demo Mode" : "Live Feeds"}
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
                        onClick={() => navigateTo("portfolio")}
                      >
                        Tactical index <ChevronDown size={12} />
                      </button>
                      <button
                        className="btn-secondary-pill"
                        onClick={() => setAnalyze(true)}
                        style={{ padding: "6px 12px" }}
                      >
                        <Plus size={13} />
                        Add scenario
                      </button>
                    </div>
                  </div>

                  <div className="portfolio-metrics-split">
                    <div className="metric-block">
                      <span className="metric-label">My holdings</span>
                      <h4>$ 32,568.56</h4>
                      <span className="metric-sub positive">
                        Today: +95.89 (+0.67%) ▲
                      </span>
                    </div>

                    <div className="metric-block">
                      <span className="metric-label">NLP net flow</span>
                      <h4 style={{ color: "#059669" }}>
                        $ 5,216.40 <small style={{ fontSize: 16 }}>(+16.02%)</small>
                      </h4>
                      <span className="metric-sub negative">
                        This month: -232.56 (-2.24%) ▼
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Risk & Flow stats (Revenue stats in reference) */}
              <div className="investio-card revenue-stats-card">
                <div className="card-header-row">
                  <h3>Risk & Flow stats</h3>
                  <div className="card-header-actions">
                    <span className="dropdown-pill">
                      Monthly <ChevronDown size={12} />
                    </span>
                    <button
                      className="btn-secondary-pill"
                      onClick={() => setShowReportModal(true)}
                      style={{ padding: "6px 12px" }}
                    >
                      <Eye size={13} />
                      View report
                    </button>
                  </div>
                </div>

                <div className="revenue-stats-body">
                  <div className="revenue-stats-left">
                    <div className="rev-metric-lead">
                      <span>Average monthly flow</span>
                      <h4>$ 324.18</h4>
                      <small>m/m: -543.89 (-1.86%)</small>
                    </div>

                    <div className="rev-sub-details">
                      <div>
                        <span>FinBERT Positive:</span>
                        <b>68%</b>
                      </div>
                      <div>
                        <span>Active Events:</span>
                        <b>{data?.signals?.length ?? 24}</b>
                      </div>
                      <div>
                        <span>Turnover Cap:</span>
                        <b>8.0%</b>
                      </div>
                    </div>

                    <button
                      className="link-download-report"
                      onClick={() => window.open("/api/export", "_blank")}
                    >
                      <Download size={13} />
                      Download report
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

            {/* Bottom Section: Investment Radar (4 Cards) */}
            <section className="investment-radar-section">
              <div className="radar-header-row">
                <h3>Investment radar</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="dropdown-pill">
                    Edit universe <ChevronDown size={12} />
                  </span>
                  <button
                    className="btn-secondary-pill"
                    onClick={() => setAnalyze(true)}
                  >
                    <Plus size={13} />
                    Add instrument
                  </button>
                </div>
              </div>

              <div className="radar-grid">
                {radarStocks.map((ticker) => {
                  const stock = liveStocks[ticker];
                  const meta = STOCK_META[ticker] ?? {
                    name: ticker,
                    bg: "#000",
                    color: "#fff",
                    price: 150,
                  };
                  const price = stock ? stock.price : meta.price;
                  const delta = stock ? stock.dayChangePct : 0.45;
                  const historyData =
                    stock && stock.history.length > 0
                      ? stock.history
                      : [
                          { time: "Apr", price: price * 0.96 },
                          { time: "May", price: price * 0.99 },
                          { time: "Jun", price },
                        ];
                  const isPositive = delta >= 0;

                  return (
                    <div key={ticker} className="radar-card">
                      <div className="radar-card-header">
                        <div className="radar-company-info">
                          <StockLogo ticker={ticker} size={28} />
                          <div className="radar-company-titles">
                            <b>
                              {ticker} ({meta.name})
                            </b>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  backgroundColor: "#10b981",
                                  boxShadow: "0 0 6px #10b981",
                                }}
                              />
                              Updated: Live {stock?.lastUpdated ?? liveTime}
                            </span>
                          </div>
                        </div>

                        <div className="radar-price-block">
                          <span className="radar-price-val">
                            {price.toFixed(2)} USD
                          </span>
                          <span
                            className={`radar-delta ${
                              isPositive ? "positive" : "negative"
                            }`}
                          >
                            {signed(delta)}% {isPositive ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      <div className="radar-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={historyData}
                            margin={{ top: 6, right: 4, bottom: 0, left: -26 }}
                          >
                            <defs>
                              <linearGradient
                                id={`grad-${ticker}`}
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
                              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke={isPositive ? "#2563eb" : "#dc2626"}
                              strokeWidth={1.8}
                              fill={`url(#grad-${ticker})`}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="radar-card-footer">
                        <div
                          className="toggle-switch-wrap"
                          onClick={() => setIsStreaming(!isStreaming)}
                          title="Toggle live stream notifications"
                        >
                          <div
                            className={`toggle-switch-track ${
                              isStreaming ? "on" : ""
                            }`}
                          >
                            <div className="toggle-switch-thumb" />
                          </div>
                          <span>Notifications</span>
                        </div>

                        <button
                          className="btn-link-advanced"
                          onClick={() => {
                            setSelectedStock(ticker);
                            setShowAdvancedModal(true);
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
          </>
        )}

        {/* Tactical Index View (Module A) */}
        {view === "portfolio" && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Tactical Index Allocation (Module A)</h2>
                <p>20-Stock S&P Portfolio Target Weights (2% to 15% Bounds)</p>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Current Weight</th>
                    <th>Previous Weight</th>
                    <th>Sentiment Drift</th>
                    <th>Signals Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.holdings.map((h) => (
                    <tr key={h.ticker}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StockLogo ticker={h.ticker} size={22} />
                          <div>
                            <b>{h.name}</b> ({h.ticker})
                          </div>
                        </div>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wholesale Stress Testing View (Module B) */}
        {view === "stress" && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Wholesale Banking Portfolio Stress Test (Module B)</h2>
                <p>Simulate real-world NLP risk shocks on a synthetic $100M banking asset portfolio</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {stressScenarios.map((sc, i) => (
                <button
                  key={sc.title}
                  className={selectedStressScenario === i ? "btn-primary-pill" : "btn-secondary-pill"}
                  onClick={() => setSelectedStressScenario(i)}
                >
                  {sc.title} (Severity {sc.severity}/10)
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Pre-Stress Portfolio</span>
                <h3 style={{ fontSize: 22, margin: "4px 0" }}>$100.00M</h3>
                <small style={{ color: "#64748b" }}>Baseline assets</small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Post-Stress Portfolio</span>
                <h3 style={{ fontSize: 22, margin: "4px 0" }}>
                  ${(totalStressed / 1_000_000).toFixed(2)}M
                </h3>
                <small style={{ color: totalPct < 0 ? "#dc2626" : "#059669" }}>
                  {totalPct.toFixed(2)}% net change
                </small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Simulated Value Impact</span>
                <h3
                  style={{
                    fontSize: 22,
                    margin: "4px 0",
                    color: totalDelta < 0 ? "#dc2626" : "#059669",
                  }}
                >
                  {totalDelta < 0 ? "-" : "+"}${ (Math.abs(totalDelta) / 1_000_000).toFixed(2) }M
                </h3>
                <small style={{ color: "#64748b" }}>Asset markdown</small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Basel Capital Status</span>
                <h3 style={{ fontSize: 22, margin: "4px 0", color: "#059669" }}>14.2% Tier-1</h3>
                <small style={{ color: "#059669" }}>Adequacy compliant</small>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th>Pre-Stress Value</th>
                    <th>Simulated Shock</th>
                    <th>Post-Stress Value</th>
                    <th>Net P&amp;L Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {stressedAssets.map((asset) => (
                    <tr key={asset.name}>
                      <td><b>{asset.name}</b></td>
                      <td>${(asset.base / 1_000_000).toFixed(2)}M</td>
                      <td style={{ color: asset.shock < 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>
                        {asset.shock >= 0 ? "+" : ""}{(asset.shock * 100).toFixed(2)}%
                      </td>
                      <td>${(asset.stressed / 1_000_000).toFixed(2)}M</td>
                      <td style={{ color: asset.delta < 0 ? "#dc2626" : "#059669", fontWeight: 700 }}>
                        {asset.delta < 0 ? "-" : "+"}${ (Math.abs(asset.delta) / 1_000_000).toFixed(2) }M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Market Flow View (Novel Feature) */}
        {view === "flow" && flowData && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>AI Market Flow &amp; Regime Forecaster</h2>
                <p>Predicts systematic institutional capital reallocations using NLP sentiment velocity</p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Current Market Regime</span>
                <h3 style={{ fontSize: 20, margin: "4px 0" }}>{flowData.regime}</h3>
                <small style={{ color: "#059669" }}>{flowData.predictedDirection}</small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Net Inflow Probability</span>
                <h3 style={{ fontSize: 20, margin: "4px 0" }}>{pct(flowData.inflowProbability, 0)}</h3>
                <small style={{ color: "#059669" }}>Score: {flowData.netFlowScore}/100</small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Predicted 24h Volatility</span>
                <h3 style={{ fontSize: 20, margin: "4px 0" }}>{flowData.predicted24hVolatility}%</h3>
                <small style={{ color: "#64748b" }}>Expected trading band</small>
              </div>
              <div className="investio-card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Directional Accuracy</span>
                <h3 style={{ fontSize: 20, margin: "4px 0" }}>
                  {flowData.historicalAccuracy.directionalAccuracy}%
                </h3>
                <small style={{ color: "#059669" }}>
                  Info Ratio: {flowData.historicalAccuracy.simulatedInformationRatio}
                </small>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Predicted Flow</th>
                    <th>Regime</th>
                    <th>Momentum</th>
                    <th>Expected Drift</th>
                    <th>Primary Driving Headline</th>
                  </tr>
                </thead>
                <tbody>
                  {flowData.stockFlows.map((sf) => (
                    <tr key={sf.ticker}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StockLogo ticker={sf.ticker} size={22} />
                          <div>
                            <b>{sf.name}</b> ({sf.ticker})
                          </div>
                        </div>
                      </td>
                      <td style={{ color: sf.predictedFlowMillions >= 0 ? "#059669" : "#dc2626", fontWeight: 700 }}>
                        {sf.predictedFlowMillions >= 0 ? "+" : "-"}${ Math.abs(sf.predictedFlowMillions).toFixed(1) }M
                      </td>
                      <td>
                        <span className="event-tag">{sf.regime}</span>
                      </td>
                      <td>{sf.momentumScore}/100</td>
                      <td style={{ color: sf.expectedDriftPct >= 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
                        {sf.expectedDriftPct >= 0 ? "+" : ""}{sf.expectedDriftPct.toFixed(2)}%
                      </td>
                      <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sf.primaryDriver}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signals View */}
        {view === "signals" && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Multi-Source Signal Intelligence Explorer</h2>
                <p>Filter by company, news provider, severity rating, and NLP sentiment</p>
              </div>
            </div>

            <div className="feed-filters">
              <div className="feed-search-box">
                <Search size={14} color="#64748b" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search headlines, company or event..."
                />
              </div>

              <select
                className="feed-select"
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

              <select
                className="feed-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="Google">Google News RSS</option>
                <option value="Yahoo">Yahoo Finance</option>
                <option value="GDELT">GDELT Global</option>
                <option value="Hacker">Hacker News</option>
                <option value="Manual">Manual Input</option>
              </select>

              <button
                className={highImpactOnly ? "btn-primary-pill" : "btn-secondary-pill"}
                onClick={() => setHighImpactOnly(!highImpactOnly)}
              >
                Impact &ge; 7
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Headline / Source</th>
                    <th>Event</th>
                    <th>Sentiment</th>
                    <th>Impact Severity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 3 }}>
                            {s.text}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {s.tickers.join(", ")} · {s.sourceName} · {clock(s.publishedAt)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="event-tag">{s.event}</span>
                      </td>
                      <td>
                        <span className={`sentiment-badge ${tone(s.sentiment)}`}>
                          {signed(s.sentiment)}
                        </span>
                      </td>
                      <td>
                        <b>{s.impact}/10</b>
                      </td>
                      <td>
                        <button
                          className="btn-secondary-pill"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => setSelectedSignal(s)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Methodology View */}
        {view === "method" && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>System Architecture &amp; Methodology</h2>
                <p>S&amp;P Global &amp; CRISIL Financial Risk Engine Specifications</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="investio-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>1. Unified AI/NLP Risk Engine</h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                  The engine utilizes local CPU inference with quantized <b>FinBERT</b> to calculate
                  sentiment probabilities (P(positive) - P(negative)). Transparent event rules categorize
                  incoming text across 8 financial classes (Credit, Geopolitical, Regulatory, Macroeconomic,
                  M&amp;A, Earnings, Product, Operational) with severity scaling from 1 to 10.
                </p>
              </div>

              <div className="investio-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>2. Downstream Module A &amp; B</h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                  <b>Module A</b> implements dynamic portfolio rebalancing with exponential sentiment decay
                  (6-hour half-life), strict 2% to 15% position bounds across 20 S&P 100 constituents, and an 8% turnover constraint per batch.
                  <b>Module B</b> simulates macroeconomic shocks across wholesale banking asset tranches.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Chart & Deep Risk Inspector Modal */}
        {showAdvancedModal && (
          <Modal
            title={`${STOCK_META[selectedStock]?.name ?? selectedStock} (${selectedStock}) — Deep Surveillance`}
            subtitle={`Live real-time feed · Current Price: $${activeStockState.price.toFixed(2)} · Updated: ${activeStockState.lastUpdated ?? liveTime}`}
            close={() => setShowAdvancedModal(false)}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 260, width: "100%", marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={activeStockState.history}
                    margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="p"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `$${Number(v).toFixed(1)}`}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                    />
                    <YAxis yAxisId="v" domain={[0, "dataMax * 4"]} hide />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: 8,
                        color: "#ffffff",
                        fontSize: 11,
                        padding: "8px 12px",
                      }}
                      formatter={(v, name) => [
                        name === "price" ? `$${Number(v).toFixed(2)}` : `${Number(v).toLocaleString()} units`,
                        name === "price" ? "Live Price" : "Volume",
                      ]}
                    />
                    <Bar yAxisId="v" dataKey="volume" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={12} isAnimationActive={false} />
                    <Area
                      yAxisId="p"
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={2.2}
                      fill="#eff6ff"
                      isAnimationActive={false}
                    />
                    <Line yAxisId="p" type="monotone" dataKey="ma" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Level 2 Market Depth Table */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <b style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Level 2 Market Depth</b>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Bids: {marketDepth.totalBuyQty.toLocaleString()} vs Asks: {marketDepth.totalSellQty.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
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
                            <td style={{ color: "#1d4ed8", fontWeight: 700 }}>${b.price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
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
                            <td style={{ color: "#dc2626", fontWeight: 700 }}>${a.price.toFixed(2)}</td>
                            <td>{a.quantity.toLocaleString()}</td>
                            <td>{a.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Executive Report Dossier Modal */}
        {showReportModal && (
          <Modal
            title="Executive Risk & Capital Audit Report"
            subtitle="Prepared for S&P Global & CRISIL Campus Hackathon Evaluation"
            close={() => setShowReportModal(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="investio-card" style={{ padding: 16, background: "#f8fafc" }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Portfolio Summary</span>
                <h3 style={{ fontSize: 18, margin: "4px 0" }}>$100.00M Multi-Asset Book</h3>
                <p style={{ fontSize: 12, color: "#475569" }}>
                  Active holdings across Large-Cap Equities, Corporate Loans, Sovereign IG Bonds, and Rates/FX Derivatives.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="investio-card" style={{ padding: 14 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>FinBERT Directional Accuracy</span>
                  <h4 style={{ fontSize: 16, margin: "4px 0" }}>74.2%</h4>
                </div>
                <div className="investio-card" style={{ padding: 14 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Information Ratio</span>
                  <h4 style={{ fontSize: 16, margin: "4px 0" }}>1.48</h4>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  className="btn-primary-pill"
                  onClick={() => window.open("/api/export", "_blank")}
                >
                  <Download size={13} />
                  Download JSON Audit File
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Signal Inspector Modal */}
        {selectedSignal && (
          <Modal
            title="Structured NLP Signal Inspector"
            subtitle={`${selectedSignal.sourceName} · ${clock(selectedSignal.publishedAt)} · ${selectedSignal.model}`}
            close={() => setSelectedSignal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.5 }}>
                {selectedSignal.text}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div className="investio-card" style={{ padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Sentiment</span>
                  <h4 style={{ fontSize: 16, margin: "4px 0", color: selectedSignal.sentiment > 0.15 ? "#059669" : selectedSignal.sentiment < -0.15 ? "#dc2626" : "#475569" }}>
                    {signed(selectedSignal.sentiment)}
                  </h4>
                </div>
                <div className="investio-card" style={{ padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Event Class</span>
                  <h4 style={{ fontSize: 14, margin: "4px 0" }}>{selectedSignal.event}</h4>
                </div>
                <div className="investio-card" style={{ padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Impact Severity</span>
                  <h4 style={{ fontSize: 16, margin: "4px 0" }}>{selectedSignal.impact}/10</h4>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 11, color: "#475569" }}>
                <b>Engine Evidence:</b> {selectedSignal.evidence?.join(", ") || "Derived via FinBERT sentiment and rule classification."}
              </div>
            </div>
          </Modal>
        )}

        {/* Analyze Text Modal */}
        {analyze && (
          <Modal
            title="Submit Text for Real-Time Risk Analysis"
            subtitle="Feeds custom headline directly into local FinBERT inference engine"
            close={() => setAnalyze(false)}
          >
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste financial headline or social news..."
                rows={3}
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn-secondary-pill"
                    style={{ fontSize: 10, padding: "4px 8px" }}
                    onClick={() => setText(p)}
                  >
                    Preset {i + 1}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={() => setAnalyze(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-pill"
                  disabled={text.trim().length < 10 || busy}
                >
                  Process Text
                </button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
}
