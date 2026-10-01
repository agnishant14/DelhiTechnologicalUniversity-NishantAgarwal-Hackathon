import type { Document } from "../shared/types";

// Original fictional scenarios, not scraped headlines or historical market claims.
export const SCENARIOS: [string, "news" | "social"][] = [
  [
    "Apple reports record quarterly revenue as iPhone demand beats expectations.",
    "news",
  ],
  [
    "Microsoft Azure growth is strong. Enterprise demand looks bullish to me.",
    "social",
  ],
  [
    "Tesla misses earnings expectations as profit declines and demand weakens.",
    "news",
  ],
  ["NVIDIA launches a new chip as strong demand drives record orders.", "news"],
  ["Amazon earnings exceed forecasts with improved profit margins.", "news"],
  [
    "JPMorgan credit losses surge as borrowers default amid a liquidity crisis.",
    "news",
  ],
  [
    "Google launches a new product. The announcement is scheduled for Monday.",
    "social",
  ],
  [
    "Exxon Mobil profits decline as oil demand falls and recession fears mount.",
    "news",
  ],
  ["Meta Platforms reports strong revenue growth and higher profits.", "news"],
  ["Johnson & Johnson faces a lawsuit over a major product recall.", "news"],
  [
    "I am optimistic about NVIDIA. Record growth and strong demand beat expectations.",
    "social",
  ],
  [
    "Tesla is disappointing. Weak sales and mounting losses make me bearish.",
    "social",
  ],
  [
    "New export restrictions threaten NVIDIA sales as geopolitical tensions intensify.",
    "news",
  ],
  [
    "Apple announces an acquisition to strengthen its services business.",
    "news",
  ],
  [
    "Microsoft faces a massive cloud outage affecting enterprise customers nationwide.",
    "news",
  ],
  [
    "JPMorgan reports improved earnings and strong growth after restructuring.",
    "social",
  ],
  [
    "Exxon Mobil sees profits surge following a sharp increase in oil prices.",
    "news",
  ],
  [
    "The Federal Reserve raises interest rates as inflation accelerates.",
    "news",
  ],
  [
    "Amazon faces an antitrust investigation and a possible regulatory fine.",
    "news",
  ],
  [
    "Johnson & Johnson unveils a new treatment with strong clinical results.",
    "news",
  ],
  [
    "Meta Platforms earnings plunge as advertising revenue misses expectations.",
    "social",
  ],
  ["Google reports record profits and raises its revenue guidance.", "news"],
  [
    "Tesla announces improved margins and strong quarterly earnings growth.",
    "news",
  ],
  [
    "Apple faces supply chain delays. I am worried about weak demand and declining sales.",
    "social",
  ],
];
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
