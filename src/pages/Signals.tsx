import { useState, type FormEvent } from "react";
import { Download, Search, Send, X } from "lucide-react";
import { EVENTS, STOCKS, type Dashboard } from "../../shared/types";
import { SignalCard } from "../components/SignalCard";
import { StockLogo } from "../StockLogo";
import { api } from "../lib/api";

export function Signals({
  data,
  ticker,
  setTicker,
  reload,
}: {
  data: Dashboard;
  ticker: string;
  setTicker: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [event, setEvent] = useState("All events");
  const [source, setSource] = useState("All sources");
  const [sort, setSort] = useState("Newest first");
  const [distinct, setDistinct] = useState(true);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const filtered = data.signals
    .filter(
      (s) =>
        (!query ||
          `${s.text} ${s.tickers.join(" ")} ${s.topic?.label}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!ticker || s.tickers.includes(ticker as (typeof s.tickers)[number])) &&
        (event === "All events" || s.event === event) &&
        (source === "All sources" || s.sourceKind === source) &&
        (!distinct || !s.duplicateOf),
    )
    .sort((a, b) =>
      sort === "Highest impact"
        ? b.impact - a.impact
        : Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const result = await api<{ added: number }>("analyze", {
        text,
        sourceKind: "manual",
        sourceName: "Pasted headline",
        ...(url ? { sourceUrl: url } : {}),
      });
      setMessage(
        result.added
          ? "Headline analyzed and added to this workspace."
          : "This headline is already in your feed.",
      );
      setText("");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            NEWS + COMMUNITY · STRUCTURED INTELLIGENCE
          </span>
          <h1>Signal feed</h1>
          <p>
            Every score leads back to its source, model output, and assumptions.
          </p>
        </div>
        <a className="button secondary" href="/api/export" download>
          <Download size={16} /> Export JSON
        </a>
      </div>
      <div className="filter-bar">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Search headlines"
            placeholder="Search a headline, company or topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter company"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        >
          <option value="">All companies</option>
          {STOCKS.map((s) => (
            <option key={s.ticker}>{s.ticker}</option>
          ))}
        </select>
        <select
          aria-label="Filter event"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        >
          {["All events", ...EVENTS].map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select
          aria-label="Filter source type"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {["All sources", "news", "social", "manual"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {ticker && (
          <div
            className="chip active"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            <StockLogo ticker={ticker} size={16} />
            <span>{ticker}</span>
            <button
              onClick={() => setTicker("")}
              style={{ border: 0, background: "none", padding: 0, cursor: "pointer", display: "flex", color: "inherit" }}
              title="Clear company filter"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="row between feed-toolbar">
        <span className="small muted">
          {filtered.length} signals match your filters
        </span>
        <div className="row">
          <label className="check-label">
            <input
              type="checkbox"
              checked={distinct}
              onChange={(e) => setDistinct(e.target.checked)}
            />
            Distinct stories
          </label>
          <select
            aria-label="Sort signals"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Newest first</option>
            <option>Highest impact</option>
          </select>
        </div>
      </div>
      <div className="feed-grid">
        <div className="panel feed-list">
          {filtered.length ? (
            filtered
              .slice(0, 100)
              .map((s) => <SignalCard key={s.id} signal={s} />)
          ) : (
            <div className="empty">
              <Search size={30} />
              <h3>No matching signals yet</h3>
              <p>Try another filter, fetch live news, or analyze a headline.</p>
            </div>
          )}
          {filtered.length > 100 && (
            <p className="small muted">
              Showing the first 100 matches. Narrow the filters or export the
              full workspace.
            </p>
          )}
        </div>
        <aside className="stack">
          <form className="panel compose" onSubmit={submit}>
            <span className="eyebrow">BRING YOUR OWN HEADLINE</span>
            <h2>Analyze a headline</h2>
            <label htmlFor="headline-text">Headline or short article</label>
            <textarea
              id="headline-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a current financial headline…"
              minLength={10}
              maxLength={6000}
              required
              rows={6}
            />
            <label htmlFor="headline-url">
              Source link <span className="muted">(optional)</span>
            </label>
            <input
              id="headline-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="small muted">
              Added to the {data.mode} workspace as a manual submission with the
              current time. Use the what-if sandbox for hypothetical events.
            </p>
            <button
              className="button dark full"
              disabled={sending || data.busy || !data.ready}
            >
              <Send size={15} />
              {sending ? "Analyzing…" : "Analyze headline"}
            </button>
            {message && (
              <p className="small" role="status">
                {message}
              </p>
            )}
          </form>
        </aside>
      </div>
    </>
  );
}
