import type { ReactElement } from "react";

interface StockLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

export function StockLogo({
  ticker,
  size = 28,
  className = "",
}: StockLogoProps): ReactElement {
  const iconSize = Math.round(size * 0.6);

  switch (ticker.toUpperCase()) {
    case "AAPL":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#000000",
            color: "#ffffff",
          }}
          title="Apple Inc."
        >
          <svg
            viewBox="0 0 170 170"
            width={iconSize}
            height={iconSize}
            fill="currentColor"
          >
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.74-11.64-14.1-5.77-9.03-10.22-19.46-13.36-31.28-3.14-11.82-4.71-22.75-4.71-32.79 0-14.34 3.74-26.06 11.22-35.16 7.48-9.1 16.71-13.75 27.69-13.97 4.9.11 10.37 1.34 16.42 3.69 6.05 2.35 10.02 3.59 11.91 3.7 2.1-.12 6.32-1.37 12.67-3.76 6.34-2.39 11.6-3.46 15.77-3.21 11.64.65 21.08 5.17 28.32 13.56-9.98 6.08-14.86 14.54-14.64 25.37.22 8.47 3.53 15.64 9.94 21.51 6.41 5.86 14.07 9.17 22.98 9.92-2.39 7.05-5.34 14.09-8.86 21.11zM119.22 33.07c0-7.39 2.65-14.28 7.95-20.67 5.3-6.39 11.83-10.42 19.59-12.09.22 1.11.33 2.12.33 3.04 0 7.39-2.82 14.49-8.47 21.3-5.65 6.81-12.44 10.74-20.37 11.78-.33-1.11-.53-2.12-.53-3.36z" />
          </svg>
        </span>
      );

    case "MSFT":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
          title="Microsoft Corp."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
            <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
            <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
            <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
          </svg>
        </span>
      );

    case "GOOGL":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
          title="Alphabet Inc."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </span>
      );

    case "META":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#0866FF",
            color: "#ffffff",
          }}
          title="Meta Platforms Inc."
        >
          <svg
            viewBox="0 0 24 24"
            width={iconSize}
            height={iconSize}
            fill="currentColor"
          >
            <path d="M16.96 4c-2.3 0-4.32 1.4-5.2 3.32C10.88 5.4 8.86 4 6.56 4 3.12 4 1 6.88 1 11.23c0 4.67 2.65 8.77 6.64 8.77 2.02 0 3.73-.97 4.88-2.6 1.15 1.63 2.86 2.6 4.88 2.6 3.99 0 6.64-4.1 6.64-8.77C24.04 6.88 20.4 4 16.96 4zm.1 13.6c-2.4 0-4.1-2.52-4.9-5.18.8-2.66 2.5-5.18 4.9-5.18 2.1 0 4.1 1.7 4.1 5.18 0 3.48-2 5.18-4.1 5.18zm-10.5 0c-2.1 0-4.1-1.7-4.1-5.18 0-3.48 2-5.18 4.1-5.18 2.4 0 4.1 2.52 4.9 5.18-.8 2.66-2.5 5.18-4.9 5.18z" />
          </svg>
        </span>
      );

    case "NVDA":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#76B900",
            color: "#ffffff",
          }}
          title="NVIDIA Corp."
        >
          <svg
            viewBox="0 0 24 24"
            width={iconSize}
            height={iconSize}
            fill="currentColor"
          >
            <path d="M10.14 7.22c-2.02.13-3.95.83-5.56 2.01-.58.42-.31 1.34.4 1.34 2.22-.05 4.38.74 6.06 2.21 1.47 1.28 2.37 3.09 2.52 5.03.04.48.45.85.94.85h2.15c.56 0 1.01-.48.96-1.04-.3-3.69-2.22-6.99-5.26-8.98-1.57-1.02-3.37-1.51-5.21-1.42zm-1.87 3.94c-1.28.16-2.5.65-3.53 1.43-.52.39-.28 1.23.36 1.23 1.35-.04 2.67.45 3.69 1.37.94.84 1.51 2.01 1.62 3.26.04.45.42.8.87.8h1.8c.52 0 .93-.45.89-.97-.22-2.39-1.49-4.52-3.47-5.78-1.03-.66-2.2-1.01-3.41-1.34zM22.95 12.01c-.13 5.49-4.52 9.89-10.01 9.99-5.52.1-10.08-4.23-10.29-9.74-.21-5.51 4.12-10.1 9.63-10.26 2.76-.08 5.37.96 7.37 2.82.4.38.35 1.03-.1 1.36l-1.36 1c-.34.25-.82.2-1.12-.12-1.41-1.51-3.38-2.38-5.46-2.4-4.04-.04-7.37 3.23-7.41 7.27-.04 4.04 3.2 7.36 7.24 7.4 4.04.04 7.36-3.19 7.4-7.23.01-.39-.02-.78-.08-1.16-.06-.41.22-.79.64-.84l2.12-.26c.49-.06.94.27 1.01.76.08.73.12 1.47.12 2.2z" />
          </svg>
        </span>
      );

    case "AMZN":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#232F3E",
            color: "#ffffff",
          }}
          title="Amazon.com Inc."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <path
              fill="#FFFFFF"
              d="M13.9 11.8c-.1-.7-.4-1.2-.8-1.6-.4-.4-1-.6-1.7-.6-.8 0-1.4.3-1.8.8-.4.5-.6 1.2-.6 2.1 0 .8.2 1.5.6 1.9.4.4 1 .7 1.7.7.7 0 1.3-.2 1.8-.7.4-.5.7-1.3.8-2.6zm3.3.4c0 1.2-.1 2.2-.4 3-.3.8-.7 1.4-1.3 1.9-.6.5-1.3.8-2.2 1-.9.2-1.9.3-3.1.3-1.4 0-2.6-.2-3.7-.6-1.1-.4-1.9-1-2.4-1.8l2.3-2c.4.6 1 1 1.7 1.3.7.3 1.4.4 2.2.4 1 0 1.8-.2 2.3-.7.5-.5.8-1.2.8-2.1v-.6c-.6.7-1.3 1.2-2.1 1.5-.8.3-1.8.5-2.8.5-1.3 0-2.4-.4-3.3-1.1-.9-.7-1.3-1.8-1.3-3.2 0-1.4.5-2.5 1.5-3.3 1-.8 2.2-1.2 3.8-1.2 1.2 0 2.2.2 3 .7.8.5 1.4 1.1 1.7 2v-2.3h3.2v7.2z"
            />
            <path
              fill="#FF9900"
              d="M21.7 19.3c-2.9 2.2-7 3.3-10.7 3.3-5 0-9.5-2-12.8-5.3-.2-.2-.2-.5.1-.7.4-.3.9-.2 1.2.1 3 3 7.1 4.8 11.5 4.8 3.3 0 7-1 9.6-2.9.4-.3.9 0 1.1.4.2.4 0 .9-.4 1.2z"
            />
            <path
              fill="#FF9900"
              d="M22.7 17.7c-.4-.5-2.4-.3-3.6-.1-.3 0-.4-.3-.2-.5 1.4-1.1 3.5-.8 3.9-.3.4.5 0 2.6-1.4 3.7-.2.2-.5 0-.4-.2.4-1.2 1.7-2.6 1.7-2.6z"
            />
          </svg>
        </span>
      );

    case "TSLA":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#E82127",
            color: "#ffffff",
          }}
          title="Tesla Inc."
        >
          <svg
            viewBox="0 0 24 24"
            width={iconSize}
            height={iconSize}
            fill="currentColor"
          >
            <path d="M12 4.2c2.8 0 5.4.6 7.6 1.7l1.1-2.4C17.9 2.1 15 1.4 12 1.4 9 1.4 6.1 2.1 3.3 3.5l1.1 2.4c2.2-1.1 4.8-1.7 7.6-1.7zm0 3.3c-2.3 0-4.3.4-6.1 1.2l-.7-1.5c2.1-.9 4.4-1.4 6.8-1.4s4.7.5 6.8 1.4l-.7 1.5c-1.8-.8-3.8-1.2-6.1-1.2zM10.8 10h2.4v12.6h-2.4V10z" />
          </svg>
        </span>
      );

    case "JPM":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#0A2F64",
            color: "#ffffff",
          }}
          title="JPMorgan Chase & Co."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <polygon
              fill="#FFFFFF"
              points="7.2,2 16.8,2 22,7.2 22,16.8 16.8,22 7.2,22 2,16.8 2,7.2"
            />
            <polygon
              fill="#0A2F64"
              points="8,4.5 16,4.5 20,8.5 20,15.5 16,19.5 8,19.5 4,15.5 4,8.5"
            />
            <path fill="#FFFFFF" d="M8 8.5h8v2H8zm0 5h8v2H8z" />
          </svg>
        </span>
      );

    case "XOM":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#ffffff",
            border: "1px solid #fee2e2",
          }}
          title="Exxon Mobil Corp."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <path
              fill="#ED1B2D"
              d="M3 6h3.4l2.4 4.2L11.2 6h3.4l-4 6.5 4.3 7h-3.4l-2.6-4.6-2.7 4.6H2.8l4.3-7L3 6zm8.8 0h3.4l2.4 4.2L20 6h3.4l-4 6.5 4.3 7h-3.4l-2.6-4.6-2.7 4.6h-3.4l4.3-7-4.1-6.5z"
            />
          </svg>
        </span>
      );

    case "JNJ":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#D51900",
            color: "#ffffff",
          }}
          title="Johnson & Johnson"
        >
          <svg
            viewBox="0 0 24 24"
            width={iconSize}
            height={iconSize}
            fill="currentColor"
          >
            <text
              x="50%"
              y="60%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="11"
              fontWeight="bold"
              fontStyle="italic"
            >
              J&amp;J
            </text>
          </svg>
        </span>
      );

    case "V":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#1a1f71",
            color: "#ffffff",
          }}
          title="Visa Inc."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#f7b600"
              fontSize="12"
              fontWeight="900"
              fontStyle="italic"
            >
              VISA
            </text>
          </svg>
        </span>
      );

    case "WMT":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#0071ce",
            color: "#ffffff",
          }}
          title="Walmart Inc."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <circle cx="12" cy="12" r="2.5" fill="#ffc220" />
            <path
              d="M12 2v4M12 18v4M3.5 7l3.5 2M17 15l3.5 2M3.5 17l3.5-2M17 9l3.5-2"
              stroke="#ffc220"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );

    case "PG":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#003cae",
            color: "#ffffff",
          }}
          title="Procter & Gamble"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
            >
              P&amp;G
            </text>
          </svg>
        </span>
      );

    case "MA":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#111827",
          }}
          title="Mastercard"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <circle cx="9" cy="12" r="6" fill="#eb001b" opacity="0.9" />
            <circle cx="15" cy="12" r="6" fill="#f79e1b" opacity="0.9" />
          </svg>
        </span>
      );

    case "HD":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#f96302",
            color: "#ffffff",
          }}
          title="The Home Depot"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="900"
            >
              HD
            </text>
          </svg>
        </span>
      );

    case "UNH":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#002677",
            color: "#ffffff",
          }}
          title="UnitedHealth Group"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <path
              d="M12 3L4 7v6c0 5 8 8 8 8s8-3 8-8V7l-8-4z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <path d="M12 8v8M8 12h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );

    case "BAC":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
          title="Bank of America"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <rect x="3" y="6" width="8" height="4" fill="#002d72" />
            <rect x="3" y="14" width="8" height="4" fill="#002d72" />
            <rect x="13" y="6" width="8" height="4" fill="#e31837" />
            <rect x="13" y="14" width="8" height="4" fill="#e31837" />
          </svg>
        </span>
      );

    case "LLY":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#d51900",
            color: "#ffffff",
          }}
          title="Eli Lilly and Company"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="800"
              fontStyle="italic"
            >
              Lilly
            </text>
          </svg>
        </span>
      );

    case "AVGO":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#cc092f",
            color: "#ffffff",
          }}
          title="Broadcom Inc."
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <circle cx="12" cy="12" r="3" fill="#ffffff" />
            <path
              d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );

    case "COST":
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#005dab",
            color: "#ffffff",
          }}
          title="Costco Wholesale"
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
            <text
              x="12"
              y="15"
              textAnchor="middle"
              fill="#e31837"
              fontSize="8"
              fontWeight="900"
              letterSpacing="0.5"
            >
              COST
            </text>
          </svg>
        </span>
      );

    default:
      return (
        <span
          className={`stock-logo-badge ${className}`}
          style={{
            width: size,
            height: size,
            background: "#0f172a",
            color: "#ffffff",
            fontSize: Math.round(size * 0.4),
            fontWeight: 700,
          }}
        >
          {ticker.slice(0, 2)}
        </span>
      );
  }
}
