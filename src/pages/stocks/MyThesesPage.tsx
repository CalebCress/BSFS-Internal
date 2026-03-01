import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "./components/RatingBadge";
import { FileText } from "lucide-react";
import { SENTIMENT, type Sentiment } from "@/lib/constants";

export function MyThesesPage() {
  const navigate = useNavigate();
  const theses = useQuery(api.stockTheses.listMyTheses);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Theses</h1>
        <p className="text-muted-foreground">
          Your investment theses across all stocks.
        </p>
      </div>

      {/* Theses list */}
      {theses === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : theses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="font-medium">No theses yet</p>
          <p className="text-sm">
            Visit a stock&apos;s detail page to write your first thesis.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {theses.map((item) => {
            const sentimentConfig =
              SENTIMENT[item.sentiment as Sentiment] ?? SENTIMENT.neutral;
            return (
              <div
                key={item._id}
                className="rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/stocks/${item.stock?.ticker ?? ""}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        {item.stock?.ticker ?? "???"}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {item.stock?.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <RatingBadge rating={item.rating} size="sm" />
                      <Badge
                        variant="secondary"
                        className={sentimentConfig.color}
                      >
                        {sentimentConfig.label}
                      </Badge>
                      {item.priceTarget !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          PT: ${item.priceTarget.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.thesis}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.stock?.sector && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.stock.sector}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
