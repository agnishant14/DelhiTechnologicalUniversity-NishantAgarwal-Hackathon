import { useEffect, useState, type ReactElement } from "react";

interface StockLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

export const REMOTE_STOCK_LOGOS: Record<string, string> = {
  AAPL: "https://financialmodelingprep.com/image-stock/AAPL.png",
  MSFT: "https://financialmodelingprep.com/image-stock/MSFT.png",
  NVDA: "https://financialmodelingprep.com/image-stock/NVDA.png",
  AMZN: "https://financialmodelingprep.com/image-stock/AMZN.png",
  GOOGL: "https://financialmodelingprep.com/image-stock/GOOGL.png",
  META: "https://financialmodelingprep.com/image-stock/META.png",
  TSLA: "https://financialmodelingprep.com/image-stock/TSLA.png",
  JPM: "https://financialmodelingprep.com/image-stock/JPM.png",
  XOM: "https://financialmodelingprep.com/image-stock/XOM.png",
  JNJ: "https://financialmodelingprep.com/image-stock/JNJ.png",
  V: "https://assets.parqet.com/logos/symbol/V?format=png",
  WMT: "https://financialmodelingprep.com/image-stock/WMT.png",
  PG: "https://financialmodelingprep.com/image-stock/PG.png",
  MA: "https://financialmodelingprep.com/image-stock/MA.png",
  HD: "https://financialmodelingprep.com/image-stock/HD.png",
  UNH: "https://assets.parqet.com/logos/symbol/UNH?format=png",
  BAC: "https://financialmodelingprep.com/image-stock/BAC.png",
  LLY: "https://financialmodelingprep.com/image-stock/LLY.png",
  AVGO: "https://financialmodelingprep.com/image-stock/AVGO.png",
  COST: "https://financialmodelingprep.com/image-stock/COST.png",
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms Inc.",
  TSLA: "Tesla Inc.",
  JPM: "JPMorgan Chase & Co.",
  XOM: "Exxon Mobil Corp.",
  JNJ: "Johnson & Johnson",
  V: "Visa Inc.",
  WMT: "Walmart Inc.",
  PG: "Procter & Gamble Co.",
  MA: "Mastercard Inc.",
  HD: "The Home Depot Inc.",
  UNH: "UnitedHealth Group Inc.",
  BAC: "Bank of America Corp.",
  LLY: "Eli Lilly and Co.",
  AVGO: "Broadcom Inc.",
  COST: "Costco Wholesale Corp.",
};

export function StockLogo({
  ticker,
  size = 28,
  className = "",
}: StockLogoProps): ReactElement {
  const sym = ticker.toUpperCase();
  const remoteUrl =
    REMOTE_STOCK_LOGOS[sym] ??
    `https://financialmodelingprep.com/image-stock/${sym}.png`;
  const localUrl = `/logos/${sym}.png`;
  const name = COMPANY_NAMES[sym] ?? sym;

  const [hasRemoteFailed, setHasRemoteFailed] = useState(false);
  const [hasLocalFailed, setHasLocalFailed] = useState(false);

  useEffect(() => {
    setHasRemoteFailed(false);
    setHasLocalFailed(false);
  }, [sym]);

  if (hasLocalFailed) {
    return (
      <span
        className={`stock-logo-badge ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: "#1e293b",
          color: "#ffffff",
          fontSize: Math.max(9, Math.round(size * 0.38)),
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          flexShrink: 0,
        }}
        title={name}
      >
        {sym.slice(0, 2)}
      </span>
    );
  }

  const currentSrc = hasRemoteFailed ? localUrl : remoteUrl;

  return (
    <span
      className={`stock-logo-badge ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
      title={name}
    >
      <img
        src={currentSrc}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (!hasRemoteFailed) {
            setHasRemoteFailed(true);
          } else {
            setHasLocalFailed(true);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          padding: size >= 24 ? "2px" : "1px",
        }}
      />
    </span>
  );
}
