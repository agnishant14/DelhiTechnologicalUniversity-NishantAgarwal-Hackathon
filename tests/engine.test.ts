import { describe, expect, it } from "vitest";
import {
  RiskEngine,
  classifyEvent,
  detectTickers,
  fallbackSentiment,
  modelInput,
} from "../server/engine";
import { documentSchema } from "../server/validation";

describe("risk signals", () => {
  it("normalizes unpunctuated headlines and isolated company sentences for inference", async () => {
    const inputs: string[] = [];
    const engine = new RiskEngine(async (text) => {
      inputs.push(text);
      return [
        { label: "positive", score: 0.02 },
        { label: "negative", score: 0.73 },
        { label: "neutral", score: 0.25 },
      ];
    });
    const signal = await engine.analyze({
      text: "apple goes bankrupt while Tesla reports strong profits",
      sourceKind: "manual",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    });
    expect(inputs).toContain("apple goes bankrupt.");
    expect(inputs).toContain("Tesla reports strong profits.");
    expect(signal.text).toBe(
      "apple goes bankrupt while Tesla reports strong profits",
    );
    expect(signal.modelInput).toBe(`${signal.text}.`);
    expect(modelInput('Apple says "strong profits."')).toBe(
      'Apple says "strong profits."',
    );
    expect(modelInput("Apple goes bankrupt!")).toBe("Apple goes bankrupt!");
    expect(modelInput("Apple reports profits https://example.com/news")).toBe(
      "Apple reports profits.",
    );
  });
  it("uses the most likely class even when the directional score exceeds the old threshold", async () => {
    const engine = new RiskEngine(async () => [
      { label: "positive", score: 0.3 },
      { label: "negative", score: 0.02 },
      { label: "neutral", score: 0.68 },
    ]);
    const signal = await engine.analyze({
      text: "Apple publishes an update",
      sourceKind: "manual",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    });
    expect(signal.sentimentLabel).toBe("neutral");
    expect(signal.sentiment).toBe(0.28);
    expect(signal.analysisVersion).toBe(engine.analysisVersion);
  });
  it("distinguishes reported distress from denials, recovery and speculation", () => {
    for (const text of [
      "Apple is not bankrupt",
      "Apple avoids bankruptcy",
      "Apple denies bankruptcy rumors",
      "Bankruptcy rumors were denied by Apple",
      "Tesla emerges from bankruptcy",
      "Apple has no risk of default",
      "Microsoft is no longer insolvent",
    ]) {
      expect(classifyEvent(text, -0.8), text).toMatchObject({
        event: "Credit Event",
        creditContext: "negated or resolved",
        impact: 3,
      });
    }
    for (const text of [
      "Apple may go bankrupt",
      "If Tesla defaults on its debt",
      "Apple faces bankruptcy rumors",
    ]) {
      expect(classifyEvent(text, -0.8), text).toMatchObject({
        creditContext: "uncertain",
        impact: 7,
      });
    }
    for (const text of [
      "apple goes bankrupt",
      "Microsoft defaults on its debt",
      "Apple denies bankruptcy rumors but Tesla goes bankrupt",
    ]) {
      const result = classifyEvent(text, -0.8);
      expect(result.creditContext, text).toBe("reported");
      expect(result.impact, text).toBeGreaterThan(7);
    }
    expect(fallbackSentiment("apple goes bankrupt")).toBeLessThan(-0.15);
  });
  it("matches company names and tickers without substring false positives", () => {
    expect(detectTickers("Apple and $NVDA beat forecasts.")).toEqual([
      "AAPL",
      "NVDA",
    ]);
    expect(detectTickers("The metadata is available.")).toEqual([]);
    expect(detectTickers("J.P. Morgan sees growth.")).toEqual(["JPM"]);
  });
  it("does not let recovery wording hide an unresolved or separate adverse event", () => {
    expect(classifyEvent("Apple cannot avoid bankruptcy", -0.8)).toMatchObject({
      creditContext: "reported",
      impact: 10,
    });
    expect(
      classifyEvent("Apple failed to prevent bankruptcy", -0.8),
    ).toMatchObject({ creditContext: "reported", impact: 10 });
    expect(classifyEvent("Apple did not deny bankruptcy", -0.8)).toMatchObject({
      creditContext: "uncertain",
      impact: 7,
    });
    expect(
      classifyEvent(
        "Apple denies bankruptcy but a military invasion disrupts chip supplies",
        -0.8,
      ),
    ).toMatchObject({ event: "Geopolitical", impact: 10 });
    expect(
      classifyEvent("Apple avoids bankruptcy and reports record earnings", 0.8),
    ).toMatchObject({ event: "Earnings", impact: 5 });
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
