import { describe, expect, it } from "vitest";
import fixtures from "../models/parity.json";
import metrics from "../models/metrics.json";
import { predictTopic } from "../server/topic";

describe("trained news classifier", () => {
  it("matches Python inference on held-out examples", () => {
    for (const fixture of fixtures) {
      const result = predictTopic(fixture.text);
      metrics.perClass.forEach(({ label }, i) => {
        expect(result.alternatives.find((r) => r.label === label)?.probability).toBeCloseTo(fixture.probabilities[i], 5);
      });
    }
  });
  it("requests review for text outside its vocabulary", () => {
    expect(predictTopic("🦄 12345").needsReview).toBe(true);
  });
});
