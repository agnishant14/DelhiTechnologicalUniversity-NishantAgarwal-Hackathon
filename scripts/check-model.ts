import assert from "node:assert/strict";
import { RiskEngine } from "../server/engine";
import parity from "../models/sentiment/parity.json";

const engine = new RiskEngine();
await engine.initialize();
assert.equal(
  engine.status,
  "ready",
  "FinBERT must be available for this smoke test",
);
const cases = [
  ...[
    "apple goes bankrupt",
    "Apple goes bankrupt.",
    "apple files for bankruptcy",
    "tesla goes bankrupt",
    "Microsoft defaults on its debt",
    "Apple is insolvent and cannot repay its debts",
  ].map((text) => ({ text, label: "negative" })),
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
for (const text of [
  "Apple is not bankrupt",
  "Apple avoids bankruptcy",
  "Apple denies bankruptcy rumors",
  "Apple may go bankrupt",
]) {
  const signal = await engine.analyze({
    text,
    sourceKind: "manual",
    sourceName: "Model smoke test",
    publishedAt: new Date().toISOString(),
  });
  assert.ok(
    signal.impact <= 7,
    `${text} must not trigger an automatic stress test`,
  );
  console.log(`${signal.creditContext}: impact ${signal.impact}/10 — ${text}`);
}
const mixed = await engine.analyze({
  text: "apple goes bankrupt while Tesla reports record profits",
  sourceKind: "manual",
  sourceName: "Model smoke test",
  publishedAt: new Date().toISOString(),
});
assert.ok(
  mixed.companySentiments!.find((s) => s.ticker === "AAPL")!.sentiment < -0.15,
);
assert.ok(
  mixed.companySentiments!.find((s) => s.ticker === "TSLA")!.sentiment > 0.15,
);
console.log(
  `${cases.length + 5} model regression checks passed. These examples are not an accuracy benchmark.`,
);
for (const item of parity) {
  const signal = await engine.analyze({
    text: item.text,
    sourceKind: "manual",
    sourceName: "Inference parity",
    publishedAt: new Date().toISOString(),
  });
  for (const label of ["positive", "negative", "neutral"] as const)
    assert.ok(
      Math.abs(signal.probabilities![label] - item.probabilities[label]) <
        0.005,
      `Python/JavaScript probability mismatch for ${label}: ${item.text}`,
    );
}
console.log(
  `${parity.length} Python/JavaScript inference parity cases passed.`,
);
