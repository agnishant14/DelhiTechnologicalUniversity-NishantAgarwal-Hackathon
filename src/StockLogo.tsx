import { useEffect, useState } from "react";
import { STOCKS } from "../shared/types";

export function StockLogo({
  ticker,
  size = 28,
}: {
  ticker: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [ticker]);
  const name = STOCKS.find((stock) => stock.ticker === ticker)?.name ?? ticker;
  return (
    <span
      className="stock-logo"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid #e3e7db",
        flexShrink: 0,
        overflow: "hidden",
        fontSize: 10,
      }}
      title={name}
    >
      {failed ? (
        ticker.slice(0, 2)
      ) : (
        <img
          src={`/logos/${ticker}.png`}
          alt={name}
          width={size - 4}
          height={size - 4}
          loading="lazy"
          style={{ objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
