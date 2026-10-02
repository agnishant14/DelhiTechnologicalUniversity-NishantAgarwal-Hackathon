import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Radio,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Dashboard, QuotesPayload } from "../shared/types";
import type { StressDashboard } from "../shared/types";
import { api, ago } from "./lib/api";
import { Overview } from "./pages/Overview";
import { IndexLab } from "./pages/IndexLab";
import { StressStudio } from "./pages/StressStudio";
import { Signals } from "./pages/Signals";
import { ModelLab } from "./pages/ModelLab";
import { Sandbox } from "./components/Sandbox";

const PAGES = [
  { id: "overview", label: "Dashboard", path: "/dashboard" },
  { id: "index", label: "Tactical Index", path: "/tacticalindex" },
  { id: "stress", label: "Wholesale Stress", path: "/stress" },
  { id: "signals", label: "Signals", path: "/signals" },
  { id: "model", label: "Model Lab", path: "/model" },
];

const GLOBAL_INDICES = [
  { name: "S&P 500", val: "763.99", delta: "+1.36 (+0.18%)", positive: true },
  { name: "NASDAQ 100", val: "742.03", delta: "+2.26 (+0.31%)", positive: true },
  { name: "DOW JONES", val: "508.62", delta: "+0.07 (+0.01%)", positive: true },
  { name: "CRISIL COMPOSITE", val: "15,540.10", delta: "-18.39 (-0.12%)", positive: false },
  { name: "GOLD (OUNCE)", val: "382.76", delta: "+1.92 (+0.50%)", positive: true },
  { name: "BRENT CRUDE", val: "150.02", delta: "+4.36 (+2.99%)", positive: true },
  { name: "US 10Y YIELD", val: "4.28%", delta: "-0.04 (-0.92%)", positive: false },
];

const fromPath = () =>
  PAGES.find((p) => p.path === window.location.pathname)?.id ?? "overview";

export default function App() {
  const [page, setPage] = useState(fromPath);
  const [data, setData] = useState<Dashboard>();
  const [stress, setStress] = useState<StressDashboard>();
  const [quotes, setQuotes] = useState<QuotesPayload>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [ticker, setTicker] = useState("");
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    const [dashboard, book, quotesData] = await Promise.all([
      api<Dashboard>("dashboard"),
      api<StressDashboard>("stress"),
      api<QuotesPayload>("quotes").catch(() => undefined),
    ]);
    setData(dashboard);
    setStress(book);
    if (quotesData) setQuotes(quotesData);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await reload();
        if (mounted) setError("");
      } catch (e) {
        if (mounted)
          setError(
            e instanceof Error ? e.message : "Could not connect to the API",
          );
      }
      if (mounted) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [reload]);

  useEffect(() => {
    const handle = () => setPage(fromPath());
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);

  function navigate(id: string) {
    setPage(id);
    window.history.pushState(
      {},
      "",
      PAGES.find((p) => p.id === id)?.path ?? "/dashboard",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function action(path: string, body: unknown = {}) {
    setPending(true);
    setNotice("");
    try {
      const result = await api<{ added?: number }>(path, body);
      await reload();
      setNotice(
        result.added !== undefined
          ? `${result.added} new signal${result.added === 1 ? "" : "s"} processed.`
          : "Workspace switched.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  const busy = pending || data?.busy || !data?.ready;
  const highImpactCount =
    data?.signals.filter((s) => s.impact >= 7).length || 2;

  const tickerItems = useMemo(() => {
    if (!quotes) return GLOBAL_INDICES;
    const items = [...quotes.indices];
    const keyTickers = [
      "NVDA",
      "AAPL",
      "MSFT",
      "META",
      "AMZN",
      "GOOGL",
      "TSLA",
      "JPM",
      "XOM",
      "LLY",
    ];
    for (const t of keyTickers) {
      const q = quotes.stocks[t];
      if (q) {
        items.push({
          name: q.ticker,
          symbol: q.symbol,
          val: `$${q.price.toFixed(2)}`,
          delta: `${q.changeAbs >= 0 ? "+" : ""}${q.changeAbs.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%)`,
          positive: q.changePct >= 0,
        });
      }
    }
    return items;
  }, [quotes]);

  return (
    <div className="app-shell">
      {/* Top Header: Investio Dark Slate Bar */}
      <header className="investio-nav">
        <div className="nav-left">
          <div
            className="nav-brand"
            onClick={() => navigate("overview")}
            role="button"
            tabIndex={0}
          >
            <div className="nav-brand-mark">
              <span className="brand-dot-core" />
            </div>
            <span className="nav-brand-name">GoRisk</span>
          </div>

          <div className="nav-divider" />

          <nav className="nav-links" aria-label="Main navigation">
            {PAGES.map((p) => (
              <a
                key={p.id}
                href={p.path}
                className={`nav-link ${page === p.id ? "active" : ""}`}
                aria-current={page === p.id ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(p.id);
                }}
              >
                {p.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="nav-right">
          <div className="nav-search">
            <Search size={13} color="#94a3b8" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a company"
              aria-label="Search for a company or ticker"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="nav-search-clear"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div
            className="nav-alert-badge"
            title={`${highImpactCount} high-severity risk signals detected`}
          >
            {highImpactCount}
          </div>

          <div
            className="nav-user-avatar"
            title="Nishant Agarwal (DTU)"
            onClick={() => navigate("overview")}
          >
            NA
          </div>
          <ChevronDown
            size={11}
            color="#94a3b8"
            style={{ marginLeft: -6, cursor: "pointer", opacity: 0.8 }}
            aria-hidden="true"
          />
        </div>
      </header>

      {/* Global Market Indices Ticker Strip (Continuous Gliding Marquee Loop) */}
      <div
        className="investio-ticker-strip"
        title="Hover to pause ticker glide · Quotes powered by TradingView"
      >
        <div className="ticker-track">
          <div className="ticker-group">
            {tickerItems.map((idx, i) => (
              <div key={`idx-a-${idx.name}-${i}`} className="ticker-item">
                <span className="ticker-name">{idx.name}</span>
                <span className="ticker-val">{idx.val}</span>
                <span
                  className={`ticker-delta ${idx.positive ? "positive" : "negative"}`}
                >
                  {idx.delta}
                </span>
              </div>
            ))}
          </div>
          <div className="ticker-group" aria-hidden="true">
            {tickerItems.map((idx, i) => (
              <div key={`idx-b-${idx.name}-${i}`} className="ticker-item">
                <span className="ticker-name">{idx.name}</span>
                <span className="ticker-val">{idx.val}</span>
                <span
                  className={`ticker-delta ${idx.positive ? "positive" : "negative"}`}
                >
                  {idx.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Page Container */}
      <main className="investio-container">
        {/* Workspace Telemetry & Controls */}
        <div className="workspace-bar">
          <div className="row">
            <div className="mode-toggle" aria-label="Data workspace">
              {["live", "demo"].map((mode) => (
                <button
                  key={mode}
                  className={data?.mode === mode ? "active" : ""}
                  disabled={busy}
                  aria-pressed={data?.mode === mode}
                  onClick={() => void action("mode", { mode })}
                >
                  {mode === "live" ? "Live news" : "Demo"}
                </button>
              ))}
            </div>
            <span className="engine-status">
              <i
                className={`status-dot ${data?.engine.status === "fallback" ? "error" : data?.ready ? "ok" : "idle"}`}
              />
              {data?.engine.model ?? "Connecting"}
            </span>
          </div>

          <div className="row">
            <span className="updated">
              {data?.stats.lastUpdated
                ? `Updated ${ago(data.stats.lastUpdated)}`
                : "Waiting for signals"}
            </span>
            <button
              className="button small-button secondary"
              disabled={
                busy ||
                (data?.mode === "demo" &&
                  data.replay.position >= data.replay.total)
              }
              onClick={() =>
                void action(data?.mode === "demo" ? "replay" : "refresh")
              }
            >
              <RefreshCw size={13} className={busy ? "spin" : ""} />
              {busy
                ? "Processing…"
                : data?.mode === "demo"
                  ? "Replay next events"
                  : "Fetch news"}
            </button>
            <button
              className="button small-button dark"
              aria-label="Open what-if sandbox"
              onClick={() => setSandbox(true)}
            >
              <SlidersHorizontal size={13} /> What-if
            </button>
          </div>
        </div>

        {error && (
          <p className="error-banner" role="alert">
            {error}. Check that the API is running.
          </p>
        )}

        {notice && (
          <div className="investio-toast" role="status">
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {data?.engine.status === "fallback" && (
          <p className="error-banner">
            FinBERT is unavailable. Sentiment uses a word lexicon; trained topic
            classification is still active.
          </p>
        )}

        {data?.mode === "demo" && (
          <div className="investio-toast" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Radio size={14} />
              Demo workspace · Fictional financial headlines with simulated timestamps.
            </span>
          </div>
        )}

        {!data ? (
          <div className="empty">
            <h2>Finding the signal…</h2>
            <p>Connecting to your risk workspace.</p>
          </div>
        ) : (
          <div className="page-content" key={page}>
            {page === "overview" && (
              <Overview
                data={data}
                stress={stress}
                quotes={quotes}
                navigate={navigate}
                openSandbox={() => setSandbox(true)}
                selectTicker={(value) => {
                  setTicker(value);
                  navigate("index");
                }}
                onRunEvent={() =>
                  void action(data.mode === "demo" ? "replay" : "refresh")
                }
                onSwitchMode={() =>
                  void action("mode", {
                    mode: data.mode === "live" ? "demo" : "live",
                  })
                }
                busy={busy}
              />
            )}
            {page === "index" && <IndexLab data={data} quotes={quotes} />}
            {page === "stress" && stress && (
              <StressStudio key={data.mode} data={stress} />
            )}
            {page === "signals" && (
              <Signals
                data={data}
                ticker={ticker}
                setTicker={setTicker}
                reload={reload}
              />
            )}
            {page === "model" && (
              <ModelLab openSandbox={() => setSandbox(true)} />
            )}
          </div>
        )}

        <footer style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
          <div>
            <b style={{ color: "var(--text-main)", marginRight: 8 }}>GoRisk</b>
            <span>AI Risk Surveillance &amp; Portfolio Intelligence</span>
          </div>
          <span>
            S&amp;P Global &amp; CRISIL Campus Hackathon 2026 · Module A &amp; B
          </span>
          <a
            href="https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon"
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--blue)" }}
          >
            GitHub Repository <ExternalLink size={12} />
          </a>
        </footer>
      </main>

      {sandbox && <Sandbox close={() => setSandbox(false)} />}
    </div>
  );
}
