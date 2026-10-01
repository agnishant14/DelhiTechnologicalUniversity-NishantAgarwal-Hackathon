import {
  STOCKS,
  EVENTS,
  type ContagionNode,
  type ContagionReport,
  type CreditRatingGrade,
  type CreditRatingInfo,
  type CreditRatingsResponse,
  type EventType,
  type Holding,
  type Signal,
  type Ticker,
  type TokenAttribution,
  type ValueAtRiskMetrics,
  type WhatIfSimulationResult,
} from "../shared/types";
import { rebalance, equalWeights } from "./portfolio";
import { classifyEvent, detectTickers, fallbackSentiment, type RiskEngine } from "./engine";

const RATING_SCALE: CreditRatingGrade[] = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "B",
  "CCC",
  "D",
];

const BASE_RATINGS: Record<
  Ticker,
  { rating: CreditRatingGrade; baselinePD: number; spread: number }
> = {
  AAPL: { rating: "AA+", baselinePD: 0.04, spread: 45 },
  MSFT: { rating: "AAA", baselinePD: 0.02, spread: 35 },
  NVDA: { rating: "AA", baselinePD: 0.09, spread: 65 },
  AMZN: { rating: "AA", baselinePD: 0.08, spread: 62 },
  GOOGL: { rating: "AA+", baselinePD: 0.05, spread: 48 },
  META: { rating: "AA-", baselinePD: 0.12, spread: 75 },
  TSLA: { rating: "BBB+", baselinePD: 0.65, spread: 165 },
  JPM: { rating: "A-", baselinePD: 0.35, spread: 115 },
  XOM: { rating: "AA-", baselinePD: 0.14, spread: 80 },
  JNJ: { rating: "AAA", baselinePD: 0.02, spread: 38 },
  V: { rating: "AA-", baselinePD: 0.11, spread: 72 },
  WMT: { rating: "AA", baselinePD: 0.08, spread: 58 },
  PG: { rating: "AA", baselinePD: 0.07, spread: 55 },
  MA: { rating: "AA-", baselinePD: 0.13, spread: 78 },
  HD: { rating: "A", baselinePD: 0.22, spread: 98 },
  UNH: { rating: "A+", baselinePD: 0.18, spread: 88 },
  BAC: { rating: "A-", baselinePD: 0.42, spread: 128 },
  LLY: { rating: "A+", baselinePD: 0.16, spread: 84 },
  AVGO: { rating: "BBB", baselinePD: 0.88, spread: 195 },
  COST: { rating: "AA-", baselinePD: 0.11, spread: 70 },
};

// Inter-company dependency graph (2nd order supply chain and financial network)
const CONTAGION_LINKS: {
  source: Ticker;
  target: Ticker;
  rel: ContagionNode["relationship"];
  elasticity: number;
  reason: string;
}[] = [
  {
    source: "NVDA",
    target: "MSFT",
    rel: "Cloud Partner",
    elasticity: 0.65,
    reason: "Azure AI infrastructure heavily dependent on Blackwell GPU allocation.",
  },
  {
    source: "NVDA",
    target: "AMZN",
    rel: "Cloud Partner",
    elasticity: 0.55,
    reason: "AWS enterprise generative AI capacity directly coupled to accelerator supply.",
  },
  {
    source: "NVDA",
    target: "AVGO",
    rel: "Peer Sector",
    elasticity: 0.7,
    reason: "Semiconductor capex and advanced packaging capacity shared across supply chain.",
  },
  {
    source: "AAPL",
    target: "AVGO",
    rel: "Supplier",
    elasticity: 0.6,
    reason: "Broadcom supplies proprietary RF filters and Wi-Fi modules for iPhone lines.",
  },
  {
    source: "AAPL",
    target: "GOOGL",
    rel: "Customer",
    elasticity: 0.45,
    reason: "Google default search placement contract on iOS ecosystem ($20B annual revenue sharing).",
  },
  {
    source: "JPM",
    target: "BAC",
    rel: "Financial Clearing",
    elasticity: 0.75,
    reason: "Interbank wholesale liquidity clearing, syndicated loan books, and OTC swaps counterparties.",
  },
  {
    source: "V",
    target: "MA",
    rel: "Peer Sector",
    elasticity: 0.85,
    reason: "Global card payment processing duopoly exposed to joint interchange fee regulation.",
  },
  {
    source: "AMZN",
    target: "WMT",
    rel: "Peer Sector",
    elasticity: 0.5,
    reason: "US retail consumer spending pressure and logistics wage inflation spillover.",
  },
  {
    source: "XOM",
    target: "UNH",
    rel: "Peer Sector",
    elasticity: 0.3,
    reason: "Macro energy inflation drives wholesale healthcare provider supply cost inflation.",
  },
  {
    source: "MSFT",
    target: "META",
    rel: "Cloud Partner",
    elasticity: 0.4,
    reason: "Llama enterprise model hosting and hyperscaler datacenter energy interconnects.",
  },
];

export function computeCreditRatings(signals: Signal[]): CreditRatingsResponse {
  const ratings: CreditRatingInfo[] = STOCKS.map((stk) => {
    const base = BASE_RATINGS[stk.ticker] ?? {
      rating: "A",
      baselinePD: 0.25,
      spread: 100,
    };
    const matching = signals.filter((s) => s.tickers.includes(stk.ticker));
    const recent = matching.slice(0, 10);

    let notchAdjustment = 0;
    let pdShiftBps = 0;
    const drivers: string[] = [];

    for (const s of recent) {
      if (s.sentiment < -0.25 && s.impact >= 7) {
        if (s.event === "Credit Event") {
          notchAdjustment += 2;
          pdShiftBps += 65;
          drivers.push(`Credit downgrade pressure: ${s.text.slice(0, 50)}...`);
        } else if (s.event === "Regulatory" || s.event === "Operational") {
          notchAdjustment += 1;
          pdShiftBps += 25;
          drivers.push(`Regulatory scrutiny: ${s.text.slice(0, 50)}...`);
        } else {
          pdShiftBps += 12;
        }
      } else if (s.sentiment > 0.35 && s.impact >= 6) {
        notchAdjustment -= 1;
        pdShiftBps -= 15;
        drivers.push(`Earnings strength: ${s.text.slice(0, 50)}...`);
      }
    }

    const baseIndex = RATING_SCALE.indexOf(base.rating);
    const newIndex = Math.max(
      0,
      Math.min(RATING_SCALE.length - 1, baseIndex + notchAdjustment),
    );
    const currentRating = RATING_SCALE[newIndex];

    let outlook: CreditRatingInfo["outlook"] = "Stable";
    if (notchAdjustment > 1 || pdShiftBps > 40) {
      outlook = "Rating Watch Negative";
    } else if (notchAdjustment === 1) {
      outlook = "Negative";
    } else if (notchAdjustment < 0) {
      outlook = "Positive";
    }

    const pd1YearPct = Number(
      Math.max(0.01, base.baselinePD + pdShiftBps / 100).toFixed(2),
    );
    const impliedSpreadBps = Math.max(
      20,
      Math.round(base.spread + pdShiftBps * 1.8),
    );

    if (!drivers.length) {
      drivers.push("Financial fundamentals consistent with historical investment grade metrics.");
    }

    return {
      ticker: stk.ticker,
      name: stk.name,
      sector: stk.sector,
      rating: currentRating,
      previousRating: base.rating,
      outlook,
      pd1YearPct,
      pdChangeBps: pdShiftBps,
      impliedSpreadBps,
      drivers: drivers.slice(0, 3),
    };
  });

  const avgPd = Number(
    (ratings.reduce((sum, r) => sum + r.pd1YearPct, 0) / ratings.length).toFixed(2),
  );
  const highRisk = ratings.filter(
    (r) => r.outlook === "Rating Watch Negative" || r.pd1YearPct > 0.5,
  ).length;

  return {
    averageRating: "A+",
    portfolioWeightedPD: avgPd,
    highRiskCount: highRisk,
    ratings,
  };
}

export function computeContagion(signals: Signal[]): ContagionReport {
  const primaryShocks: ContagionReport["primaryShocks"] = [];
  const spillovers: ContagionNode[] = [];

  for (const s of signals) {
    if (Math.abs(s.sentiment) >= 0.2 && s.impact >= 6 && s.tickers.length > 0) {
      for (const t of s.tickers) {
        const stk = STOCKS.find((x) => x.ticker === t);
        if (stk && !primaryShocks.some((p) => p.ticker === t)) {
          primaryShocks.push({
            ticker: t,
            name: stk.name,
            sentiment: s.sentiment,
            impact: s.impact,
            event: s.event,
          });
        }
      }
    }
  }

  for (const shock of primaryShocks) {
    const links = CONTAGION_LINKS.filter((l) => l.source === shock.ticker);
    for (const link of links) {
      const targetStk = STOCKS.find((s) => s.ticker === link.target);
      if (!targetStk) continue;

      const simulatedDragPct = Number(
        (
          shock.sentiment *
          link.elasticity *
          (shock.impact / 10) *
          2.5
        ).toFixed(2),
      );

      spillovers.push({
        sourceTicker: shock.ticker,
        targetTicker: link.target,
        targetName: targetStk.name,
        relationship: link.rel,
        spilloverElasticity: link.elasticity,
        simulatedDragPct,
        rationale: link.reason,
      });
    }
  }

  const rawRisk =
    primaryShocks.reduce((sum, s) => sum + s.impact * Math.abs(s.sentiment), 0) *
    4.5;
  const systemicRiskIndex = Math.min(100, Math.max(10, Math.round(rawRisk || 24)));

  const systemicStatus: ContagionReport["systemicStatus"] =
    systemicRiskIndex > 65
      ? "High Contagion Vulnerability"
      : systemicRiskIndex > 35
        ? "Elevated Cross-Asset Spillover"
        : "Low Contagion Risk";

  return {
    primaryShocks,
    spillovers,
    systemicRiskIndex,
    systemicStatus,
  };
}

export function computeValueAtRisk(
  signals: Signal[],
  portfolioValue = 100_000_000,
): ValueAtRiskMetrics {
  const negativeSignals = signals.filter((s) => s.sentiment < -0.1);
  const avgNegative = negativeSignals.length
    ? Math.abs(
        negativeSignals.reduce((sum, s) => sum + s.sentiment, 0) /
          negativeSignals.length,
      )
    : 0.15;
  const highImpactCount = signals.filter((s) => s.impact >= 7).length;

  // Daily volatility scaling (annualized ~16% base adjusted for NLP sentiment severity)
  const dailySigma = 0.0105 + avgNegative * 0.007 + highImpactCount * 0.0012;

  const var95_1d_Millions = Number(
    ((portfolioValue * 1.645 * dailySigma) / 1_000_000).toFixed(2),
  );
  const var99_1d_Millions = Number(
    ((portfolioValue * 2.326 * dailySigma) / 1_000_000).toFixed(2),
  );
  const var95_10d_Millions = Number(
    (var95_1d_Millions * Math.sqrt(10)).toFixed(2),
  );
  const cvar95_1d_Millions = Number(
    ((portfolioValue * 2.062 * dailySigma) / 1_000_000).toFixed(2),
  );

  const capitalAdequacyTier1 = Math.max(
    6.0,
    Number((15.4 - var99_1d_Millions * 0.45).toFixed(1)),
  );
  const capitalAdequacyStatus: ValueAtRiskMetrics["capitalAdequacyStatus"] =
    capitalAdequacyTier1 >= 10.5
      ? "Compliant"
      : capitalAdequacyTier1 >= 8.5
        ? "Watch"
        : "Breach";

  // Generate 25 normal distribution curve points around the mean
  const distributionPoints: ValueAtRiskMetrics["distributionPoints"] = [];
  const mean = 0.2; // slight positive expected return drift
  const std = var95_1d_Millions;

  for (let i = -12; i <= 12; i++) {
    const lossMillions = Number((mean + (i / 4) * std).toFixed(2));
    const exponent = -0.5 * Math.pow((lossMillions - mean) / std, 2);
    const density = Number(
      ((1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent) * 10).toFixed(3),
    );
    const isTail = lossMillions >= var95_1d_Millions;
    distributionPoints.push({
      lossAmountMillions: lossMillions,
      probabilityDensity: Math.max(0.005, density),
      isTailLoss: isTail,
    });
  }

  return {
    portfolioValue,
    confidenceLevels: {
      var95_1d_Millions,
      var99_1d_Millions,
      var95_10d_Millions,
      cvar95_1d_Millions,
    },
    baselTier1Ratio: capitalAdequacyTier1,
    minimumRegulatoryTier1: 10.5,
    capitalAdequacyStatus,
    stressBufferMillions: Number(
      (portfolioValue * 0.12 - var99_1d_Millions * 1_000_000 / 1_000_000).toFixed(2),
    ),
    distributionPoints,
  };
}

const POSITIVE_LEXICON = new Set([
  "record",
  "profit",
  "profits",
  "beat",
  "beats",
  "beating",
  "growth",
  "strong",
  "surge",
  "surging",
  "dividend",
  "expansion",
  "partnership",
  "approved",
  "approval",
  "gain",
  "gains",
  "raised",
  "raises",
  "rally",
  "breakthrough",
  "outperform",
  "exceeds",
]);

const NEGATIVE_LEXICON = new Set([
  "drop",
  "drops",
  "plunge",
  "plunges",
  "fall",
  "falls",
  "loss",
  "losses",
  "investigation",
  "probe",
  "lawsuit",
  "fine",
  "fined",
  "warning",
  "warns",
  "cut",
  "cuts",
  "antitrust",
  "downgrade",
  "default",
  "defaults",
  "bankruptcy",
  "recession",
  "inflation",
  "crisis",
]);

export async function simulateWhatIf(
  headline: string,
  engine: RiskEngine,
  currentHoldings: Holding[] = [],
): Promise<WhatIfSimulationResult> {
  const clean = headline.trim();
  const words = clean.split(/\s+/);

  const tokenAttributions: TokenAttribution[] = words.map((w) => {
    const normalized = w.toLowerCase().replace(/[^a-z]/g, "");
    if (POSITIVE_LEXICON.has(normalized)) {
      return { word: w, score: 0.85, type: "pos" };
    }
    if (NEGATIVE_LEXICON.has(normalized)) {
      return { word: w, score: -0.85, type: "neg" };
    }
    return { word: w, score: 0, type: "neu" };
  });

  const signal = await engine.analyze({
    text: clean,
    sourceKind: "manual",
    sourceName: "What-If Simulator",
    publishedAt: new Date().toISOString(),
  });

  const detectedTickers = signal.tickers;

  // Previous weights map
  const previousWeights: Record<Ticker, number> = equalWeights();
  for (const h of currentHoldings) {
    previousWeights[h.ticker] = h.weight;
  }

  const { weights: rebalancedWeights, turnover } = rebalance(
    [signal],
    previousWeights,
  );

  const weightDeltas = STOCKS.map((stk) => {
    const before = previousWeights[stk.ticker] ?? 1 / STOCKS.length;
    const after = rebalancedWeights[stk.ticker] ?? 1 / STOCKS.length;
    return {
      ticker: stk.ticker,
      name: stk.name,
      beforeWeight: Number((before * 100).toFixed(2)),
      afterWeight: Number((after * 100).toFixed(2)),
      deltaWeight: Number(((after - before) * 100).toFixed(2)),
    };
  });

  // Wholesale banking stress test simulation on $100M book
  const baseAssets = [
    { assetClass: "Corporate Loans", beforeMillions: 40.0 },
    { assetClass: "Sovereign & IG Bonds", beforeMillions: 30.0 },
    { assetClass: "Large-Cap Equities", beforeMillions: 18.0 },
    { assetClass: "Rates & FX Derivatives", beforeMillions: 12.0 },
  ];

  const shockSeverity = (signal.impact / 10) * signal.sentiment;
  const stressDelta = baseAssets.map((asset) => {
    let shockMultiplier = 0.08;
    if (asset.assetClass === "Large-Cap Equities") shockMultiplier = 0.15;
    if (asset.assetClass === "Corporate Loans") shockMultiplier = 0.09;
    if (asset.assetClass === "Sovereign & IG Bonds") shockMultiplier = -0.04; // flight to safety

    const shockPct = Number((shockSeverity * shockMultiplier * 100).toFixed(2));
    const deltaMillions = Number(
      ((asset.beforeMillions * shockPct) / 100).toFixed(2),
    );
    const afterMillions = Number(
      (asset.beforeMillions + deltaMillions).toFixed(2),
    );

    return {
      assetClass: asset.assetClass,
      beforeMillions: asset.beforeMillions,
      afterMillions,
      deltaMillions,
      shockPct,
    };
  });

  const totalPnlImpactMillions = Number(
    stressDelta.reduce((sum, a) => sum + a.deltaMillions, 0).toFixed(2),
  );

  return {
    headline: clean,
    sentiment: signal.sentiment,
    sentimentLabel: signal.sentimentLabel,
    event: signal.event,
    impact: signal.impact,
    detectedTickers,
    confidence: signal.confidence ?? 0.8,
    tokenAttributions,
    weightDeltas,
    turnoverPct: Number((turnover * 100).toFixed(2)),
    stressDelta,
    totalPnlImpactMillions,
  };
}
