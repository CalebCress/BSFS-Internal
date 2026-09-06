import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { REVIEW_CATEGORIES, type ScoreKey } from "@/lib/constants";
import {
  SCORE_MAX,
  SCORE_MIN,
  SCORE_OPTIONS,
  SCORE_STEP,
} from "../../../../convex/reviewCategories";
import type { ReviewType } from "../../../../convex/reviewCategories";

interface ExistingReview {
  scores: Partial<Record<ScoreKey, number>>;
  comments?: string;
}

interface ReviewFormProps {
  applicantId: Id<"applicants">;
  reviewType: ReviewType;
  existingReview?: ExistingReview | null;
  onSuccess: () => void;
}

/** Half the slider thumb, in px - the track's usable span is inset by this. */
const THUMB_INSET = 8;

/**
 * Pick a score from 1 to 5 in half points.
 *
 * The whole block is one click surface: the track, the ticks, the numbers and
 * every pixel between them map to the nearest step. There is no dead space to
 * hit by accident, and no separate targets that can disagree with the track
 * about where a score sits.
 */
function ScoreInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const scored = value !== undefined;
  const trackRef = useRef<HTMLDivElement>(null);

  /** Where a score sits along the track, as a CSS length. */
  const offsetOf = (score: number) => {
    const fraction = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
    return `calc(${THUMB_INSET}px + (100% - ${THUMB_INSET * 2}px) * ${fraction})`;
  };

  /**
   * Nearest valid score to a horizontal position.
   *
   * Measured against the TRACK, whatever was actually clicked, so a click on a
   * number lands on the same score as a click on the track above it.
   */
  const scoreAt = (clientX: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const span = rect.width - THUMB_INSET * 2;
    if (span <= 0) return null;

    const fraction = (clientX - rect.left - THUMB_INSET) / span;
    const raw = SCORE_MIN + fraction * (SCORE_MAX - SCORE_MIN);
    const snapped = Math.round(raw / SCORE_STEP) * SCORE_STEP;
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, snapped));
  };

  return (
    <div
      className="cursor-pointer"
      onClick={(e) => {
        const next = scoreAt(e.clientX);
        if (next !== null) onChange(next);
      }}
    >
      <div ref={trackRef}>
        {scored ? (
          <Slider
            min={SCORE_MIN}
            max={SCORE_MAX}
            step={SCORE_STEP}
            value={[value]}
            onValueChange={([next]) => onChange(next)}
            aria-label="Score"
          />
        ) : (
          // No score yet, so no thumb: a circle parked on some midpoint reads
          // as an answer nobody gave. A plain track rather than a slider with
          // an invisible thumb - an interactive control you can't see is worse
          // than none. The first click brings the real slider in.
          <div
            role="button"
            tabIndex={0}
            aria-label="Score, not set"
            onKeyDown={(e) => {
              // Start in the middle from the keyboard; the real slider's arrow
              // keys take over from there.
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange((SCORE_MIN + SCORE_MAX) / 2);
              }
            }}
            className="flex h-4 items-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <div className="h-1.5 w-full rounded-full bg-secondary" />
          </div>
        )}
      </div>

      {/* Ticks are decoration, not targets - the surrounding block handles
          every click, so there is nothing here to miss between them. Whole
          numbers get a taller mark and a label, half points a short one, so
          the scale is legible without reading any numbers. */}
      <div className="pointer-events-none relative h-8 pt-1">
        {SCORE_OPTIONS.map((score) => {
          const isWhole = Number.isInteger(score);
          return (
            <div
              key={score}
              className="absolute top-1 flex -translate-x-1/2 flex-col items-center"
              style={{ left: offsetOf(score) }}
            >
              <span
                className={cn(
                  "w-px transition-colors",
                  isWhole ? "h-2" : "h-1",
                  value === score ? "bg-primary" : "bg-border"
                )}
              />
              {isWhole && (
                <span
                  className={cn(
                    "mt-0.5 text-xs transition-colors",
                    value === score
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewForm({
  applicantId,
  reviewType,
  existingReview,
  onSuccess,
}: ReviewFormProps) {
  const submitReview = useMutation(api.reviews.submit);
  const [submitting, setSubmitting] = useState(false);

  // Which two factors are scored depends entirely on the review type.
  const categories = REVIEW_CATEGORIES[reviewType];

  const [scores, setScores] = useState<Partial<Record<ScoreKey, number>>>(() =>
    Object.fromEntries(
      categories.map((c) => [c.key, existingReview?.scores[c.key]])
    )
  );
  const [comments, setComments] = useState(existingReview?.comments ?? "");
  const [error, setError] = useState<string | null>(null);

  const updateScore = (key: ScoreKey, value: number | undefined) => {
    setScores((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Both factors are required.
    const missing = categories.find((c) => scores[c.key] === undefined);
    if (missing) {
      setError(`${missing.label} score is required`);
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        applicantId,
        reviewType,
        scores: Object.fromEntries(
          categories.map((c) => [c.key, scores[c.key]])
        ),
        comments: comments.trim() || undefined,
      });
      toast.success(existingReview ? "Review updated" : "Review submitted");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit review"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {categories.map((category) => (
        <div key={category.key} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label className="flex items-center gap-1.5">
              {category.label}
              <span className="text-xs text-destructive">*</span>
            </Label>
            {/* Beside the label, not beside the track: a readout in the row
                would reserve width the slider and ticks can't use, leaving a
                strip on the right where clicks do nothing. */}
            <span
              className={cn(
                "text-sm tabular-nums",
                scores[category.key] !== undefined
                  ? "font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {scores[category.key]?.toFixed(1) ?? "\u2014"}
            </span>
          </div>
          <ScoreInput
            value={scores[category.key]}
            onChange={(v) => updateScore(category.key, v)}
          />
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Separator />

      <div className="space-y-2">
        <Label>Comments</Label>
        <Textarea
          placeholder="Optional comments about this applicant..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting
          ? "Submitting..."
          : existingReview
            ? "Update Review"
            : "Submit Review"}
      </Button>
    </form>
  );
}
