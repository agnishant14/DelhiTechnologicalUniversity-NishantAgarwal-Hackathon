import { describe, expect, it } from "vitest";
import { RiskEngine, detectTickers } from "../server/engine";
import { annotateNovelty } from "../server/novelty";
import { equalWeights, rebalance } from "../server/portfolio";
import { runStress } from "../server/stress";
import type { Signal } from "../shared/types";

describe("connected risk intelligence", () => {
  it("isolates sentiment for companies in separate sentences", async () => {
    const engine = new RiskEngine(async (text) => [
      { label: "positive", score: text.includes("Tesla") ? 0.1 : 0.8 },
      { label: "negative", score: text.includes("Tesla") ? 0.8 : 0.1 },
      { label: "neutral", score: 0.1 },
    ]);
    const signal = await engine.analyze({
      text: "Apple reports strong revenue. Tesla reports severe losses.",
      sourceKind: "news",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    });
    expect(signal.companySentiments).toEqual([
      expect.objectContaining({
        ticker: "AAPL",
        sentiment: 0.7,
        scope: "company sentence",
      }),
      expect.objectContaining({
        ticker: "TSLA",
        sentiment: -0.7,
        scope: "company sentence",
      }),
    ]);
    const { weights } = rebalance([signal]);
    expect(weights.AAPL).toBeGreaterThan(0.05);
    expect(weights.TSLA).toBeLessThan(0.05);
  });
  it("does not mistake short ordinary words for tickers", () => {
    expect(detectTickers("Chapter V covers MA and HD policies")).toEqual([]);
    expect(detectTickers("$V and NYSE:MA report earnings")).toEqual([
      "V",
      "MA",
    ]);
  });
  it("groups publisher variants while retaining changed facts", () => {
    const source = {
      id: "first",
      text: "Apple reports record revenue after strong iPhone demand - Publisher One",
      mode: "live",
      sentiment: 0.8,
      sentimentLabel: "positive",
      event: "Earnings",
      tickers: ["AAPL"],
      publishedAt: new Date().toISOString(),
      sourceKind: "news",
      evidence: [],
    } as unknown as Signal;
    const second = annotateNovelty(
      {
        ...source,
        id: "second",
        text: "Apple reports record revenue after strong iPhone demand - Publisher Two",
      },
      [source],
    );
    expect(second.duplicateOf).toBe("first");
    expect(rebalance([source, second]).weights).toEqual(
      rebalance([source]).weights,
    );
    expect(
      annotateNovelty(
        {
          ...source,
          id: "update",
          text: "Apple reports record revenue after strong iPhone demand rises 20%",
        },
        [source],
      ).duplicateOf,
    ).toBeUndefined();
  });
  it("repairs obsolete index weights and fades old evidence", () => {
    const legacy = { AAPL: 0.5, MSFT: 0.5 } as ReturnType<typeof equalWeights>;
    const repaired = rebalance([], legacy);
    expect(Object.values(repaired.weights).reduce((a, b) => a + b)).toBeCloseTo(
      1,
    );
    expect(Object.values(repaired.weights).every(Number.isFinite)).toBe(true);
    const signal = {
      tickers: ["AAPL"],
      sentiment: 1,
      sourceKind: "news",
      publishedAt: new Date().toISOString(),
    } as Signal;
    const now = Date.now();
    expect(
      rebalance([signal], equalWeights(), now + 6 * 3600000).weights.AAPL,
    ).toBeLessThan(rebalance([signal], equalWeights(), now).weights.AAPL);
  });
  it("keeps units and derivative direction correct under rate shocks", () => {
    const result = runStress("Macroeconomic", 10, "demo", {
      equityPct: 0,
      ratesBps: 100,
      creditBps: 0,
      fxPct: 0,
    });
    expect(
      result.contributions.find((r) => r.asset.id === "B1")?.pnl,
    ).toBeCloseTo(-1);
    expect(
      result.contributions.find((r) => r.asset.id === "D1")?.pnl,
    ).toBeCloseTo(-1.2);
    expect(result.after).toBeCloseTo(
      result.before + result.contributions.reduce((sum, r) => sum + r.pnl, 0),
    );
    const zero = runStress("General", 10, "demo", {
      equityPct: 0,
      ratesBps: 0,
      creditBps: 0,
      fxPct: 0,
    });
    expect(zero.after).toBe(100);
    expect(runStress("Geopolitical", 5).pnl).toBeCloseTo(
      runStress("Geopolitical", 10).pnl / 2,
    );
  });
});
