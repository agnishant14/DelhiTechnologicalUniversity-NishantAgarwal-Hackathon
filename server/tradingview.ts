import type { QuotesPayload, StockQuote } from "../shared/types";

export const TICKER_TO_TV: Record<string, string> = {
  AAPL: "NASDAQ:AAPL",
  MSFT: "NASDAQ:MSFT",
  NVDA: "NASDAQ:NVDA",
  AMZN: "NASDAQ:AMZN",
  GOOGL: "NASDAQ:GOOGL",
  META: "NASDAQ:META",
  TSLA: "NASDAQ:TSLA",
  JPM: "NYSE:JPM",
  XOM: "NYSE:XOM",
  JNJ: "NYSE:JNJ",
  V: "NYSE:V",
  WMT: "NASDAQ:WMT",
  PG: "NYSE:PG",
  MA: "NYSE:MA",
  HD: "NYSE:HD",
  UNH: "NYSE:UNH",
  BAC: "NYSE:BAC",
  LLY: "NYSE:LLY",
  AVGO: "NASDAQ:AVGO",
  COST: "NASDAQ:COST",
};

export const INDEX_ETF_MAP: Record<string, { symbol: string; name: string }> = {
  SPY: { symbol: "AMEX:SPY", name: "S&P 500" },
  QQQ: { symbol: "NASDAQ:QQQ", name: "NASDAQ 100" },
  DIA: { symbol: "AMEX:DIA", name: "DOW JONES" },
  GLD: { symbol: "AMEX:GLD", name: "GOLD (GLD)" },
  USO: { symbol: "AMEX:USO", name: "BRENT CRUDE" },
};

const SEED_QUOTES: Record<string, Omit<StockQuote, "history">> = {
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    symbol: "NASDAQ:NVDA",
    price: 230.86,
    changePct: 1.09,
    changeAbs: 2.48,
    volume: 98590603,
    open: 229.98,
    high: 232.29,
    low: 228.16,
    perf1M: 6.51,
    perf3M: 17.1,
    updatedAt: new Date().toISOString(),
  },
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    symbol: "NASDAQ:AAPL",
    price: 330.32,
    changePct: -0.81,
    changeAbs: -2.7,
    volume: 36305106,
    open: 330.0,
    high: 332.48,
    low: 325.81,
    perf1M: 4.21,
    perf3M: 12.31,
    updatedAt: new Date().toISOString(),
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    symbol: "NASDAQ:MSFT",
    price: 512.8,
    changePct: -0.02,
    changeAbs: -0.1,
    volume: 19731880,
    open: 519.88,
    high: 522.85,
    low: 512.17,
    perf1M: 3.07,
    perf3M: 33.37,
    updatedAt: new Date().toISOString(),
  },
  META: {
    ticker: "META",
    name: "Meta Platforms",
    symbol: "NASDAQ:META",
    price: 725.93,
    changePct: 0.1,
    changeAbs: 0.75,
    volume: 12407319,
    open: 728.53,
    high: 735.88,
    low: 721.51,
    perf1M: 30.01,
    perf3M: 19.42,
    updatedAt: new Date().toISOString(),
  },
  AMZN: {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    symbol: "NASDAQ:AMZN",
    price: 248.23,
    changePct: -0.37,
    changeAbs: -0.92,
    volume: 33243885,
    open: 251.61,
    high: 251.83,
    low: 246.12,
    perf1M: -2.59,
    perf3M: 2.74,
    updatedAt: new Date().toISOString(),
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    symbol: "NASDAQ:GOOGL",
    price: 338.24,
    changePct: -1.7,
    changeAbs: -5.84,
    volume: 33269114,
    open: 350.79,
    high: 353.22,
    low: 335.51,
    perf1M: 0.67,
    perf3M: -5.91,
    updatedAt: new Date().toISOString(),
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla Inc.",
    symbol: "NASDAQ:TSLA",
    price: 354.11,
    changePct: -0.2,
    changeAbs: -0.7,
    volume: 31080774,
    open: 356.81,
    high: 359.79,
    low: 353.8,
    perf1M: -1.88,
    perf3M: -17.27,
    updatedAt: new Date().toISOString(),
  },
  JPM: {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    symbol: "NYSE:JPM",
    price: 333.18,
    changePct: 0.71,
    changeAbs: 2.35,
    volume: 8164431,
    open: 328.75,
    high: 333.58,
    low: 325.87,
    perf1M: -6.34,
    perf3M: -1.43,
    updatedAt: new Date().toISOString(),
  },
  XOM: {
    ticker: "XOM",
    name: "Exxon Mobil Corp.",
    symbol: "NYSE:XOM",
    price: 163.82,
    changePct: 0.66,
    changeAbs: 1.07,
    volume: 11708604,
    open: 161.5,
    high: 164.08,
    low: 160.81,
    perf1M: 0.13,
    perf3M: 19.45,
    updatedAt: new Date().toISOString(),
  },
  JNJ: {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    symbol: "NYSE:JNJ",
    price: 258.66,
    changePct: -2.3,
    changeAbs: -6.08,
    volume: 8292415,
    open: 263.68,
    high: 263.98,
    low: 258.33,
    perf1M: -4.49,
    perf3M: 1.13,
    updatedAt: new Date().toISOString(),
  },
  V: {
    ticker: "V",
    name: "Visa Inc.",
    symbol: "NYSE:V",
    price: 359.85,
    changePct: 0.14,
    changeAbs: 0.52,
    volume: 5273106,
    open: 358.35,
    high: 363.24,
    low: 357.36,
    perf1M: -5.22,
    perf3M: 2.08,
    updatedAt: new Date().toISOString(),
  },
  WMT: {
    ticker: "WMT",
    name: "Walmart Inc.",
    symbol: "NASDAQ:WMT",
    price: 104.26,
    changePct: 0.33,
    changeAbs: 0.34,
    volume: 18500000,
    open: 103.9,
    high: 104.55,
    low: 103.6,
    perf1M: -0.81,
    perf3M: -4.64,
    updatedAt: new Date().toISOString(),
  },
  PG: {
    ticker: "PG",
    name: "Procter & Gamble Co.",
    symbol: "NYSE:PG",
    price: 143.95,
    changePct: -0.92,
    changeAbs: -1.33,
    volume: 7323305,
    open: 144.55,
    high: 145.0,
    low: 143.4,
    perf1M: -1.24,
    perf3M: -3.12,
    updatedAt: new Date().toISOString(),
  },
  MA: {
    ticker: "MA",
    name: "Mastercard Inc.",
    symbol: "NYSE:MA",
    price: 550.0,
    changePct: -0.27,
    changeAbs: -1.47,
    volume: 2893775,
    open: 551.0,
    high: 557.2,
    low: 546.12,
    perf1M: -6.72,
    perf3M: 3.83,
    updatedAt: new Date().toISOString(),
  },
  HD: {
    ticker: "HD",
    name: "Home Depot Inc.",
    symbol: "NYSE:HD",
    price: 282.46,
    changePct: -0.71,
    changeAbs: -2.03,
    volume: 7780689,
    open: 283.11,
    high: 283.85,
    low: 277.15,
    perf1M: -13.36,
    perf3M: -19.95,
    updatedAt: new Date().toISOString(),
  },
  UNH: {
    ticker: "UNH",
    name: "UnitedHealth Group Inc.",
    symbol: "NYSE:UNH",
    price: 365.2,
    changePct: -0.51,
    changeAbs: -1.88,
    volume: 3943260,
    open: 367.99,
    high: 371.86,
    low: 362.6,
    perf1M: -6.86,
    perf3M: -14.7,
    updatedAt: new Date().toISOString(),
  },
  BAC: {
    ticker: "BAC",
    name: "Bank of America Corp.",
    symbol: "NYSE:BAC",
    price: 53.73,
    changePct: -1.29,
    changeAbs: -0.7,
    volume: 60049479,
    open: 53.91,
    high: 54.34,
    low: 52.89,
    perf1M: -13.3,
    perf3M: -8.83,
    updatedAt: new Date().toISOString(),
  },
  LLY: {
    ticker: "LLY",
    name: "Eli Lilly and Co.",
    symbol: "NYSE:LLY",
    price: 1149.85,
    changePct: -0.62,
    changeAbs: -7.23,
    volume: 2174701,
    open: 1155.0,
    high: 1158.72,
    low: 1139.85,
    perf1M: -3.21,
    perf3M: -3.62,
    updatedAt: new Date().toISOString(),
  },
  AVGO: {
    ticker: "AVGO",
    name: "Broadcom Inc.",
    symbol: "NASDAQ:AVGO",
    price: 343.64,
    changePct: -2.15,
    changeAbs: -7.55,
    volume: 24574021,
    open: 352.15,
    high: 354.45,
    low: 343.29,
    perf1M: -5.66,
    perf3M: -6.04,
    updatedAt: new Date().toISOString(),
  },
  COST: {
    ticker: "COST",
    name: "Costco Wholesale Corp.",
    symbol: "NASDAQ:COST",
    price: 914.94,
    changePct: 0.51,
    changeAbs: 4.6,
    volume: 2126408,
    open: 910.87,
    high: 923.5,
    low: 903.78,
    perf1M: -3.42,
    perf3M: -1.3,
    updatedAt: new Date().toISOString(),
  },
};

function generateHistory(close: number, perf3M: number, perf1M: number) {
  const p3m = Number((close / (1 + (perf3M || 0) / 100)).toFixed(2));
  const p1m = Number((close / (1 + (perf1M || 0) / 100)).toFixed(2));
  const p2m = Number(((p3m + p1m) / 2).toFixed(2));
  return [
    { time: "3M", price: p3m },
    { time: "2M", price: p2m },
    { time: "1M", price: p1m },
    { time: "Now", price: close },
  ];
}

let cachedPayload: QuotesPayload | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30_000;

export async function fetchTradingViewQuotes(): Promise<QuotesPayload> {
  const now = Date.now();
  if (cachedPayload && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedPayload;
  }

  const stockTickers = Object.values(TICKER_TO_TV);
  const etfTickers = Object.values(INDEX_ETF_MAP).map((e) => e.symbol);
  const allTickers = [...stockTickers, ...etfTickers];

  const stocksMap: Record<string, StockQuote> = {};
  for (const [t, data] of Object.entries(SEED_QUOTES)) {
    stocksMap[t] = {
      ...data,
      history: generateHistory(data.price, data.perf3M, data.perf1M),
    };
  }

  const indicesList = [
    {
      name: "S&P 500",
      symbol: "AMEX:SPY",
      val: "763.99",
      delta: "+1.36 (+0.18%)",
      positive: true,
    },
    {
      name: "NASDAQ 100",
      symbol: "NASDAQ:QQQ",
      val: "742.03",
      delta: "+2.26 (+0.31%)",
      positive: true,
    },
    {
      name: "DOW JONES",
      symbol: "AMEX:DIA",
      val: "508.62",
      delta: "+0.07 (+0.01%)",
      positive: true,
    },
    {
      name: "CRISIL COMPOSITE",
      symbol: "CRISIL",
      val: "15,540.10",
      delta: "-18.39 (-0.12%)",
      positive: false,
    },
    {
      name: "GOLD (OUNCE)",
      symbol: "AMEX:GLD",
      val: "382.76",
      delta: "+1.92 (+0.50%)",
      positive: true,
    },
    {
      name: "BRENT CRUDE",
      symbol: "AMEX:USO",
      val: "150.02",
      delta: "+4.36 (+2.99%)",
      positive: true,
    },
    {
      name: "US 10Y YIELD",
      symbol: "US10Y",
      val: "4.28%",
      delta: "-0.04 (-0.92%)",
      positive: false,
    },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: allTickers },
        columns: [
          "close",
          "change",
          "change_abs",
          "volume",
          "open",
          "high",
          "low",
          "Perf.1M",
          "Perf.3M",
          "description",
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = (await res.json()) as {
        data?: { s: string; d: (number | string)[] }[];
      };
      if (Array.isArray(json.data) && json.data.length > 0) {
        const tvToTicker = Object.fromEntries(
          Object.entries(TICKER_TO_TV).map(([k, v]) => [v, k]),
        );

        for (const row of json.data) {
          const sym = row.s;
          const d = row.d;
          const close = Number(d[0]) || 0;
          const changePct = Number(d[1]) || 0;
          const changeAbs = Number(d[2]) || 0;
          const volume = Number(d[3]) || 0;
          const open = Number(d[4]) || close;
          const high = Number(d[5]) || close;
          const low = Number(d[6]) || close;
          const perf1M = Number(d[7]) || 0;
          const perf3M = Number(d[8]) || 0;
          const desc = String(d[9] || "");

          const matchedTicker = tvToTicker[sym];
          if (matchedTicker) {
            stocksMap[matchedTicker] = {
              ticker: matchedTicker,
              name: desc || SEED_QUOTES[matchedTicker]?.name || matchedTicker,
              symbol: sym,
              price: close,
              changePct: Number(changePct.toFixed(2)),
              changeAbs: Number(changeAbs.toFixed(2)),
              volume,
              open,
              high,
              low,
              perf1M: Number(perf1M.toFixed(2)),
              perf3M: Number(perf3M.toFixed(2)),
              history: generateHistory(close, perf3M, perf1M),
              updatedAt: new Date().toISOString(),
            };
          }

          if (sym === "AMEX:SPY") {
            const idx = indicesList.find((i) => i.name === "S&P 500");
            if (idx) {
              idx.val = close.toFixed(2);
              idx.delta = `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`;
              idx.positive = changePct >= 0;
            }
          } else if (sym === "NASDAQ:QQQ") {
            const idx = indicesList.find((i) => i.name === "NASDAQ 100");
            if (idx) {
              idx.val = close.toFixed(2);
              idx.delta = `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`;
              idx.positive = changePct >= 0;
            }
          } else if (sym === "AMEX:DIA") {
            const idx = indicesList.find((i) => i.name === "DOW JONES");
            if (idx) {
              idx.val = close.toFixed(2);
              idx.delta = `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`;
              idx.positive = changePct >= 0;
            }
          } else if (sym === "AMEX:GLD") {
            const idx = indicesList.find((i) => i.name === "GOLD (OUNCE)");
            if (idx) {
              idx.val = close.toFixed(2);
              idx.delta = `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`;
              idx.positive = changePct >= 0;
            }
          } else if (sym === "AMEX:USO") {
            const idx = indicesList.find((i) => i.name === "BRENT CRUDE");
            if (idx) {
              idx.val = close.toFixed(2);
              idx.delta = `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`;
              idx.positive = changePct >= 0;
            }
          }
        }
      }
    }
  } catch {
    // Graceful offline fallback using SEED_QUOTES
  }

  const payload: QuotesPayload = {
    source: "tradingview",
    updatedAt: new Date().toISOString(),
    stocks: stocksMap,
    indices: indicesList,
  };

  cachedPayload = payload;
  lastFetchTime = now;
  return payload;
}
