import { describe, expect, it } from "vitest";
import { STOCKS, type Signal } from "../shared/types";
import { equalWeights, rebalance, POLICY } from "../server/portfolio";
const signal = (
  ticker: string,
  sentiment: number,
  publishedAt = new Date().toISOString(),
) =>
  ({ tickers: [ticker], sentiment, publishedAt, sourceKind: "news" }) as Signal;

describe("index policy", () => {
  it("increases positive stocks and decreases negative stocks", () => {
    const { weights, turnover } = rebalance([
      signal("AAPL", 0.9),
      signal("TSLA", -0.9),
    ]);
    const base = 1 / STOCKS.length;
    expect(weights.AAPL).toBeGreaterThan(base);
    expect(weights.TSLA).toBeLessThan(base);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(
      1,
      12,
    );
    expect(turnover).toBeLessThanOrEqual(0.08 + 1e-10);
  });
  it("maintains all portfolio bounds across repeated extreme events", () => {
    let previous = equalWeights();
    for (let i = 0; i < 100; i++) {
      const signals = STOCKS.map((s, j) =>
        signal(s.ticker, (((i * 7 + j * 3) % 21) - 10) / 10),
      );
      const result = rebalance(signals, previous);
      expect(
        Object.values(result.weights).reduce((a, b) => a + b, 0),
      ).toBeCloseTo(1, 10);
      for (const weight of Object.values(result.weights)) {
        expect(weight).toBeGreaterThanOrEqual(POLICY.minWeight - 1e-10);
        expect(weight).toBeLessThanOrEqual(POLICY.maxWeight + 1e-10);
      }
      expect(result.turnover).toBeLessThanOrEqual(0.08 + 1e-10);
      previous = result.weights;
    }
  });
  it("ignores stale and future publications", () => {
    const { weights } = rebalance([
      signal("AAPL", 1, new Date(Date.now() - 25 * 3600000).toISOString()),
      signal("TSLA", -1, new Date(Date.now() + 3600000).toISOString()),
    ]);
    const base = 1 / STOCKS.length;
    for (const weight of Object.values(weights))
      expect(weight).toBeCloseTo(base);
  });
});
