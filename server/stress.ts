import { randomUUID } from "node:crypto";
import portfolio from "../data/portfolio.json";
import type { Asset, Shocks, StressResult } from "../shared/types";
import type { EventType, Mode, Signal } from "../shared/types";

export const ASSETS = portfolio as Asset[];
export const PRESETS: Record<EventType, Shocks> = {
  Geopolitical: { equityPct: -15, ratesBps: 75, creditBps: 150, fxPct: -8 },
  Macroeconomic: { equityPct: -10, ratesBps: 200, creditBps: 100, fxPct: -5 },
  "Credit Event": { equityPct: -12, ratesBps: -50, creditBps: 300, fxPct: -3 },
  "Merger/Acquisition": {
    equityPct: -5,
    ratesBps: 0,
    creditBps: 50,
    fxPct: -1,
  },
  "Product Launch": { equityPct: -3, ratesBps: 0, creditBps: 25, fxPct: 0 },
  Earnings: { equityPct: -8, ratesBps: 0, creditBps: 75, fxPct: -2 },
  Regulatory: { equityPct: -10, ratesBps: 25, creditBps: 125, fxPct: -2 },
  Operational: { equityPct: -7, ratesBps: 0, creditBps: 100, fxPct: -2 },
  General: { equityPct: -5, ratesBps: 50, creditBps: 50, fxPct: -2 },
};
export function runStress(
  event: EventType,
  impact = 10,
  mode: Mode = "demo",
  custom?: Shocks,
  signal?: Signal,
): StressResult {
  const shocks =
    custom ??
    (Object.fromEntries(
      Object.entries(PRESETS[event]).map(([k, v]) => [k, (v * impact) / 10]),
    ) as unknown as Shocks);
  const contributions = ASSETS.map((asset) => {
    const drivers: Shocks = {
      equityPct: (asset.value * asset.equityBeta * shocks.equityPct) / 100,
      ratesBps:
        (-asset.value * asset.duration * shocks.ratesBps) / 10000 +
        asset.rateDv01 * shocks.ratesBps,
      creditBps:
        (-asset.value * asset.spreadDuration * shocks.creditBps) / 10000,
      fxPct: (asset.fxExposure * shocks.fxPct) / 100,
    };
    const pnl = Object.values(drivers).reduce((a, b) => a + b, 0);
    return {
      asset,
      before: asset.value,
      after: asset.value + pnl,
      pnl,
      drivers,
    };
  });
  const before = contributions.reduce((s, a) => s + a.before, 0);
  const pnl = contributions.reduce((s, a) => s + a.pnl, 0);
  return {
    id: randomUUID(),
    mode,
    timestamp: new Date().toISOString(),
    event,
    impact,
    analysisVersion: signal?.analysisVersion,
    trigger: signal ? "automatic" : "sandbox",
    signalId: signal?.id,
    headline: signal?.text,
    shocks,
    before,
    after: before + pnl,
    pnl,
    pnlPct: (pnl / before) * 100,
    contributions,
  };
}
