import { describe, expect, it } from "vitest";
import {
  computeCreditRatings,
  computeContagion,
  computeValueAtRisk,
  simulateWhatIf,
} from "../server/riskAnalytics";
import { RiskEngine } from "../server/engine";
import type { Signal } from "../shared/types";

const mockSignal = (
  ticker: string,
  sentiment: number,
  event: Signal["event"] = "Earnings",
  impact = 8,
): Signal => ({
  id: `sig-${ticker}`,
  mode: "demo",
  text: `${ticker} announces quarterly earnings and severe liquidity strain.`,
  sourceKind: "news",
  sourceName: "Newswire",
  publishedAt: new Date().toISOString(),
  tickers: [ticker as any],
  sentiment,
  sentimentLabel: sentiment > 0.15 ? "positive" : sentiment < -0.15 ? "negative" : "neutral",
  event,
  impact,
  confidence: 0.9,
  model: "FinBERT",
  probabilities: { positive: 0.1, negative: 0.8, neutral: 0.1 },
  evidence: ["Severe liquidity and default risks cited."],
  ingestedAt: new Date().toISOString(),
});

describe("institutional risk analytics", () => {
  it("computes credit ratings and downgrades on credit events", () => {
    const signals = [mockSignal("BAC", -0.85, "Credit Event", 9)];
    const res = computeCreditRatings(signals);
    expect(res.ratings).toHaveLength(20);

    const bac = res.ratings.find((r) => r.ticker === "BAC");
    expect(bac).toBeDefined();
    expect(bac?.outlook).toBe("Rating Watch Negative");
    expect(bac?.pdChangeBps).toBeGreaterThan(0);
    expect(bac?.pd1YearPct).toBeGreaterThan(0.42);
  });

  it("calculates 2nd-order counterparty contagion ripple effects", () => {
    const signals = [mockSignal("NVDA", -0.75, "Regulatory", 8)];
    const contagion = computeContagion(signals);

    expect(contagion.primaryShocks).toHaveLength(1);
    expect(contagion.primaryShocks[0].ticker).toBe("NVDA");

    expect(contagion.spillovers.length).toBeGreaterThan(0);
    const msft = contagion.spillovers.find((s) => s.targetTicker === "MSFT");
    expect(msft).toBeDefined();
    expect(msft?.relationship).toBe("Cloud Partner");
    expect(msft?.simulatedDragPct).toBeLessThan(0);
  });

  it("calculates parametric VaR, CVaR, and Basel Tier-1 status", () => {
    const signals = [mockSignal("AAPL", -0.6, "Macroeconomic", 7)];
    const varMetrics = computeValueAtRisk(signals, 100_000_000);

    expect(varMetrics.portfolioValue).toBe(100_000_000);
    expect(varMetrics.confidenceLevels.var95_1d_Millions).toBeGreaterThan(0);
    expect(varMetrics.confidenceLevels.var99_1d_Millions).toBeGreaterThan(
      varMetrics.confidenceLevels.var95_1d_Millions,
    );
    expect(varMetrics.confidenceLevels.var95_10d_Millions).toBeGreaterThan(
      varMetrics.confidenceLevels.var95_1d_Millions,
    );
    expect(varMetrics.confidenceLevels.cvar95_1d_Millions).toBeGreaterThan(
      varMetrics.confidenceLevels.var95_1d_Millions,
    );
    expect(varMetrics.baselTier1Ratio).toBeGreaterThan(8);
    expect(varMetrics.distributionPoints.length).toBeGreaterThan(20);
  });

  it("simulates counterfactual what-if headlines with token attribution", async () => {
    const engine = new RiskEngine(async () => [
      { label: "positive", score: 0.1 },
      { label: "negative", score: 0.8 },
      { label: "neutral", score: 0.1 },
    ]);
    await engine.initialize();

    const result = await simulateWhatIf(
      "Apple faces massive antitrust fine and vehicle division bankruptcy",
      engine,
    );

    expect(result.detectedTickers).toContain("AAPL");
    expect(result.tokenAttributions.length).toBeGreaterThan(5);
    expect(
      result.tokenAttributions.some((t) => t.type === "neg"),
    ).toBe(true);
    expect(result.weightDeltas).toHaveLength(20);
    expect(result.stressDelta).toHaveLength(4);
    expect(result.totalPnlImpactMillions).toBeLessThan(0);
  });
});
