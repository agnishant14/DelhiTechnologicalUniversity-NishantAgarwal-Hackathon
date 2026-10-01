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
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  ExternalLink,
  Globe2,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
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
  type Signal,
  type Ticker,
} from "../shared/types";

type View = "overview" | "signals" | "portfolio" | "sources" | "method";
const COLORS = [
  "#c3ee86",
  "#92b9e7",
  "#95d5be",
  "#e7bd82",
  "#b2a5e6",
  "#e296b1",
  "#e68a83",
  "#75afb4",
  "#c5b67b",
  "#a8b8cc",
];
const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
const tone = (n: number) =>
  n > 0.15 ? "positive" : n < -0.15 ? "negative" : "neutral";
const clock = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
const tabs: { id: View; name: string; icon: typeof Activity }[] = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "signals", name: "Signal explorer", icon: Radio },
  { id: "portfolio", name: "Index portfolio", icon: Layers3 },
  { id: "sources", name: "Data sources", icon: Database },
  { id: "method", name: "Methodology", icon: BookOpen },
];

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
    throw new Error(
      "The API is unavailable. Check that the server is running.",
    );
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
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <span className="eyebrow">SIGNAL INTELLIGENCE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
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
      <div className="detail-labels">
        <span className="tag">
          {s.isSample
            ? "Fictional demo"
            : s.sourceKind === "manual"
              ? "Manual input"
              : "Live source"}
        </span>
        {s.tickers.map((t) => (
          <span key={t} className="ticker-tag">
            {t}
          </span>
        ))}
      </div>
      <h3 className="detail-headline">{s.text}</h3>
      <div className="detail-scores">
        <div>
          <span>Sentiment</span>
          <strong className={tone(s.sentiment)}>{signed(s.sentiment)}</strong>
        </div>
        <div>
          <span>Impact estimate</span>
          <strong>
            {s.impact}
            <small>/10</small>
          </strong>
        </div>
        <div>
          <span>Model confidence</span>
          <strong>
            {s.confidence === null ? "N/A" : pct(s.confidence, 0)}
          </strong>
        </div>
      </div>
      <div className="detail-event">
        <span>Event classification</span>
        <span className="tag">{s.event}</span>
      </div>
      <h4>How this was scored</h4>
      <ul className="evidence">
        {s.evidence.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      {s.probabilities && (
        <div className="probabilities">
          {Object.entries(s.probabilities).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <div className="prob-track">
                <i
                  style={{
                    width: pct(value),
                    background:
                      label === "positive"
                        ? "#c3ee86"
                        : label === "negative"
                          ? "#e68a83"
                          : "#8192a0",
                  }}
                />
              </div>
              <b>{pct(value)}</b>
            </div>
          ))}
        </div>
      )}
      <p className="fineprint">
        Impact is a rule-based severity estimate. Model confidence describes the
        sentiment classification, not the probability of a market move.
      </p>
      <div className="dialog-actions">
        <button className="button secondary" onClick={() => setJson(!json)}>
          <Database size={15} />
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
      {json && <pre className="json-output">{JSON.stringify(s, null, 2)}</pre>}
    </Modal>
  );
}

function WeightChart({ data }: { data: Dashboard }) {
  const [selected, setSelected] = useState<Ticker[]>([
    "AAPL",
    "NVDA",
    "TSLA",
    "JPM",
  ]);
  const history = data.history.map((s, i) => ({
    step: i,
    ...Object.fromEntries(
      Object.entries(s.weights).map(([k, v]) => [k, v * 100]),
    ),
  }));
  return (
    <section className="panel weight-chart">
      <div className="panel-head">
        <div>
          <h2>
            Allocation over time <span className="small-tag">MODULE A</span>
          </h2>
          <p>How the index responds to new risk signals</p>
        </div>
        <span className="tag subtle">
          {Math.max(data.history.length - 1, 0)} rebalances
        </span>
      </div>
      <div className="chart-meta">
        <strong>
          100<span>%</span>
        </strong>
        <span>allocated across 10 stocks</span>
        <span className="chart-note">
          <i />
          10% starting weight
        </span>
      </div>
      <div className="line-chart" aria-label="Stock weights across rebalances">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={history}
            margin={{ top: 12, right: 14, bottom: 5, left: -24 }}
          >
            <CartesianGrid
              stroke="#26302f"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="step"
              tick={{ fill: "#778681", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
              tickFormatter={(v) => (Number(v) === 0 ? "START" : `R${v}`)}
            />
            <YAxis
              domain={[0, 20]}
              ticks={[0, 5, 10, 15, 20]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#778681", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#19221f",
                border: "1px solid #354338",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelFormatter={(v) =>
                Number(v) === 0 ? "Starting allocation" : `Rebalance ${v}`
              }
              formatter={(v) => `${Number(v).toFixed(2)}%`}
            />
            <ReferenceLine y={10} stroke="#68706c" strokeDasharray="4 5" />
            {STOCKS.map(
              (s, i) =>
                selected.includes(s.ticker) && (
                  <Line
                    key={s.ticker}
                    type="linear"
                    dataKey={s.ticker}
                    stroke={COLORS[i]}
                    strokeWidth={2.1}
                    dot={history.length < 3 ? { r: 3 } : false}
                    activeDot={{ r: 4, strokeWidth: 3, stroke: "#0c1115" }}
                    isAnimationActive={false}
                  />
                ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {STOCKS.map((s, i) => (
          <button
            key={s.ticker}
            aria-pressed={selected.includes(s.ticker)}
            className={selected.includes(s.ticker) ? "selected" : ""}
            onClick={() =>
              setSelected((old) =>
                old.includes(s.ticker)
                  ? old.filter((t) => t !== s.ticker)
                  : [...old, s.ticker],
              )
            }
          >
            <i style={{ background: COLORS[i] }} />
            {s.ticker}
          </button>
        ))}
      </div>
    </section>
  );
}

function SentimentPanel({ signals }: { signals: Signal[] }) {
  const counts = ["positive", "neutral", "negative"].map(
    (label) => signals.filter((s) => s.sentimentLabel === label).length,
  );
  const colors = ["#c3ee86", "#768884", "#e68a83"];
  const total = signals.length;
  let offset = 0;
  return (
    <section className="panel sentiment-panel">
      <div className="panel-head">
        <div>
          <h2>Market sentiment</h2>
          <p>Distribution of analyzed signals</p>
        </div>
        <Activity size={17} className="muted" />
      </div>
      <div className="donut-wrap">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`${counts[0]} positive, ${counts[1]} neutral, ${counts[2]} negative signals`}
        >
          <circle
            cx="100"
            cy="100"
            r="77"
            fill="none"
            stroke="#25302b"
            strokeWidth="16"
          />
          {counts.map((count, i) => {
            const length = total ? (count / total) * 483.8 : 0;
            const start = offset;
            offset += length;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r="77"
                fill="none"
                stroke={colors[i]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, length - (count ? 5 : 0))} ${483.8 - Math.max(0, length - (count ? 5 : 0))}`}
                strokeDashoffset={-start}
                transform="rotate(-90 100 100)"
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>total signals</span>
        </div>
      </div>
      <div className="sentiment-legend">
        {["Positive", "Neutral", "Negative"].map((label, i) => (
          <div key={label}>
            <span>
              <i style={{ background: colors[i] }} />
              {label}
            </span>
            <b>{counts[i]}</b>
            <small>{total ? Math.round((counts[i] / total) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Feed({
  data,
  full = false,
  select,
  expand,
}: {
  data: Dashboard;
  full?: boolean;
  select: (s: Signal) => void;
  expand: () => void;
}) {
  const [search, setSearch] = useState(""),
    [event, setEvent] = useState("all"),
    [sentiment, setSentiment] = useState("all"),
    [source, setSource] = useState("all");
  const filtered = data.signals.filter(
    (s) =>
      `${s.text} ${s.tickers.join(" ")} ${s.sourceName}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (event === "all" || s.event === event) &&
      (sentiment === "all" || s.sentimentLabel === sentiment) &&
      (source === "all" || s.sourceKind === source),
  );
  const visible = full ? filtered : filtered.slice(0, 6);
  return (
    <section className="panel feed-panel">
      <div className="panel-head">
        <div>
          <h2>
            Signal feed <span className="count">{data.signals.length}</span>
          </h2>
          <p>Every headline, translated into a clearer signal</p>
        </div>
        {!full && (
          <button className="text-button" onClick={expand}>
            View all <ArrowRight size={15} />
          </button>
        )}
      </div>
      <div className="feed-filters">
        <label className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies or headlines…"
            aria-label="Search signals"
          />
        </label>
        <label className="select-box">
          <SlidersHorizontal size={14} />
          <select
            aria-label="Filter by event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="all">All events</option>
            {EVENTS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        {full && (
          <>
            <select
              aria-label="Filter by sentiment"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
            >
              <option value="all">All sentiments</option>
              <option>positive</option>
              <option>neutral</option>
              <option>negative</option>
            </select>
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">All sources</option>
              <option>news</option>
              <option>social</option>
              <option>manual</option>
            </select>
          </>
        )}
      </div>
      <div className="table-scroll">
        <table className="signal-table">
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
            {visible.map((s) => (
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
                        onClick={() => select(s)}
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
                        {s.isSample && (
                          <span className="sample-mark">SAMPLE</span>
                        )}
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
                  <span className={`sentiment-value ${tone(s.sentiment)}`}>
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
                  <div className={`impact ${s.impact > 7 ? "high" : ""}`}>
                    <b>
                      {s.impact}
                      <span>/10</span>
                    </b>
                    <div>
                      {Array.from({ length: 5 }, (_, i) => (
                        <i
                          key={i}
                          className={
                            i < Math.ceil(s.impact / 2) ? "filled" : ""
                          }
                        />
                      ))}
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    aria-label={`Details for ${s.tickers.join(", ") || "market"} signal`}
                    className="icon-button"
                    onClick={() => select(s)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <div className="empty">
          <Radio size={26} />
          <h3>No signals found</h3>
          <p>
            {data.signals.length
              ? "Try another search or filter."
              : "Fetch live sources or analyze a headline to get started."}
          </p>
        </div>
      )}
      <div className="panel-foot">
        <span>
          {visible.length} of {filtered.length} signals
        </span>
        <span>
          <ShieldCheck size={13} />
          Source-linked. Deduplicated. Explainable.
        </span>
      </div>
    </section>
  );
}

function Holdings({ data }: { data: Dashboard }) {
  const [sort, setSort] = useState<"weight" | "name">("weight");
  const rows = [...data.holdings].sort((a, b) =>
    sort === "weight" ? b.weight - a.weight : a.name.localeCompare(b.name),
  );
  return (
    <section className="panel holdings-panel">
      <div className="panel-head">
        <div>
          <h2>The index, at a glance</h2>
          <p>A synthetic basket of 10 large-cap US stocks</p>
        </div>
        <select
          aria-label="Sort holdings"
          value={sort}
          onChange={(e) => setSort(e.target.value as "weight" | "name")}
        >
          <option value="weight">By allocation</option>
          <option value="name">By company</option>
        </select>
      </div>
      <div className="allocation-strip">
        {data.holdings.map((h, i) => (
          <div
            key={h.ticker}
            style={{ width: pct(h.weight), background: COLORS[i] }}
            title={`${h.ticker}: ${pct(h.weight)}`}
          />
        ))}
      </div>
      <div className="table-scroll">
        <table className="holdings-table">
          <thead>
            <tr>
              <th>COMPANY</th>
              <th>SECTOR</th>
              <th>ALLOCATION</th>
              <th>LAST CHANGE</th>
              <th>SENTIMENT</th>
              <th>SIGNALS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const delta = (h.weight - h.previousWeight) * 100;
              return (
                <tr key={h.ticker}>
                  <td>
                    <div className="company">
                      <span
                        className="company-logo"
                        style={{
                          color:
                            COLORS[
                              STOCKS.findIndex((s) => s.ticker === h.ticker)
                            ],
                        }}
                      >
                        {h.ticker.slice(0, 1)}
                      </span>
                      <div>
                        <b>{h.ticker}</b>
                        <span>{h.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{h.sector}</td>
                  <td>
                    <div className="weight-cell">
                      <b>{pct(h.weight, 2)}</b>
                      <div className="weight-track">
                        <i style={{ width: pct(h.weight / 0.2) }} />
                      </div>
                    </div>
                  </td>
                  <td
                    className={
                      delta > 0.005
                        ? "positive"
                        : delta < -0.005
                          ? "negative"
                          : "muted"
                    }
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(2)} <small>pp</small>
                  </td>
                  <td className={tone(h.sentiment)}>{signed(h.sentiment)}</td>
                  <td className="muted">{h.signalCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="panel-foot">
        <span>5–20% per holding · 8% maximum turnover</span>
        <b>
          Total allocation:{" "}
          {pct(
            data.holdings.reduce((sum, h) => sum + h.weight, 0),
            2,
          )}
        </b>
      </div>
    </section>
  );
}

function SourceCards({ data }: { data: Dashboard }) {
  return (
    <div className="source-cards">
      {data.sources.map((source) => (
        <div className="source-card" key={source.name}>
          <div className="source-card-top">
            <span className="source-large-icon">
              {source.kind === "news" ? (
                <Newspaper size={23} />
              ) : (
                <MessageSquare size={23} />
              )}
            </span>
            <span
              className={`status-pill ${source.status === "error" ? "warning" : ""}`}
            >
              <i />
              {source.status === "error"
                ? "Unavailable"
                : source.status === "idle"
                  ? "Not fetched"
                  : data.mode === "demo"
                    ? "Sample source"
                    : "Connected"}
            </span>
          </div>
          <h3>{source.name}</h3>
          <p>
            {source.kind === "news"
              ? "Financial headlines and market events"
              : "Community posts and market conversations"}
          </p>
          <div className="source-card-bottom">
            <span>{source.fetched} documents</span>
            <span>Last fetch {clock(source.lastFetched)}</span>
          </div>
          {source.error && <p className="negative">{source.error}</p>}
        </div>
      ))}
    </div>
  );
}

function Methodology() {
  return (
    <div className="method-grid">
      {[
        [
          "01",
          "Collect & clean",
          "News RSS and Hacker News supply timestamped text. Exact normalized duplicates are removed. Demo scenarios are fictional and stored separately from live signals.",
        ],
        [
          "02",
          "Understand the text",
          "FinBERT estimates positive, negative and neutral probabilities. Sentiment is P(positive) − P(negative). Company names and ticker aliases map the text to the index.",
        ],
        [
          "03",
          "Estimate the risk",
          "Transparent keyword rules assign an event category. An event base score, sentiment intensity, severity and uncertainty cues produce an impact estimate from 1 to 10. This is not a calibrated market forecast.",
        ],
        [
          "04",
          "Adjust the index",
          "Recent company sentiment is averaged with a six-hour half-life and a 24-hour window. Social posts receive 60% of the weight of news. Holdings are normalized to 100%, bounded to 5–20%, with turnover capped at 8%.",
        ],
      ].map(([n, title, body]) => (
        <section className="panel method-card" key={n}>
          <span className="method-number">{n}</span>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section className="panel limitations">
        <h2>Know the limits</h2>
        <p>
          This prototype demonstrates risk signals and allocation changes. It
          does not execute trades, forecast returns, calculate portfolio P&L, or
          implement Module B. Sentiment is assigned at document level, so
          different companies in the same headline share a score. Entity
          matching can be ambiguous. FinBERT reads at most 512 tokens and can
          misread sarcasm, context, and social slang.
        </p>
        <p>
          Positive sentiment increases a stock’s target relative to its raw
          baseline; normalization and existing holdings can affect the final
          direction. The impact score is a documented heuristic. An unavailable
          model activates a clearly labelled lexicon fallback. Feed polling
          occurs every five minutes in live mode.
        </p>
        <a
          href="https://huggingface.co/ProsusAI/finbert"
          target="_blank"
          rel="noreferrer"
        >
          About the FinBERT model <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null),
    [view, setView] = useState<View>("overview");
  const [connectionError, setConnectionError] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState("");
  const [selected, setSelected] = useState<Signal | null>(null),
    [analyze, setAnalyze] = useState(false),
    [text, setText] = useState("");
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
      const result = await api<{
        added: number;
        sources: Dashboard["sources"];
      }>("refresh", {});
      const failed = result.sources.filter((s) => s.status === "error");
      setNotice(
        `${result.added} new signals analyzed.${failed.length ? ` ${failed.length} source unavailable; see Data sources.` : ""}`,
      );
    });
  const replay = () =>
    action("replay", async () => {
      const r = await api<{ added: number }>("replay", {});
      setNotice(`${r.added} new demo signals analyzed. Index updated.`);
    });
  const switchMode = () =>
    action("mode", async () => {
      await api("mode", { mode: data?.mode === "demo" ? "live" : "demo" });
      setNotice(
        data?.mode === "demo"
          ? "Live workspace ready. Fetch sources to load current headlines."
          : "Demo workspace restored.",
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
      if (r.signals[0]) setSelected(r.signals[0]);
      else
        setNotice(
          "This headline is already in the feed. No duplicate was added.",
        );
    });
  };
  const busy = !!pending || !!data?.busy || !data?.ready;
  const viewName = tabs.find((t) => t.id === view)!.name;
  const last = data?.history.at(-1);
  const eventCounts = EVENTS.map((event) => ({
    event,
    count: data?.signals.filter((s) => s.event === event).length ?? 0,
  }))
    .filter((e) => e.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
            <Activity size={23} strokeWidth={2.5} />
          </span>
          signaldesk<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">DT</span>
          <div>
            <b>DTU Hackathon</b>
            <span>Research workspace</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-label={name}
              title={name}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {id === "signals" && <small>{data?.stats.total ?? "—"}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-insight">
          <span className="mini-spark">
            <Sparkles size={17} />
          </span>
          <h3>Noise in. Insight out.</h3>
          <p>A clearer connection between the news and your portfolio.</p>
          <button onClick={() => setView("method")}>
            Explore the engine <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="engine-light" />
          <div>
            <b>
              {data?.engine.status === "ready"
                ? "FinBERT online"
                : data?.engine.status === "fallback"
                  ? "Fallback active"
                  : "Engine starting"}
            </b>
            <span>Local inference engine</span>
          </div>
          <ShieldCheck size={17} />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="muted">Workspace</span>
            <ChevronRight size={13} />
            <span>{viewName}</span>
          </div>
          <div>
            <span className="top-date">
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="top-divider" />
            <span className="user-avatar">NA</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                FINANCIAL RISK INTELLIGENCE
              </div>
              <h1>
                {view === "overview"
                  ? "See the signal. Stay ahead."
                  : view === "signals"
                    ? "Every signal tells a story."
                    : view === "portfolio"
                      ? "An index that listens."
                      : view === "sources"
                        ? "Connected to the conversation."
                        : "A transparent path to insight."}
              </h1>
              <p>
                {view === "overview"
                  ? "From unstructured market news to informed portfolio decisions."
                  : view === "signals"
                    ? "Explore the sentiment, event and impact behind every headline."
                    : view === "portfolio"
                      ? "Watch sentiment reshape your synthetic stock allocation."
                      : view === "sources"
                        ? "Two source types. One unified stream of risk intelligence."
                        : "Understand the assumptions behind every score and adjustment."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => setAnalyze(true)}
                disabled={busy}
              >
                <Plus size={16} />
                Analyze text
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  (data?.mode === "demo" &&
                    data.replay.position >= data.replay.total)
                }
                onClick={() =>
                  void (data?.mode === "demo" ? replay() : refresh())
                }
              >
                {pending ? (
                  <LoaderCircle className="spin" size={15} />
                ) : data?.mode === "demo" ? (
                  <Play size={15} fill="currentColor" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {pending
                  ? "Processing…"
                  : data?.mode === "demo"
                    ? data.replay.position >= data.replay.total
                      ? "Replay complete"
                      : "Run next event"
                    : "Fetch live sources"}
              </button>
            </div>
          </div>
          <div className="mode-strip">
            <div>
              <span
                className={`mode-badge ${data?.mode === "live" ? "live" : ""}`}
              >
                {data?.mode === "live" ? (
                  <Globe2 size={13} />
                ) : (
                  <Play size={11} />
                )}
                {data?.mode === "live" ? "LIVE SOURCES" : "DEMO WORKSPACE"}
              </span>
              <span>
                {data?.mode === "live"
                  ? "Current feeds · Auto-refresh every 5 min · Mock portfolio"
                  : "Fictional scenarios. Real NLP analysis. Simulated allocations."}
              </span>
            </div>
            <button disabled={busy} onClick={() => void switchMode()}>
              {data?.mode === "live"
                ? "Switch to demo"
                : "Connect live sources"}
              <ArrowRight size={14} />
            </button>
          </div>
          {(error || connectionError) && (
            <div className="alert" role="alert">
              <CircleHelp size={17} />
              <span>{error || connectionError}</span>
              <button
                aria-label="Dismiss error"
                onClick={() => {
                  setError("");
                  setConnectionError("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {data?.engine.status === "fallback" && (
            <div className="alert">
              <CircleHelp size={17} />
              FinBERT is unavailable. Scores currently use the lower-quality
              lexicon fallback.
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {!data?.ready ? (
            <section className="panel loading">
              <LoaderCircle size={28} className="spin" />
              <h2>Preparing your risk workspace</h2>
              <p>
                {data?.engine.status === "loading"
                  ? "Loading FinBERT. The first run downloads the model and may take a few minutes."
                  : "Connecting to the engine and analyzing the opening scenarios…"}
              </p>
            </section>
          ) : (
            <>
              {(view === "overview" || view === "portfolio") && (
                <div className="metrics">
                  <div className="metric">
                    <div>
                      <span>Signals analyzed</span>
                      <Radio size={16} />
                    </div>
                    <strong>
                      {data.stats.total.toString().padStart(2, "0")}
                    </strong>
                    <p>
                      <span className="positive">
                        {data.sources.length} source streams
                      </span>
                      <span>news + social</span>
                    </p>
                  </div>
                  <div className="metric">
                    <div>
                      <span>Net sentiment</span>
                      <Activity size={16} />
                    </div>
                    <strong className={tone(data.stats.sentiment)}>
                      {signed(data.stats.sentiment)}
                      <span
                        className={`metric-pill ${tone(data.stats.sentiment)}`}
                      >
                        {data.stats.sentiment > 0.15
                          ? "Positive"
                          : data.stats.sentiment < -0.15
                            ? "Negative"
                            : "Mixed"}
                      </span>
                    </strong>
                    <p>
                      <span>Mean across current workspace</span>
                    </p>
                  </div>
                  <div className="metric">
                    <div>
                      <span>High-impact signals</span>
                      <Zap size={16} />
                    </div>
                    <strong>
                      {String(data.stats.highImpact).padStart(2, "0")}
                      <span className="metric-pill caution">Impact &gt; 7</span>
                    </strong>
                    <p>
                      <span>Events that deserve a closer look</span>
                    </p>
                  </div>
                  <div className="metric">
                    <div>
                      <span>Index positions</span>
                      <Layers3 size={16} />
                    </div>
                    <strong>
                      10<span className="metric-small">/ 10</span>
                    </strong>
                    <p>
                      <span className="positive">100% allocated</span>
                      <span>{pct(last?.turnover ?? 0)} last turnover</span>
                    </p>
                  </div>
                </div>
              )}
              {(view === "overview" || view === "portfolio") && (
                <div className="charts-grid">
                  <WeightChart data={data} />
                  <SentimentPanel signals={data.signals} />
                </div>
              )}
              {view === "overview" && (
                <>
                  <div className="feed-grid">
                    <Feed
                      data={data}
                      select={setSelected}
                      expand={() => setView("signals")}
                    />
                    <section className="panel event-panel">
                      <div className="panel-head">
                        <div>
                          <h2>Event landscape</h2>
                          <p>What is moving the conversation</p>
                        </div>
                      </div>
                      <div className="event-bars">
                        {eventCounts.length ? (
                          eventCounts.map((e, i) => (
                            <div key={e.event}>
                              <div>
                                <span>{e.event}</span>
                                <b>{e.count}</b>
                              </div>
                              <div className="event-track">
                                <i
                                  style={{
                                    width: pct(e.count / data.stats.total),
                                    background: COLORS[i],
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="muted">Waiting for signals.</p>
                        )}
                      </div>
                      <div className="feed-status">
                        <span className="eyebrow">SOURCE HEALTH</span>
                        {data.sources.map((s) => (
                          <div key={s.name}>
                            <span>
                              <i
                                className={
                                  s.status === "error" ? "red-dot" : "live-dot"
                                }
                              />
                              {s.name}
                            </span>
                            <span>
                              {s.status === "error"
                                ? "Offline"
                                : s.status === "idle"
                                  ? "Idle"
                                  : "Ready"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setView("sources")}
                      >
                        Manage sources <ArrowUpRight size={14} />
                      </button>
                    </section>
                  </div>
                  <Holdings data={data} />
                </>
              )}
              {view === "signals" && (
                <Feed data={data} full select={setSelected} expand={() => {}} />
              )}
              {view === "portfolio" && <Holdings data={data} />}
              {view === "sources" && (
                <>
                  <SourceCards data={data} />
                  <section className="panel source-explainer">
                    <h2>Fresh information, with a clear trail.</h2>
                    <p>
                      Live mode fetches public news headlines and Hacker News
                      community posts. Each signal retains its source and
                      publication time. Switching workspaces preserves each
                      dataset and its own portfolio history.
                    </p>
                    <div className="pipeline-steps">
                      <span>
                        <Newspaper size={20} />
                        News + social
                      </span>
                      <ArrowRight size={18} />
                      <span>
                        <Sparkles size={20} />
                        FinBERT analysis
                      </span>
                      <ArrowRight size={18} />
                      <span>
                        <BarChart3 size={20} />
                        Index allocation
                      </span>
                    </div>
                    <p className="fineprint">
                      GDELT is available as an alternative news adapter through
                      server configuration. No API key is required for the
                      default sources. External feeds can be delayed or
                      unavailable.
                    </p>
                  </section>
                </>
              )}
              {view === "method" && <Methodology />}
            </>
          )}
          <footer>
            <span>
              <Activity size={13} />
              SignalDesk <span className="footer-dot">·</span>Built for the DTU
              Hackathon
            </span>
            <div>
              <span>Updated {clock(data?.stats.lastUpdated ?? null)}</span>
              <a href="/api/export" download>
                <Download size={13} />
                Export data
              </a>
            </div>
          </footer>
        </main>
      </div>
      {selected && (
        <SignalDetail signal={selected} close={() => setSelected(null)} />
      )}
      {analyze && (
        <Modal
          title="Turn text into a risk signal"
          subtitle="Paste a headline or post. The engine will analyze it and update this workspace’s mock index."
          close={() => setAnalyze(false)}
        >
          <form onSubmit={submit}>
            <label className="form-label" htmlFor="headline">
              Headline or post
            </label>
            <textarea
              id="headline"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              minLength={10}
              maxLength={6000}
              rows={6}
              required
              placeholder="e.g. Apple reports record quarterly profits as revenue beats expectations…"
            />
            <div className="textarea-meta">
              <span>Added as manual input · {data?.mode} workspace</span>
              <span>{text.length}/6000</span>
            </div>
            <p className="fineprint">
              FinBERT scores the text, event rules estimate its severity, and
              matching index stocks are rebalanced.
            </p>
            <div className="dialog-actions">
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
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                Analyze signal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
