import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { REVIEW_CATEGORIES, type ScoreKey } from "@/lib/constants";
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
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? undefined : n)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
            value === n
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {n}
        </button>
      ))}
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
