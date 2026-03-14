import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface PrevDayData {
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
  vw: number;
  t: number;
}

export function PriceHeader({
  data,
  loading,
  ticker,
}: {
  data: PrevDayData | null;
  loading: boolean;
  ticker?: string;
}) {
  const isRainbow = ticker === "CRCL";
  if (loading) return <Skeleton className="h-10 w-64 mt-1" />;
  if (!data) return null;

  const change = data.c - data.o;
  const changePercent = (change / data.o) * 100;
  const isPositive = change >= 0;

  const rainbowStyle: React.CSSProperties | undefined = isRainbow
    ? {
        background:
          "linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00cc00, #0088ff, #8800ff, #ff0000)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "rainbow-shift 3s linear infinite",
      }
    : undefined;

  return (
    <>
      {isRainbow && (
        <style>{`
          @keyframes rainbow-shift {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
        `}</style>
      )}
      <div className="flex items-baseline gap-3 mt-1">
        <span className="text-3xl font-bold" style={rainbowStyle}>
          ${data.c.toFixed(2)}
        </span>
        <span
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
          style={isRainbow ? { ...rainbowStyle, fontSize: undefined } : undefined}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" style={isRainbow ? { color: "#8800ff" } : undefined} />
          ) : (
            <TrendingDown className="h-4 w-4" style={isRainbow ? { color: "#8800ff" } : undefined} />
          )}
          {isPositive ? "+" : ""}
          {change.toFixed(2)} ({isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%)
        </span>
        <span className="text-xs text-muted-foreground">Prev Close</span>
      </div>
    </>
  );
}
