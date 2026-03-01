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

  const rounded = Math.round(score);
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
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i <= rounded
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        ))}
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
