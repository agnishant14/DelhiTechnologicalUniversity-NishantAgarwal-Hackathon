import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Radio,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import type { Dashboard } from "../shared/types";
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
  { id: "index", label: "Index lab", path: "/tacticalindex" },
  { id: "stress", label: "Stress studio", path: "/stress" },
  { id: "signals", label: "Signals", path: "/signals" },
  { id: "model", label: "Model lab", path: "/model" },
];
const fromPath = () =>
  PAGES.find((p) => p.path === window.location.pathname)?.id ?? "overview";
export default function App() {
  const [page, setPage] = useState(fromPath);
  const [data, setData] = useState<Dashboard>();
  const [stress, setStress] = useState<StressDashboard>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [ticker, setTicker] = useState("");
  const reload = useCallback(async () => {
    const [dashboard, book] = await Promise.all([
      api<Dashboard>("dashboard"),
      api<StressDashboard>("stress"),
    ]);
    setData(dashboard);
    setStress(book);
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
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            g<span>↗</span>
          </span>
          GoRisk<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main navigation">
          {PAGES.map((p) => (
            <a
              key={p.id}
              href={p.path}
              className={page === p.id ? "active" : ""}
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
        <a
          className="github-link"
          href="https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon"
          target="_blank"
          rel="noreferrer"
        >
          Source <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
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
              <RefreshCw size={15} className={busy ? "spin" : ""} />
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
              <SlidersHorizontal size={15} /> What-if
            </button>
          </div>
        </div>
        {error && (
          <p className="error-banner" role="alert">
            {error}. Check that the API is running.
          </p>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              ×
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
          <div className="demo-banner">
            <Radio size={15} /> Demo workspace · Fictional headlines with
            simulated timestamps. Live news is kept separately.
          </div>
        )}
        {!data ? (
          <div className="loading-screen">
            <span className="brand-mark">g↗</span>
            <h1>Finding the signal…</h1>
            <p>Connecting to your risk workspace.</p>
          </div>
        ) : (
          <div className="page-content" key={page}>
            {page === "overview" && (
              <Overview
                data={data}
                stress={stress}
                navigate={navigate}
                openSandbox={() => setSandbox(true)}
                selectTicker={(value) => {
                  setTicker(value);
                  navigate("signals");
                }}
              />
            )}
            {page === "index" && <IndexLab data={data} />}
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
        <footer>
          <div>
            <b>GoRisk.</b>
            <span>News & portfolio intelligence</span>
          </div>
          <span>
            Hackathon prototype · Synthetic portfolios · No trade execution
          </span>
          <a
            href="https://github.com/agnishant14/DelhiTechnologicalUniversity-NishantAgarwal-Hackathon#4-quickstart--installation"
            target="_blank"
            rel="noreferrer"
          >
            How it works <ExternalLink size={12} />
          </a>
        </footer>
      </main>
      {sandbox && <Sandbox close={() => setSandbox(false)} />}
    </div>
  );
}
