import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  t: number;
}

const PERIODS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
] as const;

function formatAxisDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getFromDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function getToDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function PriceChart({ ticker }: { ticker: string }) {
  const getAggregates = useAction(api.massive.getAggregates);
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[2]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAggregates({
      ticker,
      multiplier: 1,
      timespan: "day",
      from: getFromDate(period.months),
      to: getToDate(),
    })
      .then((data) => {
        if (!cancelled) setBars(data.results);
      })
      .catch(() => {
        if (!cancelled) setBars([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, period, getAggregates]);

  const isPositive =
    bars.length >= 2 && bars[bars.length - 1].c >= bars[0].c;
  const color = isPositive ? "#16a34a" : "#dc2626";

  if (loading) {
    return <Skeleton className="h-72 w-full rounded-lg" />;
  }

  if (bars.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center border rounded-lg text-muted-foreground text-sm">
        No price data available
      </div>
    );
  }

  const chartData = bars.map((b) => ({
    date: formatAxisDate(b.t),
    close: b.c,
    open: b.o,
    high: b.h,
    low: b.l,
    volume: b.v,
    timestamp: b.t,
  }));

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <Button
            key={p.label}
            variant={period.label === p.label ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient
              id={`gradient-${ticker}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="rounded-lg border bg-popover p-3 text-sm shadow-md">
                  <p className="font-medium mb-1">
                    {formatDate(d.timestamp)}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    <span className="text-muted-foreground">Open</span>
                    <span>${d.open.toFixed(2)}</span>
                    <span className="text-muted-foreground">High</span>
                    <span>${d.high.toFixed(2)}</span>
                    <span className="text-muted-foreground">Low</span>
                    <span>${d.low.toFixed(2)}</span>
                    <span className="text-muted-foreground">Close</span>
                    <span className="font-medium">${d.close.toFixed(2)}</span>
                    <span className="text-muted-foreground">Volume</span>
                    <span>{d.volume.toLocaleString()}</span>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${ticker})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
