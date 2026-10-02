import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { TopicPrediction } from "../shared/intelligence";

interface Artifact {
  version: string;
  labels: string[];
  vocabulary: Record<string, number>;
  idf: number[];
  coefficients: number[][];
  intercept: number[];
  threshold: number;
}
let artifact: Artifact | undefined;
function load() {
  artifact ??= JSON.parse(gunzipSync(readFileSync(new URL("../models/topic.json.gz", import.meta.url))).toString());
  return artifact!;
}
export function predictTopic(text: string): TopicPrediction {
  const model = load();
  const tokens = text.toLowerCase().replace(/https?:\/\/\S+/g, " ").match(/\b[a-z][a-z0-9]{1,}\b/g) ?? [];
  const terms = [...tokens, ...tokens.slice(1).map((t, i) => `${tokens[i]} ${t}`)];
  const counts = new Map<number, { term: string; value: number }>();
  for (const term of terms) {
    if (!Object.hasOwn(model.vocabulary, term)) continue;
    const index = model.vocabulary[term];
    counts.set(index, { term, value: (counts.get(index)?.value ?? 0) + 1 });
  }
  let squared = 0;
  for (const [i, item] of counts) {
    item.value = (1 + Math.log(item.value)) * model.idf[i];
    squared += item.value ** 2;
  }
  for (const item of counts.values()) item.value /= Math.sqrt(squared) || 1;
  const logits = model.intercept.map((bias, c) =>
    bias + [...counts].reduce((sum, [i, term]) => sum + term.value * model.coefficients[c][i], 0),
  );
  const exps = logits.map((v) => Math.exp(v - Math.max(...logits)));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ranking = exps.map((v, i) => ({ i, label: model.labels[i], probability: v / sum })).sort((a, b) => b.probability - a.probability);
  const top = ranking[0], runnerUp = ranking[1];
  return {
    label: top.label,
    confidence: top.probability,
    needsReview: top.probability < model.threshold || counts.size === 0,
    version: model.version,
    alternatives: ranking.map(({ label, probability }) => ({ label, probability })),
    terms: [...counts].map(([i, item]) => ({ term: item.term, contribution: item.value * (model.coefficients[top.i][i] - model.coefficients[runnerUp.i][i]) }))
      .filter((t) => t.contribution > 0).sort((a, b) => b.contribution - a.contribution).slice(0, 6),
  };
}
