import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "./components/RatingBadge";
import { ThesisDialog } from "./components/ThesisDialog";
import { PriceHeader, type PrevDayData } from "./components/PriceHeader";
import { PriceChart } from "./components/PriceChart";
import { CompanyOverview } from "./components/CompanyOverview";
import {
  ArrowLeft,
  PenLine,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { SENTIMENT, type Sentiment } from "@/lib/constants";
import { toast } from "sonner";

export function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [thesisOpen, setThesisOpen] = useState(false);
  const [stockId, setStockId] = useState<Id<"stocks"> | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  // Lifted prev day bar data
  const getPrevDay = useAction(api.massive.getPreviousDayBar);
  const [prevDayData, setPrevDayData] = useState<PrevDayData | null>(null);
  const [prevDayLoading, setPrevDayLoading] = useState(true);

  const normalizedTicker = ticker?.toUpperCase() ?? "";

  // Fetch prev day bar at page level
  useEffect(() => {
    if (!normalizedTicker) return;
    let cancelled = false;
    setPrevDayLoading(true);
    getPrevDay({ ticker: normalizedTicker })
      .then((result) => {
        if (!cancelled) setPrevDayData(result);
      })
      .catch(() => {
        if (!cancelled) setPrevDayData(null);
      })
      .finally(() => {
        if (!cancelled) setPrevDayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedTicker, getPrevDay]);

  // Convex thesis data (null if stock has no reviews yet)
  const convexData = useQuery(
    api.stocks.getByTicker,
    normalizedTicker ? { ticker: normalizedTicker } : "skip"
  );

  const getOrCreate = useMutation(api.stocks.getOrCreateByTicker);
  const removeThesis = useMutation(api.stockTheses.remove);

  const resolvedStockId = stockId ?? convexData?._id ?? null;

  // Find user's existing thesis
  const myThesisId = convexData?.myThesisId ?? null;
  const myThesis = convexData?.theses.find(
    (t) => t._id === myThesisId
  );

  const handleWriteOrEditThesis = async () => {
    if (resolvedStockId) {
      setThesisOpen(true);
      return;
    }
    try {
      const id = await getOrCreate({
        ticker: normalizedTicker,
        name: companyName || normalizedTicker,
      });
      setStockId(id);
      setThesisOpen(true);
    } catch {
      toast.error("Failed to initialize stock record");
    }
  };

  const handleDeleteThesis = async (thesisId: Id<"stockTheses">) => {
    try {
      await removeThesis({ thesisId });
      toast.success("Thesis deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete thesis"
      );
    }
  };

  const handleNameLoaded = useCallback((name: string) => {
    setCompanyName(name);
  }, []);

  if (!normalizedTicker) {
    return <p className="text-muted-foreground">Invalid ticker.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => navigate("/stocks")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stocks
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {normalizedTicker}
              {companyName && (
                <span className="text-xl font-normal text-muted-foreground ml-3">
                  {companyName}
                </span>
              )}
            </h1>
            <PriceHeader data={prevDayData} loading={prevDayLoading} ticker={normalizedTicker} />
          </div>
          <Button onClick={() => void handleWriteOrEditThesis()}>
            {myThesis ? (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Thesis
              </>
            ) : (
              <>
                <PenLine className="mr-2 h-4 w-4" />
                Write Thesis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Price Chart */}
      <PriceChart ticker={normalizedTicker} />

      {/* Company Overview */}
      <CompanyOverview
        ticker={normalizedTicker}
        prevDayData={prevDayData}
        onNameLoaded={handleNameLoaded}
      />

      {/* Member Theses Section */}
      {convexData && convexData.thesisCount > 0 ? (
        <>
          {/* Thesis Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="Avg Rating"
              value={
                convexData.averageRating !== null ? (
                  <RatingBadge rating={convexData.averageRating} />
                ) : (
                  "—"
                )
              }
            />
            <SummaryCard
              label="Total Theses"
              value={
                <span className="text-2xl font-bold">
                  {convexData.thesisCount}
                </span>
              }
            />
            <SummaryCard
              label="Sentiment"
              value={
                <div className="flex gap-2 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3.5 w-3.5" />{" "}
                    {convexData.bullishCount}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Minus className="h-3.5 w-3.5" />{" "}
                    {convexData.neutralCount}
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <TrendingDown className="h-3.5 w-3.5" />{" "}
                    {convexData.bearishCount}
                  </span>
                </div>
              }
            />
            <SummaryCard
              label="Avg Price Target"
              value={
                convexData.avgPriceTarget !== null ? (
                  <span className="text-2xl font-bold">
                    ${convexData.avgPriceTarget.toFixed(2)}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>

          {/* Theses List */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Member Theses ({convexData.theses.length})
            </h2>
            <div className="space-y-3">
              {convexData.theses.map((thesis) => {
                const sentimentConfig =
                  SENTIMENT[thesis.sentiment as Sentiment] ??
                  SENTIMENT.neutral;
                const isOwn = thesis._id === myThesisId;
                return (
                  <div
                    key={thesis._id}
                    className={`rounded-lg border p-4 ${isOwn ? "ring-1 ring-primary/30" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {thesis.authorName}
                        </span>
                        {isOwn && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            You
                          </Badge>
                        )}
                        <RatingBadge rating={thesis.rating} size="sm" />
                        <Badge
                          variant="secondary"
                          className={sentimentConfig.color}
                        >
                          {sentimentConfig.label}
                        </Badge>
                        {thesis.priceTarget !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            PT: ${thesis.priceTarget.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOwn && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setThesisOpen(true)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() =>
                                void handleDeleteThesis(thesis._id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(thesis.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {thesis.thesis}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="font-medium">No member theses yet</p>
          <p className="text-sm">
            Be the first to share your analysis of {normalizedTicker}!
          </p>
        </div>
      )}

      {/* Thesis Dialog */}
      {resolvedStockId && (
        <ThesisDialog
          open={thesisOpen}
          onOpenChange={setThesisOpen}
          stockId={resolvedStockId}
          stockTicker={normalizedTicker}
          existing={
            myThesis
              ? {
                  rating: myThesis.rating,
                  thesis: myThesis.thesis,
                  sentiment: myThesis.sentiment,
                  priceTarget: myThesis.priceTarget,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div>{value}</div>
    </div>
  );
}
