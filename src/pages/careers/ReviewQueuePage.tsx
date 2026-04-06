import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

export function ReviewQueuePage() {
  const reviewerQueue = useQuery(api.cvReviews.listForReviewer);
  const markCompleted = useMutation(api.cvReviews.markCompleted);

  const handleMarkCompleted = async (reviewId: Id<"cvReviews">) => {
    try {
      await markCompleted({ reviewId });
      toast.success("Review marked as completed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update review"
      );
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews To Do</h1>
        <p className="text-muted-foreground">
          CVs assigned to you or open for any reviewer.
        </p>
      </div>

      {reviewerQueue === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : reviewerQueue.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No pending CV reviews.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewerQueue.map((review) => (
            <Card key={review._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">
                      {review.submitterName}
                    </span>
                  </div>
                  {review.cvUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={review.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDate(review.submittedAt)}
                </p>
                {review.submitterPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{review.submitterPhone}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {review.assignedTo ? "Assigned to you" : "Open (Anyone)"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => void handleMarkCompleted(review._id)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Mark Completed
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
