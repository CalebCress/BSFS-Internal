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
}: {
  data: PrevDayData | null;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-10 w-64 mt-1" />;
  if (!data) return null;

  const change = data.c - data.o;
  const changePercent = (change / data.o) * 100;
  const isPositive = change >= 0;

  return (
    <div className="flex items-baseline gap-3 mt-1">
      <span className="text-3xl font-bold">${data.c.toFixed(2)}</span>
      <span
        className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {isPositive ? "+" : ""}
        {change.toFixed(2)} ({isPositive ? "+" : ""}
        {changePercent.toFixed(2)}%)
      </span>
      <span className="text-xs text-muted-foreground">Prev Close</span>
    </div>
  );
}
