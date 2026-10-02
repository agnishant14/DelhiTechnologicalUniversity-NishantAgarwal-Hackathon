import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Play, X } from "lucide-react";
import type { PreviewResult } from "../../shared/types";
import { api, money, percent, signed, tone } from "../lib/api";
import { SignalCard } from "./SignalCard";

const EXAMPLES = [
  { label: "Bankruptcy", text: "apple goes bankrupt" },
  {
    label: "Mixed company news",
    text: "Apple reports record revenue and strong growth. Tesla misses earnings expectations as demand collapses.",
  },
  {
    label: "Credit shock",
    text: "JPMorgan credit losses surge as borrowers default amid a nationwide liquidity crisis.",
  },
  {
    label: "Trade disruption",
    text: "New export sanctions and military conflict threaten NVIDIA chip sales as demand collapses.",
  },
];
export function Sandbox({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(EXAMPLES[0].text);
  const [result, setResult] = useState<PreviewResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      setResult(await api<PreviewResult>("preview", { text }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="sandbox"
      ref={dialog}
      onClose={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="sandbox-content">
        <div className="dialog-head">
          <div>
            <span className="eyebrow">PREVIEW · NO SAVED CHANGES</span>
            <h2>Test a headline</h2>
          </div>
          <button
            className="dialog-close-btn"
            aria-label="Close sandbox"
            onClick={close}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <p className="muted">
          Invent an event and preview its effect alongside existing signals.
          Your saved feed, weights and stress history stay unchanged.
        </p>
        <form onSubmit={submit}>
          <div className="row wrap">
            {EXAMPLES.map((e) => (
              <button
                type="button"
                className="chip"
                key={e.label}
                disabled={busy}
                onClick={() => {
                  setText(e.text);
                  setResult(undefined);
                }}
              >
                {e.label}
              </button>
            ))}
          </div>
          <label htmlFor="what-if-text" className="field-label">
            Hypothetical headline
          </label>
          <textarea
            id="what-if-text"
            rows={3}
            minLength={10}
            maxLength={6000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(undefined);
            }}
            required
            disabled={busy}
          />
          <div className="row between">
            <span className="small muted">Example prompts are fictional.</span>
            <button className="button dark" disabled={busy}>
              <Play size={16} />
              {busy ? "Analyzing…" : "Run analysis"}
            </button>
          </div>
        </form>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="preview-result">
            <SignalCard signal={result.signal} />
            <div className="sandbox-grid">
              <section className="panel">
                <span className="eyebrow">MODULE A</span>
                <h3>Allocation changes</h3>
                {result.holdings
                  .filter((h) => Math.abs(h.weight - h.previousWeight) > 0.0001)
                  .sort(
                    (a, b) =>
                      Math.abs(b.weight - b.previousWeight) -
                      Math.abs(a.weight - a.previousWeight),
                  )
                  .slice(0, 6)
                  .map((h) => (
                    <div className="preview-holding" key={h.ticker}>
                      <b>{h.ticker}</b>
                      <span>
                        {percent(h.previousWeight, 2)} <ArrowRight size={12} />{" "}
                        {percent(h.weight, 2)}
                      </span>
                      <b className={tone(h.weight - h.previousWeight)}>
                        {signed((h.weight - h.previousWeight) * 100)} pp
                      </b>
                    </div>
                  ))}
                <p className="small muted">
                  One-way turnover: {percent(result.turnover, 2)}. Preview
                  includes current signals and portfolio limits.
                </p>
              </section>
              <section className="panel subtle">
                <span className="eyebrow">MODULE B</span>
                <h3>Adverse scenario</h3>
                <span className="tag">
                  {result.signal.impact > 7
                    ? "Meets automatic stress threshold"
                    : "Below automatic stress threshold"}
                </span>
                <strong className="big-number">
                  {money(result.stress.pnl)}
                </strong>
                <p>
                  {money(result.stress.before)} before →{" "}
                  {money(result.stress.after)} after
                </p>
                <p className="small muted">
                  {result.signal.event} preset scaled to impact{" "}
                  {result.signal.impact}/10. This is a hypothetical stress loss,
                  not a predicted return.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
