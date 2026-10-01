import {
  STOCKS,
  type Holding,
  type Signal,
  type Ticker,
} from "../shared/types";

export const POLICY = {
  minWeight: 0.02,
  maxWeight: 0.15,
  maxTurnover: 0.08,
  halfLifeHours: 6,
  lookbackHours: 24,
  sensitivity: 0.8,
};
export const equalWeights = () =>
  Object.fromEntries(
    STOCKS.map((s) => [s.ticker, 1 / STOCKS.length]),
  ) as Record<Ticker, number>;
export function aggregate(signals: Signal[], now = Date.now()) {
  return Object.fromEntries(
    STOCKS.map((stock) => {
      const relevant = signals.filter(
        (s) =>
          s.tickers.includes(stock.ticker) &&
          now - Date.parse(s.publishedAt) <= POLICY.lookbackHours * 3600000 &&
          Date.parse(s.publishedAt) <= now,
      );
      let numerator = 0,
        denominator = 0;
      relevant.forEach((s) => {
        const age = (now - Date.parse(s.publishedAt)) / 3600000;
        const weight =
          2 ** (-age / POLICY.halfLifeHours) *
          (s.sourceKind === "social" ? 0.6 : 1);
        numerator += s.sentiment * weight;
        denominator += weight;
      });
      return [
        stock.ticker,
        {
          sentiment: denominator ? numerator / denominator : 0,
          signalCount: relevant.length,
        },
      ];
    }),
  ) as Record<Ticker, { sentiment: number; signalCount: number }>;
}

export function rebalance(
  signals: Signal[],
  previous = equalWeights(),
  now = Date.now(),
) {
  const scores = aggregate(signals, now);
  const baseWeight = 1 / STOCKS.length;
  const raw = STOCKS.map(
    (s) => baseWeight * (1 + POLICY.sensitivity * scores[s.ticker].sentiment),
  );
  // Project onto a bounded simplex while preserving relative scores.
  let low = 0,
    high = 100;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const sum = raw.reduce(
      (s, value) =>
        s + Math.max(POLICY.minWeight, Math.min(POLICY.maxWeight, value * mid)),
      0,
    );
    if (sum > 1) high = mid;
    else low = mid;
  }
  const target = raw.map((value) =>
    Math.max(
      POLICY.minWeight,
      Math.min(POLICY.maxWeight, (value * (low + high)) / 2),
    ),
  );
  const proposedTurnover =
    STOCKS.reduce(
      (sum, s, i) => sum + Math.abs(target[i] - previous[s.ticker]),
      0,
    ) / 2;
  const fraction =
    proposedTurnover > POLICY.maxTurnover
      ? POLICY.maxTurnover / proposedTurnover
      : 1;
  const weights = Object.fromEntries(
    STOCKS.map((s, i) => [
      s.ticker,
      previous[s.ticker] + (target[i] - previous[s.ticker]) * fraction,
    ]),
  ) as Record<Ticker, number>;
  const turnover =
    STOCKS.reduce(
      (sum, s) => sum + Math.abs(weights[s.ticker] - previous[s.ticker]),
      0,
    ) / 2;
  return { weights, turnover };
}

export function holdings(
  signals: Signal[],
  current = equalWeights(),
  previous = equalWeights(),
): Holding[] {
  const scores = aggregate(signals);
  return STOCKS.map(({ ticker, name, sector }) => ({
    ticker,
    name,
    sector,
    weight: current[ticker],
    previousWeight: previous[ticker],
    ...scores[ticker],
  }));
}
