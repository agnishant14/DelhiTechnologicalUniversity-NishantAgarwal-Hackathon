import { z } from "zod";
import dataset from "../data/demo.json";
import type { Document } from "../shared/types";

const records = z
  .array(
    z.object({
      id: z.string(),
      text: z.string().min(10).max(6000),
      sourceKind: z.enum(["news", "social"]),
    }),
  )
  .parse(dataset);

export const SCENARIOS: [string, "news" | "social"][] = records.map(
  ({ text, sourceKind }) => [text, sourceKind],
);

export function demoDocument(index: number, anchor: number): Document {
  const [text, sourceKind] = SCENARIOS[index];
  return {
    text,
    sourceKind,
    sourceName: sourceKind === "news" ? "Demo Newswire" : "Demo Community",
    publishedAt: new Date(
      Math.min(Date.now(), anchor + index * 60_000),
    ).toISOString(),
    isSample: true,
  };
}
