export interface MarketTick {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  ma: number;
  sentimentImpact?: number;
}

export interface MarketDepthRow {
  orders: number;
  quantity: number;
  price: number;
}

export interface MarketDepth {
  bids: MarketDepthRow[];
  asks: MarketDepthRow[];
  totalBuyQty: number;
  totalSellQty: number;
}

export interface StockLiveState {
  ticker: string;
  price: number;
  prevPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  flash: "up" | "down" | null;
  history: MarketTick[];
}

export const BASE_STOCK_PRICES: Record<string, number> = {
  AAPL: 232.85,
  MSFT: 448.2,
  NVDA: 128.65,
  AMZN: 186.4,
  GOOGL: 179.5,
  META: 582.1,
  TSLA: 254.3,
  JPM: 221.4,
  XOM: 118.9,
  JNJ: 161.75,
};

function formatTime(d: Date): string {
  return d.toTimeString().split(" ")[0];
}

export function generateInitialTicks(
  ticker: string,
  timeframe: string,
  sentiment: number = 0,
): { ticks: MarketTick[]; openPrice: number } {
  const base = BASE_STOCK_PRICES[ticker] ?? 150;
  const count = timeframe === "1D" ? 36 : timeframe === "1W" ? 28 : 24;
  const now = new Date();
  const ticks: MarketTick[] = [];

  let current = base * (1 - 0.012 + sentiment * 0.008);
  const openPrice = Number(current.toFixed(2));
  const prices: number[] = [];

  for (let i = count; i >= 0; i--) {
    const pointTime = new Date(now.getTime() - i * 60000);
    const noise = (Math.random() - 0.485 + sentiment * 0.12) * (base * 0.0035);
    current = Math.max(base * 0.7, current + noise);
    prices.push(current);

    const windowStart = Math.max(0, prices.length - 7);
    const windowSlice = prices.slice(windowStart);
    const ma = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;

    const candleVariation = Math.random() * (base * 0.002);
    const high = Math.max(current, current + candleVariation);
    const low = Math.min(current, current - candleVariation);
    const volume = Math.floor(15000 + Math.random() * 35000 + Math.abs(sentiment) * 20000);

    ticks.push({
      time:
        timeframe === "1D"
          ? formatTime(pointTime)
          : pointTime.toLocaleDateString([], { month: "short", day: "numeric" }),
      price: Number(current.toFixed(2)),
      open: Number((current - noise * 0.4).toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume,
      ma: Number(ma.toFixed(2)),
    });
  }

  return { ticks, openPrice };
}

export function generateNextTick(
  prev: MarketTick,
  sentiment: number = 0,
  impact: number = 5,
  recentPrices: number[] = [],
): MarketTick {
  const now = new Date();
  const base = prev.price;
  const volatility = 0.0018 + (impact / 10) * 0.0025;
  const drift = sentiment * 0.0012;
  const shock = (Math.random() - 0.49 + drift) * (base * volatility);
  const nextPrice = Number(Math.max(1, base + shock).toFixed(2));

  const updatedPrices = [...recentPrices, nextPrice].slice(-7);
  const ma = Number(
    (updatedPrices.reduce((a, b) => a + b, 0) / updatedPrices.length).toFixed(2),
  );

  const candleVar = Math.random() * (base * 0.0015);
  const high = Number(Math.max(nextPrice, prev.price + candleVar).toFixed(2));
  const low = Number(Math.min(nextPrice, prev.price - candleVar).toFixed(2));
  const volume = Math.floor(8000 + Math.random() * 25000 + impact * 3000);

  return {
    time: formatTime(now),
    price: nextPrice,
    open: prev.price,
    high,
    low,
    volume,
    ma,
    sentimentImpact: impact >= 7 ? sentiment : undefined,
  };
}

export function generateMarketDepth(
  currentPrice: number,
  sentiment: number = 0,
): MarketDepth {
  const tickStep = currentPrice > 200 ? 0.05 : 0.02;
  const bids: MarketDepthRow[] = [];
  const asks: MarketDepthRow[] = [];

  const sentimentSkew = 1 + sentiment * 0.35;
  let totalBuy = 0;
  let totalSell = 0;

  for (let i = 1; i <= 5; i++) {
    const bidPrice = Number((currentPrice - i * tickStep).toFixed(2));
    const askPrice = Number((currentPrice + i * tickStep).toFixed(2));

    const bidQty = Math.floor((1200 + Math.random() * 3000) * sentimentSkew);
    const askQty = Math.floor((1200 + Math.random() * 3000) * (2 - sentimentSkew));

    bids.push({
      price: bidPrice,
      orders: Math.floor(4 + Math.random() * 18),
      quantity: bidQty,
    });
    asks.push({
      price: askPrice,
      orders: Math.floor(4 + Math.random() * 18),
      quantity: askQty,
    });

    totalBuy += bidQty;
    totalSell += askQty;
  }

  return {
    bids,
    asks,
    totalBuyQty: totalBuy,
    totalSellQty: totalSell,
  };
}
