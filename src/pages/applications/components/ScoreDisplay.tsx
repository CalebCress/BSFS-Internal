import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface ScoreDisplayProps {
  score: number | null | undefined;
  label?: string;
  size?: "sm" | "md";
}

export function ScoreDisplay({
  score,
  label,
  size = "md",
}: ScoreDisplayProps) {
  if (score == null) {
    return (
      <div className="flex items-center gap-1.5">
        {label && (
          <span
            className={cn(
              "text-muted-foreground",
              size === "sm" ? "text-xs" : "text-sm"
            )}
          >
            {label}:
          </span>
        )}
        <span className="text-xs text-muted-foreground">&mdash;</span>
      </div>
    );
  }

  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {label}:
        </span>
      )}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          // How much of THIS star the score fills, 0 to 1. Rounding to whole
          // stars would show a 3.5 as either 3 or 4, which is the distinction
          // the reviewer went to the trouble of making.
          const fill = Math.max(0, Math.min(1, score - (i - 1)));
          return (
            <span key={i} className={cn("relative inline-block", starSize)}>
              <Star
                className={cn(
                  starSize,
                  "absolute inset-0 fill-muted text-muted-foreground/30"
                )}
              />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star
                    className={cn(starSize, "fill-amber-400 text-amber-400")}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span
        className={cn(
          "tabular-nums font-medium",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {typeof score === "number" && !Number.isInteger(score)
          ? score.toFixed(1)
          : score}
      </span>
    </div>
  );
}

/**
 * A reviewer-normalised score.
 *
 * Deliberately not stars: a z-score is a signed distance from a reviewer's own
 * mean, not a 1-5 rating, and reusing the star widget would imply otherwise.
 * Exactly 0.00 also means "not enough reviews to normalise yet" - see
 * MIN_REVIEWS_FOR_ZSCORE in convex/reviewStats.ts.
 */
export function ZScoreBadge({
  z,
  className,
}: {
  z: number | null | undefined;
  className?: string;
}) {
  if (z === null || z === undefined) {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }

  const tone =
    z > 0.05
      ? "text-green-600"
      : z < -0.05
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <span
      className={cn("text-sm font-medium tabular-nums", tone, className)}
      title={
        z === 0
          ? "Zero: either exactly average, or the reviewer has too few reviews to normalise yet"
          : "Standard deviations from this reviewer's own average"
      }
    >
      {z > 0 ? "+" : ""}
      {z.toFixed(2)}
    </span>
  );
}
