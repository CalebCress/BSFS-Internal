import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { PrevDayData } from "./PriceHeader";

interface OverviewData {
  ticker: string;
  name: string;
  description: string;
  marketCap: number | null;
  sharesOutstanding: number | null;
  homepageUrl: string | null;
  totalEmployees: number | null;
  sicDescription: string | null;
  listDate: string | null;
  primaryExchange: string | null;
  branding: { iconUrl: string | null; logoUrl: string | null } | null;
}

interface FinancialsData {
  eps: number | null;
  periodOfReportDate: string | null;
  fiscalYear: string | null;
}

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export function CompanyOverview({
  ticker,
  prevDayData,
  onNameLoaded,
}: {
  ticker: string;
  prevDayData: PrevDayData | null;
  onNameLoaded?: (name: string) => void;
}) {
  const getOverview = useAction(api.massive.getTickerOverview);
  const getFinancials = useAction(api.massive.getFinancials);
  const [data, setData] = useState<OverviewData | null>(null);
  const [financials, setFinancials] = useState<FinancialsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getOverview({ ticker }),
      getFinancials({ ticker }).catch(() => null),
    ])
      .then(([overviewResult, financialsResult]) => {
        if (!cancelled) {
          setData(overviewResult);
          setFinancials(financialsResult);
          if (overviewResult?.name && onNameLoaded) {
            onNameLoaded(overviewResult.name);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setFinancials(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, getOverview, getFinancials, onNameLoaded]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Compute P/E ratio from close price and EPS
  const peRatio =
    prevDayData?.c && financials?.eps && financials.eps > 0
      ? Math.round((prevDayData.c / financials.eps) * 100) / 100
      : null;

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {data.description}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Market Cap"
          value={data.marketCap ? `$${formatLargeNumber(data.marketCap)}` : "N/A"}
        />
        <StatCard
          label="Shares Outstanding"
          value={
            data.sharesOutstanding
              ? formatLargeNumber(data.sharesOutstanding)
              : "N/A"
          }
        />
        <StatCard
          label="Volume"
          value={
            prevDayData?.v ? formatLargeNumber(prevDayData.v) : "N/A"
          }
        />
        <StatCard
          label="EPS"
          value={
            financials?.eps !== null && financials?.eps !== undefined
              ? `$${financials.eps.toFixed(2)}`
              : "N/A"
          }
        />
        <StatCard
          label="P/E Ratio"
          value={peRatio !== null ? peRatio.toFixed(2) : "N/A"}
        />
        <StatCard
          label="Employees"
          value={data.totalEmployees?.toLocaleString() ?? "N/A"}
        />
        <StatCard label="Exchange" value={data.primaryExchange ?? "N/A"} />
        <StatCard label="Listed" value={data.listDate ?? "N/A"} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {data.sicDescription && (
          <Badge variant="outline">{data.sicDescription}</Badge>
        )}
        {data.homepageUrl && (
          <a
            href={data.homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Website <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
