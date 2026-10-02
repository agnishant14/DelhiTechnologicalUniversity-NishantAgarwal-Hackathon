import type { CompanySentiment, TopicPrediction } from "./intelligence";

export const STOCKS = [
  {
    ticker: "AAPL",
    name: "Apple",
    sector: "Technology",
    aliases: ["Apple", "iPhone"],
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    sector: "Technology",
    aliases: ["Microsoft", "Azure"],
  },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology", aliases: ["Nvidia"] },
  {
    ticker: "AMZN",
    name: "Amazon",
    sector: "Consumer",
    aliases: ["Amazon", "AWS"],
  },
  {
    ticker: "GOOGL",
    name: "Alphabet",
    sector: "Technology",
    aliases: ["Alphabet", "Google"],
  },
  {
    ticker: "META",
    name: "Meta",
    sector: "Technology",
    aliases: ["Meta Platforms", "Facebook", "Instagram"],
  },
  { ticker: "TSLA", name: "Tesla", sector: "Consumer", aliases: ["Tesla"] },
  {
    ticker: "JPM",
    name: "JPMorgan",
    sector: "Financials",
    aliases: ["JPMorgan", "JP Morgan", "J.P. Morgan"],
  },
  {
    ticker: "XOM",
    name: "Exxon Mobil",
    sector: "Energy",
    aliases: ["Exxon", "ExxonMobil"],
  },
  {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    sector: "Healthcare",
    aliases: ["Johnson & Johnson", "Johnson and Johnson"],
  },
  {
    ticker: "V",
    name: "Visa",
    sector: "Financials",
    aliases: ["Visa"],
  },
  {
    ticker: "WMT",
    name: "Walmart",
    sector: "Consumer",
    aliases: ["Walmart"],
  },
  {
    ticker: "PG",
    name: "Procter & Gamble",
    sector: "Consumer",
    aliases: ["Procter & Gamble", "P&G", "Procter and Gamble"],
  },
  {
    ticker: "MA",
    name: "Mastercard",
    sector: "Financials",
    aliases: ["Mastercard"],
  },
  {
    ticker: "HD",
    name: "Home Depot",
    sector: "Consumer",
    aliases: ["Home Depot"],
  },
  {
    ticker: "UNH",
    name: "UnitedHealth",
    sector: "Healthcare",
    aliases: ["UnitedHealth", "UnitedHealthcare", "United Health"],
  },
  {
    ticker: "BAC",
    name: "Bank of America",
    sector: "Financials",
    aliases: ["Bank of America", "BofA"],
  },
  {
    ticker: "LLY",
    name: "Eli Lilly",
    sector: "Healthcare",
    aliases: ["Eli Lilly", "Lilly"],
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    sector: "Technology",
    aliases: ["Broadcom"],
  },
  {
    ticker: "COST",
    name: "Costco",
    sector: "Consumer",
    aliases: ["Costco"],
  },
] as const;
export type Ticker = (typeof STOCKS)[number]["ticker"];
export type Mode = "demo" | "live";
export type SourceKind = "news" | "social" | "manual";
export const EVENTS = [
  "Geopolitical",
  "Macroeconomic",
  "Credit Event",
  "Merger/Acquisition",
  "Product Launch",
  "Earnings",
  "Regulatory",
  "Operational",
  "General",
] as const;
export type EventType = (typeof EVENTS)[number];
export interface Document {
  text: string;
  sourceKind: SourceKind;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;
  isSample?: boolean;
}
export interface Signal extends Document {
  topic?: TopicPrediction;
  companySentiments?: CompanySentiment[];
  clusterId?: string;
  duplicateOf?: string;
  eventMethod?: "topic model" | "explicit cue" | "review";
  id: string;
  mode: Mode;
  tickers: Ticker[];
  sentiment: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  event: EventType;
  impact: number;
  confidence: number | null;
  model: "FinBERT" | "Lexicon fallback";
  probabilities: { positive: number; negative: number; neutral: number } | null;
  evidence: string[];
  ingestedAt: string;
}
export interface Holding {
  ticker: Ticker;
  name: string;
  sector: string;
  weight: number;
  previousWeight: number;
  sentiment: number;
  signalCount: number;
}
export interface Snapshot {
  id: string;
  timestamp: string;
  mode: Mode;
  weights: Record<Ticker, number>;
  turnover: number;
  reason: string;
}
export interface SourceStatus {
  name: string;
  kind: SourceKind;
  status: "idle" | "ok" | "error";
  fetched: number;
  lastFetched: string | null;
  error?: string;
}
export interface Dashboard {
  mode: Mode;
  ready: boolean;
  busy: boolean;
  engine: {
    status: "loading" | "ready" | "fallback";
    model: string;
    error?: string;
  };
  signals: Signal[];
  holdings: Holding[];
  history: Snapshot[];
  sources: SourceStatus[];
  stats: {
    total: number;
    sentiment: number;
    highImpact: number;
    lastUpdated: string | null;
  };
  replay: { position: number; total: number };
}

