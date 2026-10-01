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

const COLORS = [
  "#2563eb",
  "#0284c7",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#0d9488",
  "#ea580c",
  "#4f46e5",
];

const STOCK_TINTS: Record<string, { bg: string; text: string }> = {
  AAPL: { bg: "#f1f5f9", text: "#0f172a" },
  MSFT: { bg: "#e0f2fe", text: "#0369a1" },
  NVDA: { bg: "#ecfdf5", text: "#047857" },
  AMZN: { bg: "#fffbeb", text: "#b45309" },
  GOOGL: { bg: "#eff6ff", text: "#1d4ed8" },
  META: { bg: "#eff6ff", text: "#1e40af" },
  TSLA: { bg: "#fef2f2", text: "#b91c1c" },
  JPM: { bg: "#f0fdf4", text: "#15803d" },
  XOM: { bg: "#fef2f2", text: "#991b1b" },
  JNJ: { bg: "#fff1f2", text: "#be123c" },
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

const tabs: { id: View; name: string; icon: typeof Activity }[] = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "signals", name: "Signal explorer", icon: Radio },
  { id: "portfolio", name: "Index portfolio", icon: Layers3 },
  { id: "stress", name: "Stress testing", icon: Zap },
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
            <X size={18} />
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
                        ? "#10b981"
                        : label === "negative"
                          ? "#ef4444"
                          : "#94a3b8",
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
  const range = max - min || 0.01;
  const width = 50;
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
    <svg className="stock-sparkline" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StockCardsStrip({
  data,
  selectedTicker,
  onSelectTicker,
}: {
  data: Dashboard;
  selectedTicker: string | null;
  onSelectTicker: (t: string | null) => void;
}) {
  return (
    <div className="stock-cards-strip" aria-label="Index stock portfolio">
      {data.holdings.map((h) => {
        const delta = (h.weight - h.previousWeight) * 100;
        const tint = STOCK_TINTS[h.ticker] ?? {
          bg: "#f1f5f9",
          text: "#0f172a",
        };
        const historyValues = data.history.map(
          (s) => s.weights[h.ticker] ?? 0.1,
        );
        const isSelected = selectedTicker === h.ticker;

        return (
          <div
            key={h.ticker}
            className={`stock-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectTicker(isSelected ? null : h.ticker)}
            title={`Click to filter signals for ${h.ticker}`}
          >
            <div className="stock-card-top">
              <div className="stock-card-info">
                <span
                  className="stock-card-avatar"
                  style={{ background: tint.bg, color: tint.text }}
                >
                  {h.ticker.slice(0, 1)}
                </span>
                <div className="stock-card-names">
                  <b>{h.name}</b>
                  <span>{h.ticker}</span>
                </div>
              </div>
              <MiniSparkline
                values={historyValues}
                positive={delta >= -0.005}
              />
            </div>
            <div className="stock-card-bottom">
              <span className="stock-card-weight">{pct(h.weight, 2)}</span>
              <span
                className={`stock-card-change ${
                  delta > 0.005
                    ? "positive"
                    : delta < -0.005
                      ? "negative"
                      : "neutral"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(2)} pp
              </span>
            </div>
          </div>
        );
      })}
    </div>
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
          <p>Tactical stock index rebalancing driven by real-time NLP sentiment</p>
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
              stroke="#e2e8f0"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="step"
              tick={{ fill: "#64748b", fontSize: 10, fontFamily: "inherit" }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
              tickFormatter={(v) => (Number(v) === 0 ? "START" : `R${v}`)}
            />
            <YAxis
              domain={[0, 20]}
              ticks={[0, 5, 10, 15, 20]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 10, fontFamily: "inherit" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
                color: "#0f172a",
              }}
              labelFormatter={(v) =>
                Number(v) === 0 ? "Starting allocation" : `Rebalance ${v}`
              }
              formatter={(v) => `${Number(v).toFixed(2)}%`}
            />
            <ReferenceLine y={10} stroke="#94a3b8" strokeDasharray="4 4" />
            {STOCKS.map(
              (s, i) =>
                selected.includes(s.ticker) && (
                  <Line
                    key={s.ticker}
                    type="linear"
                    dataKey={s.ticker}
                    stroke={COLORS[i]}
                    strokeWidth={2.2}
                    dot={history.length < 3 ? { r: 3 } : false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
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
  const colors = ["#10b981", "#94a3b8", "#ef4444"];
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
            r="75"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="16"
          />
          {counts.map((count, i) => {
            const length = total ? (count / total) * 471.2 : 0;
            const start = offset;
            offset += length;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke={colors[i]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, length - (count ? 4 : 0))} ${
                  471.2 - Math.max(0, length - (count ? 4 : 0))
                }`}
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
  selectedTicker,
  onClearTicker,
}: {
  data: Dashboard;
  full?: boolean;
  select: (s: Signal) => void;
  expand: () => void;
  selectedTicker?: string | null;
  onClearTicker?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [event, setEvent] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource] = useState("all");
  const [highImpactOnly, setHighImpactOnly] = useState(false);

  const filtered = data.signals.filter((s) => {
    const matchesSearch =
      `${s.text} ${s.tickers.join(" ")} ${s.sourceName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesEvent = event === "all" || s.event === event;
    const matchesSentiment =
      sentiment === "all" || s.sentimentLabel === sentiment;
    const matchesSource = source === "all" || s.sourceKind === source;
    const matchesTicker =
      !selectedTicker || s.tickers.includes(selectedTicker as Ticker);
    const matchesImpact = !highImpactOnly || s.impact >= 7;

    return (
      matchesSearch &&
      matchesEvent &&
      matchesSentiment &&
      matchesSource &&
      matchesTicker &&
      matchesImpact
    );
  });

  const visible = full ? filtered : filtered.slice(0, 6);

  return (
    <section className="panel feed-panel">
      <div className="panel-head">
        <div>
          <h2>
            Signal feed <span className="count">{data.signals.length}</span>
            {selectedTicker && (
              <span className="small-tag" style={{ marginLeft: 6 }}>
                Filter: {selectedTicker}
                <button
                  onClick={onClearTicker}
                  style={{
                    border: 0,
                    background: "none",
                    marginLeft: 4,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            )}
          </h2>
          <p>Real-time unstructured financial news & social intelligence</p>
        </div>
        {!full && (
          <button className="text-button" onClick={expand}>
            View all <ArrowRight size={15} />
          </button>
        )}
      </div>
      <div className="feed-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies, tickers or headlines…"
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
        <button
          className={`tag ${highImpactOnly ? "active" : ""}`}
          style={{
            background: highImpactOnly ? "#fef2f2" : "#ffffff",
            borderColor: highImpactOnly ? "#fecaca" : "#e2e8f0",
            color: highImpactOnly ? "#b91c1c" : "#64748b",
            fontWeight: 600,
            cursor: "pointer",
            height: 34,
          }}
          onClick={() => setHighImpactOnly(!highImpactOnly)}
        >
          <Zap size={13} />
          Impact ≥ 7
        </button>
        {full && (
          <>
            <select
              aria-label="Filter by sentiment"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
            >
              <option value="all">All sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">All sources</option>
              <option value="news">News</option>
              <option value="social">Social</option>
              <option value="manual">Manual</option>
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
                  <div className={`impact ${s.impact >= 7 ? "high" : ""}`}>
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
          <Radio size={24} />
          <h3>No signals found</h3>
          <p>
            {data.signals.length
              ? "Try adjusting your search query or filters."
              : "Fetch live sources or analyze a headline to get started."}
          </p>
        </div>
      )}
      <div className="panel-foot">
        <span>
          Showing {visible.length} of {filtered.length} signals
        </span>
        <span>
          <ShieldCheck size={14} />
          Source-verified · Deduplicated · FinBERT scored
        </span>
      </div>
    </section>
  );
}

function Holdings({
  data,
  onSelectTicker,
}: {
  data: Dashboard;
  onSelectTicker?: (t: string) => void;
}) {
  const [sort, setSort] = useState<"weight" | "name">("weight");
  const rows = [...data.holdings].sort((a, b) =>
    sort === "weight" ? b.weight - a.weight : a.name.localeCompare(b.name),
  );

  return (
    <section className="panel holdings-panel">
      <div className="panel-head">
        <div>
          <h2>Index composition & allocations</h2>
          <p>Synthetic 10-stock US large-cap index with tactical rebalancing</p>
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
              const tint = STOCK_TINTS[h.ticker] ?? {
                bg: "#f1f5f9",
                text: "#0f172a",
              };

              return (
                <tr
                  key={h.ticker}
                  onClick={() => onSelectTicker?.(h.ticker)}
                  style={{ cursor: onSelectTicker ? "pointer" : "default" }}
                >
                  <td>
                    <div className="company">
                      <span
                        className="company-logo"
                        style={{ background: tint.bg, color: tint.text }}
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
        <span>5–20% allocation bounds · 8% maximum turnover cap</span>
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

function StressTestingView({ data }: { data: Dashboard }) {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);

  const basePortfolio = [
    { name: "Corporate Loans", base: 40_000_000, share: 0.4 },
    { name: "Sovereign & IG Bonds", base: 30_000_000, share: 0.3 },
    { name: "Large-Cap Equities", base: 18_000_000, share: 0.18 },
    { name: "Rates & FX Derivatives", base: 12_000_000, share: 0.12 },
  ];

  const scenarios = [
    {
      title: "Geopolitical Escalation",
      type: "Geopolitical",
      severity: 8,
      shocks: [-0.035, 0.02, -0.125, -0.04],
      desc: "Severe supply chain disruption and regional conflict trigger equity selloff, bond safe-haven rally, and widening credit spreads.",
    },
    {
      title: "Credit Default Contagion",
      type: "Credit Event",
      severity: 9,
      shocks: [-0.09, -0.065, -0.07, -0.08],
      desc: "Major institutional default drives rating downgrades, syndicated loan write-downs, and liquidity freeze.",
    },
    {
      title: "Macro Rate Shock (+250 bps)",
      type: "Macroeconomic",
      severity: 7,
      shocks: [0.015, -0.082, -0.08, -0.05],
      desc: "Emergency interest rate hikes devalue fixed-income bond durations while slightly expanding floating-rate loan margins.",
    },
    {
      title: "Big Tech Antitrust Enforcement",
      type: "Regulatory",
      severity: 7,
      shocks: [-0.01, 0.0, -0.1, -0.015],
      desc: "Sweeping regulatory penalties and structural remedy orders impact technology asset valuations across wholesale portfolios.",
    },
  ];

  const scenario = scenarios[selectedScenario];
  const totalBase = basePortfolio.reduce((acc, a) => acc + a.base, 0);

  const assetResults = basePortfolio.map((asset, i) => {
    const shock = scenario.shocks[i];
    const stressed = asset.base * (1 + shock);
    const delta = stressed - asset.base;
    return { ...asset, shock, stressed, delta };
  });

  const totalStressed = assetResults.reduce((acc, a) => acc + a.stressed, 0);
  const totalDelta = totalStressed - totalBase;
  const totalPct = (totalDelta / totalBase) * 100;

  const highImpactSignals = data.signals.filter((s) => s.impact >= 7);

  const triggerFromSignal = () => {
    if (highImpactSignals.length > 0) {
      const top = highImpactSignals[0];
      const matchIndex = scenarios.findIndex(
        (sc) => sc.type.toLowerCase() === top.event.toLowerCase(),
      );
      if (matchIndex !== -1) {
        setSelectedScenario(matchIndex);
      } else {
        setSelectedScenario(0);
      }
    }
  };

  return (
    <div className="stress-testing-view">
      <div className="stress-card">
        <div className="stress-header">
          <div>
            <span className="small-tag">MODULE B: STRESS TESTING</span>
            <h2>Wholesale Banking Portfolio Stress Test</h2>
            <p>
              Simulating the impact of severe real-world NLP risk signals on a
              synthetic $100M banking asset portfolio.
            </p>
          </div>
          {highImpactSignals.length > 0 && (
            <button className="button secondary" onClick={triggerFromSignal}>
              <Zap size={14} />
              Apply latest high-impact event ({highImpactSignals[0].event})
            </button>
          )}
        </div>

        <div className="stress-scenarios-bar">
          {scenarios.map((sc, i) => (
            <button
              key={sc.title}
              className={`scenario-pill ${selectedScenario === i ? "active" : ""}`}
              onClick={() => setSelectedScenario(i)}
            >
              <Zap size={13} />
              {sc.title} (Impact {sc.severity}/10)
            </button>
          ))}
        </div>

        <div className="stress-metrics-grid">
          <div className="stress-stat">
            <span>Pre-Stress Portfolio</span>
            <strong>$100.00M</strong>
            <small className="muted">Initial wholesale baseline</small>
          </div>
          <div className="stress-stat">
            <span>Post-Stress Portfolio</span>
            <strong>${(totalStressed / 1_000_000).toFixed(2)}M</strong>
            <small className={totalPct < 0 ? "negative" : "positive"}>
              {totalPct.toFixed(2)}% net change
            </small>
          </div>
          <div className="stress-stat">
            <span>Simulated Value Impact</span>
            <strong className={totalDelta < 0 ? "negative" : "positive"}>
              {totalDelta < 0 ? "-" : "+"}$
              {(Math.abs(totalDelta) / 1_000_000).toFixed(2)}M
            </strong>
            <small className="muted">Direct asset markdown</small>
          </div>
          <div className="stress-stat">
            <span>Risk Capital Status</span>
            <strong style={{ color: totalPct < -5 ? "#ef4444" : "#10b981" }}>
              {totalPct < -5 ? "Buffer Impaired" : "Adequate Buffer"}
            </strong>
            <small className="muted">Basel III Tier-1 threshold</small>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          <b>Scenario Analysis:</b> {scenario.desc}
        </p>

        <div className="table-scroll">
          <table className="holdings-table">
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
              {assetResults.map((r) => (
                <tr key={r.name}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>${(r.base / 1_000_000).toFixed(1)}M</td>
                  <td
                    className={
                      r.shock > 0
                        ? "positive"
                        : r.shock < 0
                          ? "negative"
                          : "muted"
                    }
                  >
                    {r.shock >= 0 ? "+" : ""}
                    {(r.shock * 100).toFixed(1)}%
                  </td>
                  <td>
                    <b>${(r.stressed / 1_000_000).toFixed(2)}M</b>
                  </td>
                  <td
                    className={
                      r.delta > 0
                        ? "positive"
                        : r.delta < 0
                          ? "negative"
                          : "muted"
                    }
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
    </div>
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
                <Newspaper size={22} />
              ) : (
                <MessageSquare size={22} />
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
              ? "Financial headlines and real-time market news"
              : "Community posts and financial discussions"}
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
          "Ingest & clean",
          "News RSS feeds and social discussions provide timestamped text. Redundant duplicates are removed, and sample records are segregated from live streams.",
        ],
        [
          "02",
          "FinBERT NLP inference",
          "Local quantized FinBERT calculates positive, neutral, and negative class probabilities. Sentiment is derived as P(positive) − P(negative). Ticker mapping aliases detect matching companies.",
        ],
        [
          "03",
          "Transparent risk scoring",
          "Event classification uses documented keyword logic. An event base score, sentiment intensity, and severity cues yield an impact score from 1 to 10.",
        ],
        [
          "04",
          "Dynamic index adjustment",
          "Company sentiment is aggregated with an exponential decay half-life. Stock target allocations are bounded between 5% and 20%, with turnover capped at 8% per rebalance.",
        ],
      ].map(([n, title, body]) => (
        <section className="panel method-card" key={n}>
          <span className="method-number">{n}</span>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section className="panel limitations">
        <h2>Engine transparency & boundaries</h2>
        <p>
          This platform is an AI/NLP financial risk engine prototype. Impact
          scores are deterministic heuristics based on event classification and
          sentiment intensity, rather than empirical market returns. Document
          sentiment is evaluated at article level. FinBERT operates locally on
          quantized ONNX weights with an automatic lexicon fallback when
          offline.
        </p>
        <a
          href="https://huggingface.co/ProsusAI/finbert"
          target="_blank"
          rel="noreferrer"
        >
          Explore FinBERT on Hugging Face <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState<View>("overview");
  const [connectionError, setConnectionError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [selected, setSelected] = useState<Signal | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [analyze, setAnalyze] = useState(false);
  const [text, setText] = useState("");

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
        `${result.added} new signals analyzed.${
          failed.length
            ? ` ${failed.length} source unavailable; see Data sources.`
            : ""
        }`,
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
            <Activity size={20} strokeWidth={2.5} />
          </span>
          signaldesk<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">DT</span>
          <div>
            <b>DTU Hackathon</b>
            <span>Risk Engine Workspace</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">PLATFORM</div>
        <nav aria-label="Main navigation">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-label={name}
              title={name}
              onClick={() => setView(id)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {id === "signals" && <small>{data?.stats.total ?? "—"}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-insight">
          <span className="mini-spark">
            <Sparkles size={16} />
          </span>
          <h3>Real-Time Risk Engine</h3>
          <p>Unstructured news to actionable risk signals and allocations.</p>
          <button onClick={() => setView("method")}>
            View methodology <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="engine-light" />
          <div>
            <b>
              {data?.engine.status === "ready"
                ? "FinBERT online"
                : data?.engine.status === "fallback"
                  ? "Lexicon fallback"
                  : "Engine initializing"}
            </b>
            <span>Local inference engine</span>
          </div>
          <ShieldCheck size={16} />
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
                FINANCIAL RISK ENGINE
              </div>
              <h1>
                {view === "overview"
                  ? "Actionable signals. Tactical rebalancing."
                  : view === "signals"
                    ? "Signal explorer & sentiment feed"
                    : view === "portfolio"
                      ? "Index portfolio & allocation history"
                      : view === "stress"
                        ? "Event-driven stress test simulation"
                        : view === "sources"
                          ? "Data pipelines & ingestion"
                          : "Engine methodology & explainability"}
              </h1>
              <p>
                {view === "overview"
                  ? "Ingesting unstructured text from financial news and social media into structured risk intelligence."
                  : view === "signals"
                    ? "Browse analyzed headlines with FinBERT sentiment, event classification, and impact severity."
                    : view === "portfolio"
                      ? "Module A: Tactical index rebalancing across 10 large-cap US stocks driven by sentiment."
                      : view === "stress"
                        ? "Module B: Strategic portfolio stress testing for wholesale banking assets under major event shocks."
                        : view === "sources"
                          ? "Multi-source news feeds and social discussions entering the unified NLP pipeline."
                          : "Mathematical models, FinBERT inference parameters, and rebalancing constraints."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => setAnalyze(true)}
                disabled={busy}
              >
                <Plus size={15} />
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
                  ? "Real-time Google News RSS & social feeds · Auto-refresh active"
                  : "Deterministic scenarios · FinBERT NLP inference · Mock stock index"}
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
              <CircleHelp size={16} />
              <span>{error || connectionError}</span>
              <button
                aria-label="Dismiss error"
                onClick={() => {
                  setError("");
                  setConnectionError("");
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {data?.engine.status === "fallback" && (
            <div className="alert">
              <CircleHelp size={16} />
              FinBERT model is currently offline. Scores are using local
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
              <h2>Initializing risk workspace</h2>
              <p>
                {data?.engine.status === "loading"
                  ? "Downloading and initializing FinBERT quantized weights on CPU…"
                  : "Connecting to NLP engine and parsing opening scenarios…"}
              </p>
            </section>
          ) : (
            <>
              {(view === "overview" || view === "portfolio") && (
                <StockCardsStrip
                  data={data}
                  selectedTicker={selectedTicker}
                  onSelectTicker={(t) => setSelectedTicker(t)}
                />
              )}

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
                        {data.sources.length} active feeds
                      </span>
                      <span>News & social</span>
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
                            : "Neutral"}
                      </span>
                    </strong>
                    <p>
                      <span>Mean score across workspace</span>
                    </p>
                  </div>
                  <div className="metric">
                    <div>
                      <span>High-impact signals</span>
                      <Zap size={16} />
                    </div>
                    <strong>
                      {String(data.stats.highImpact).padStart(2, "0")}
                      <span className="metric-pill caution">Impact ≥ 7</span>
                    </strong>
                    <p>
                      <span>Significant market event triggers</span>
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
                      selectedTicker={selectedTicker}
                      onClearTicker={() => setSelectedTicker(null)}
                    />
                    <section className="panel event-panel">
                      <div className="panel-head">
                        <div>
                          <h2>Event distribution</h2>
                          <p>Categorized risk breakdown</p>
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
                                    background: COLORS[i % COLORS.length],
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
                  <Holdings
                    data={data}
                    onSelectTicker={(t) => setSelectedTicker(t)}
                  />
                </>
              )}

              {view === "signals" && (
                <Feed
                  data={data}
                  full
                  select={setSelected}
                  expand={() => {}}
                  selectedTicker={selectedTicker}
                  onClearTicker={() => setSelectedTicker(null)}
                />
              )}

              {view === "portfolio" && (
                <Holdings
                  data={data}
                  onSelectTicker={(t) => setSelectedTicker(t)}
                />
              )}

              {view === "stress" && <StressTestingView data={data} />}

              {view === "sources" && (
                <>
                  <SourceCards data={data} />
                  <section className="panel source-explainer">
                    <h2>Multi-source data pipeline</h2>
                    <p>
                      SignalDesk ingests headlines from financial news RSS and
                      social discussions via Hacker News. Text is normalized,
                      deduplicated, and passed through FinBERT inference to
                      generate structured risk signals.
                    </p>
                    <div className="pipeline-steps">
                      <span>
                        <Newspaper size={18} />
                        News & social
                      </span>
                      <ArrowRight size={16} />
                      <span>
                        <Sparkles size={18} />
                        FinBERT NLP
                      </span>
                      <ArrowRight size={16} />
                      <span>
                        <BarChart3 size={18} />
                        Tactical rebalancing
                      </span>
                    </div>
                    <p className="fineprint">
                      Google News RSS and Hacker News are active by default.
                      GDELT adapter is configurable on the backend server.
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
              SignalDesk <span className="footer-dot">·</span> DTU Hackathon
            </span>
            <div>
              <span>Updated {clock(data?.stats.lastUpdated ?? null)}</span>
              <a href="/api/export" download>
                <Download size={13} />
                Export JSON
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
                Or select a sample scenario:
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

            <label className="form-label" htmlFor="headline">
              Headline or text payload
            </label>
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
            <div className="textarea-meta">
              <span>Added as manual input · {data?.mode} workspace</span>
              <span>{text.length}/6000</span>
            </div>
            <p className="fineprint">
              FinBERT computes class probabilities and maps detected company
              aliases to the mock index.
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
