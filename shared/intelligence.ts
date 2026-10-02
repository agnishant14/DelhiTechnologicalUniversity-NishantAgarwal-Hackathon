import type { EventType, Holding, Mode, Signal, Ticker } from "./types";

export interface TopicPrediction {
  label: string;
  confidence: number;
  needsReview: boolean;
  version: string;
  alternatives: { label: string; probability: number }[];
  terms: { term: string; contribution: number }[];
}
export interface CompanySentiment {
  ticker: Ticker;
  sentiment: number;
  text: string;
  scope: "company sentence" | "shared headline";
}
export interface Shocks {
  equityPct: number;
  ratesBps: number;
  creditBps: number;
  fxPct: number;
}
export interface Asset {
  id: string;
  name: string;
  type: "Loan" | "Bond" | "Equity" | "Derivative";
  sector: string;
  value: number;
  duration: number;
  spreadDuration: number;
  equityBeta: number;
  fxExposure: number;
  rateDv01: number;
}
export interface StressResult {
  analysisVersion?: string;
  id: string;
  mode: Mode;
  timestamp: string;
  event: EventType;
  trigger: "automatic" | "sandbox";
  signalId?: string;
  headline?: string;
  impact: number;
  shocks: Shocks;
  before: number;
  after: number;
  pnl: number;
  pnlPct: number;
  contributions: {
    asset: Asset;
    before: number;
    after: number;
    pnl: number;
    drivers: Shocks;
  }[];
}
export interface StressDashboard {
  assets: Asset[];
  totalValue: number;
  history: StressResult[];
  presets: Record<EventType, Shocks>;
}
export interface PreviewResult {
  signal: Signal;
  holdings: Holding[];
  turnover: number;
  stress: StressResult;
}
