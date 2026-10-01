import { describe, expect, it } from "vitest";
import {
  RiskEngine,
  classifyEvent,
  detectTickers,
  fallbackSentiment,
} from "../server/engine";
import { documentSchema } from "../server/validation";

describe("risk signals", () => {
  it("matches company names and tickers without substring false positives", () => {
    expect(detectTickers("Apple and $NVDA beat forecasts.")).toEqual([
      "AAPL",
      "NVDA",
    ]);
    expect(detectTickers("The metadata is available.")).toEqual([]);
    expect(detectTickers("J.P. Morgan sees growth.")).toEqual(["JPM"]);
  });
  it("prioritizes credit and geopolitical events and limits severity", () => {
    expect(
      classifyEvent("Company bankruptcy causes a massive crisis", -1),
    ).toMatchObject({ event: "Credit Event", impact: 10 });
    expect(
      classifyEvent("NVIDIA revenue hit by export restrictions", -0.8).event,
    ).toBe("Geopolitical");
    expect(classifyEvent("Company provides an update", 0).impact).toBe(2);
    expect(classifyEvent("A default might occur", -0.5).impact).toBeLessThan(
      classifyEvent("A default occurred", -0.5).impact,
    );
  });
  it("uses positive minus negative model probabilities", async () => {
    const engine = new RiskEngine(async () => [
      { label: "positive", score: 0.8 },
      { label: "negative", score: 0.1 },
      { label: "neutral", score: 0.1 },
    ]);
    const doc = {
      text: "Apple reports record revenue.",
      sourceKind: "news" as const,
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    };
    const signal = await engine.analyze(doc);
    expect(signal).toMatchObject({
      sentiment: 0.7,
      model: "FinBERT",
      confidence: 0.8,
      tickers: ["AAPL"],
      event: "Earnings",
    });
    expect(
      (
        await engine.analyze({
          ...doc,
          text: " Apple  reports record revenue. ",
        })
      ).id,
    ).toBe(signal.id);
    expect((await engine.analyze(doc, "live")).id).not.toBe(signal.id);
  });
  it("handles basic negation in the explicit fallback", () => {
    expect(fallbackSentiment("strong growth")).toBeGreaterThan(0);
    expect(fallbackSentiment("not strong")).toBeLessThan(0);
    expect(fallbackSentiment("a scheduled meeting")).toBe(0);
  });
  it("rejects malformed and unsafe input", () => {
    expect(documentSchema.safeParse({ text: "short" }).success).toBe(false);
    expect(
      documentSchema.safeParse({
        text: "A normal headline",
        sourceUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      documentSchema.safeParse({
        text: "A normal headline",
        publishedAt: "2099-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});
