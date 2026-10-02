import { useEffect, useState } from "react";
import { ArrowDownRight, History, RotateCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EVENTS, type EventType } from "../../shared/types";
import type { Shocks, StressDashboard, StressResult } from "../../shared/types";
import { ago, api, money, signed, tone } from "../lib/api";

const CONTROLS: {
  key: keyof Shocks;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "equityPct",
    label: "Equity prices",
    min: -60,
    max: 40,
    step: 1,
    unit: "%",
  },
  {
    key: "ratesBps",
    label: "Interest rates",
    min: -500,
    max: 500,
    step: 25,
    unit: "bps",
  },
  {
    key: "creditBps",
    label: "Credit spreads",
    min: -200,
    max: 1000,
    step: 25,
    unit: "bps",
  },
  {
    key: "fxPct",
    label: "Foreign currency vs USD",
    min: -40,
    max: 40,
    step: 1,
    unit: "%",
  },
];
export function StressStudio({ data }: { data: StressDashboard }) {
  const [event, setEvent] = useState<EventType>("Geopolitical");
  const [shocks, setShocks] = useState<Shocks>(data.presets.Geopolitical);
  const [result, setResult] = useState<StressResult>();
  const [saved, setSaved] = useState<StressResult>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    const timer = setTimeout(() => {
      api<StressResult>("stress/simulate", { event, shocks }, controller.signal)
        .then((value) => {
          setResult(value);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [event, shocks]);
  const shown = saved ?? result;
  const reset = (type: EventType) => {
    setSaved(undefined);
    setEvent(type);
    setShocks(data.presets[type]);
  };
  const chart =
    shown?.contributions.map((c) => ({
      name: c.asset.id,
      before: c.before,
      after: c.after,
    })) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            MODULE B · STRATEGIC PORTFOLIO STRESS TESTING
          </span>
          <h1>Portfolio stress test</h1>
          <p>
            Explore how an event travels through a $100m synthetic wholesale
            asset book.
          </p>
        </div>
      </div>
      <div className="studio-grid">
        <section className="panel controls-panel">
          <span className="eyebrow">YOUR SCENARIO</span>
          <h2>Scenario settings</h2>
          <label className="field-label" htmlFor="stress-event">
            Event preset
          </label>
          <select
            id="stress-event"
            value={event}
            onChange={(e) => reset(e.target.value as EventType)}
          >
            {EVENTS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <div className="sliders">
            {CONTROLS.map((control) => (
              <label key={control.key} className="slider-control">
                <span>
                  {control.label}
                  <b>
                    {signed(shocks[control.key], 0)} {control.unit}
                  </b>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={shocks[control.key]}
                  onChange={(e) => {
                    setSaved(undefined);
                    setShocks({
                      ...shocks,
                      [control.key]: Number(e.target.value),
                    });
                  }}
                />
                <small>
                  {control.min}
                  {control.unit}{" "}
                  <span>
                    {control.max}
                    {control.unit}
                  </span>
                </small>
              </label>
            ))}
          </div>
          <button
            className="button secondary full"
            onClick={() => reset(event)}
          >
            <RotateCcw size={15} /> Reset preset
          </button>
          <p className="small muted">
            Presets describe adverse scenarios at impact 10. Automatic tests
            scale shocks by event impact ÷ 10. Slider changes are temporary.
          </p>
        </section>
        <section className="panel stress-result">
          <div className="section-title">
            <div>
              <span className="eyebrow">
                {saved ? "SAVED AUTOMATIC TEST" : "SCENARIO PREVIEW"}
              </span>
              <h2>{shown?.event ?? event}</h2>
            </div>
            <span className="tag">
              {saved
                ? ago(saved.timestamp)
                : pending
                  ? "Calculating…"
                  : "Preview ready"}
            </span>
          </div>
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          <div className={`value-bridge ${pending && !saved ? "pending" : ""}`}>
            <div>
              <span>Before</span>
              <strong>{money(shown?.before ?? data.totalValue)}</strong>
            </div>
            <ArrowDownRight size={28} />
            <div>
              <span>After scenario</span>
              <strong>{shown ? money(shown.after) : "—"}</strong>
            </div>
          </div>
          <div className={`pnl-banner ${tone(shown?.pnl ?? 0)}`}>
            <span>Hypothetical P&L</span>
            <b>
              {shown
                ? `${money(shown.pnl)} (${signed(shown.pnlPct)}%)`
                : "Calculating…"}
            </b>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                margin={{ top: 15, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0f4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(n: number) => `$${n}m`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(n) => money(Number(n))} />
                <Bar
                  name="Before"
                  dataKey="before"
                  fill="#e1e6ee"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  name="After"
                  dataKey="after"
                  fill="#3564db"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {saved && (
            <div className="saved-trigger">
              <b>Triggered by</b>
              <p className="small muted">
                Recorded with{" "}
                {saved.analysisVersion
                  ? `analysis ${saved.analysisVersion}`
                  : "an earlier engine"}
                . Historical results are preserved.
              </p>
              <p>{saved.headline}</p>
              <span className="small muted">
                Impact {saved.impact}/10 ·{" "}
                {CONTROLS.map(
                  (c) =>
                    `${c.label}: ${signed(saved.shocks[c.key], 0)}${c.unit}`,
                ).join(" · ")}
              </span>
              <button
                className="text-button"
                onClick={() => setSaved(undefined)}
              >
                Return to slider preview
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">WHERE THE IMPACT LANDS</span>
            <h2>Asset contributions</h2>
          </div>
          <span className="small muted">All values in USD millions</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Before</th>
                <th>After</th>
                <th>P&L</th>
                <th>Largest driver</th>
              </tr>
            </thead>
            <tbody>
              {shown?.contributions.map((c) => {
                const driver = Object.entries(c.drivers).sort(
                  (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
                )[0];
                return (
                  <tr key={c.asset.id}>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className="asset-id-badge">{c.asset.id}</span>
                        <b>{c.asset.name}</b>
                      </div>
                    </td>
                    <td>
                      <span className={`tag tag-asset-${c.asset.type.toLowerCase()}`}>{c.asset.type}</span>
                    </td>
                    <td>{money(c.before)}</td>
                    <td>{money(c.after)}</td>
                    <td className={tone(c.pnl)}>{money(c.pnl)}</td>
                    <td>
                      {Math.abs(driver[1]) < 0.0001
                        ? "None"
                        : CONTROLS.find((d) => d.key === driver[0])?.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <h2>Automatic event history</h2>
            <History size={19} />
          </div>
          {data.history.length ? (
            data.history.slice(0, 8).map((r) => (
              <button
                className={`history-row ${saved?.id === r.id ? "chosen" : ""}`}
                key={r.id}
                onClick={() => setSaved(r)}
              >
                <span>
                  <b>
                    {r.event} · impact {r.impact}/10
                  </b>
                  <small>{r.headline}</small>
                  {!r.analysisVersion && (
                    <small>Earlier engine · historical result</small>
                  )}
                </span>
                <strong className={tone(r.pnl)}>{money(r.pnl)}</strong>
              </button>
            ))
          ) : (
            <p className="empty">
              Fresh, distinct events with impact above 7 create saved stress
              tests here. Replay the demo to see one.
            </p>
          )}
        </section>
        <section className="panel subtle">
          <span className="eyebrow">KNOW THE ASSUMPTIONS</span>
          <h2>Valuation assumptions</h2>
          <p>
            Loans and bonds use duration × rate/spread changes. Equities use
            beta. Swaps use signed dollar sensitivity per basis point; forwards
            use foreign-currency exposure.
          </p>
          <p className="small">
            The book is synthetic. Tests start from the same $100m baseline and
            are not compounded. Linear approximations omit convexity, defaults,
            margin calls and nonlinear derivative payoffs. Extreme shocks can
            produce unrealistic values. No agency ratings or regulatory
            certification are implied.
          </p>
        </section>
      </div>
    </>
  );
}
