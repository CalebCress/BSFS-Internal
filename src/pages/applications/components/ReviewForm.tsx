import { useState } from "react";
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

function ScoreInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  // An untouched score has no value, which a slider can't represent - it always
  // has a thumb somewhere. So the track sits at the midpoint but reads as
  // "Not scored" until it is touched, and submitting still refuses an
  // untouched factor rather than quietly recording that midpoint.
  const scored = value !== undefined;
  const position = value ?? (SCORE_MIN + SCORE_MAX) / 2;

  /**
   * Where a score sits on the track, as a CSS length.
   *
   * Inset by half a thumb at each end: the thumb's CENTRE travels from 8px to
   * (width - 8px), not 0% to 100%, so plain percentages would leave the 1 and 5
   * ticks visibly off from the thumb parked on them.
   */
  const offsetOf = (score: number) => {
    const fraction = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
    return `calc(0.5rem + (100% - 1rem) * ${fraction})`;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Slider
          min={SCORE_MIN}
          max={SCORE_MAX}
          step={SCORE_STEP}
          value={[position]}
          onValueChange={([next]) => onChange(next)}
          aria-label="Score"
          className={cn("flex-1", !scored && "opacity-60")}
        />
        <span
          className={cn(
            "w-12 shrink-0 text-right text-sm tabular-nums",
            scored ? "font-semibold" : "text-muted-foreground"
          )}
        >
          {scored ? value.toFixed(1) : "\u2014"}
        </span>
      </div>

      {/* Ticks: whole numbers get a taller mark and a label, half points a
          short one. The scale is legible without reading any numbers. */}
      <div className="relative mr-[3.75rem] h-6">
        {SCORE_OPTIONS.map((score) => {
          const isWhole = Number.isInteger(score);
          return (
            <div
              key={score}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: offsetOf(score) }}
            >
              <span
                className={cn(
                  "w-px bg-border",
                  isWhole ? "h-2" : "h-1"
                )}
              />
              {isWhole && (
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {score}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {scored && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          Clear
        </button>
      )}
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
          <Label className="flex items-center gap-1.5">
            {category.label}
            <span className="text-xs text-destructive">*</span>
          </Label>
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
