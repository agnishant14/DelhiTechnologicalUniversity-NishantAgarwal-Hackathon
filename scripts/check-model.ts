import assert from "node:assert/strict";
import { RiskEngine } from "../server/engine";

const engine = new RiskEngine();
await engine.initialize();
assert.equal(
  engine.status,
  "ready",
  "FinBERT must be available for this smoke test",
);
const cases = [
  {
    text: "Apple reports record profits and beats revenue forecasts.",
    label: "positive",
  },
  {
    text: "Tesla reports severe losses as vehicle sales plunge.",
    label: "negative",
  },
  {
    text: "Microsoft will hold its annual meeting on Tuesday.",
    label: "neutral",
  },
];
for (const item of cases) {
  const signal = await engine.analyze({
    text: item.text,
    sourceKind: "manual",
    sourceName: "Model smoke test",
    publishedAt: new Date().toISOString(),
  });
  assert.equal(signal.model, "FinBERT");
  assert.equal(signal.sentimentLabel, item.label);
  console.log(`${item.label}: ${signal.sentiment.toFixed(3)} — ${item.text}`);
}
console.log(
  "3 model smoke checks passed. These examples are not an accuracy benchmark.",
);
