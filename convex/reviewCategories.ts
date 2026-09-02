/**
 * Canonical review scoring configuration.
 *
 * Lives in convex/ because BOTH sides import it: Convex functions validate
 * against it, and the React components render from it. tsconfig.app.json
 * includes "convex", so this is a single source of truth rather than the
 * three-way duplication the categories used to have.
 */

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

/** Every score key that can appear on a review, across all types. */
export type ScoreKey = "cv" | "responses" | "technical" | "behavioral";

export type ReviewType = "application" | "telephone" | "assessment_center";

/**
 * The two factors scored at each stage. Both are required when submitting.
 * Order here is the order rendered in the form and in score displays.
 */
export const REVIEW_CATEGORIES: Record<
  ReviewType,
  ReadonlyArray<{ key: ScoreKey; label: string }>
> = {
  application: [
    { key: "cv", label: "CV" },
    { key: "responses", label: "Responses" },
  ],
  telephone: [
    { key: "technical", label: "Technical" },
    { key: "behavioral", label: "Behavioral" },
  ],
  assessment_center: [
    { key: "technical", label: "Technical" },
    { key: "behavioral", label: "Behavioral" },
  ],
} as const;

/**
 * Review types only board members may see or submit. The assessment centre is
 * deliberately absent: committee members help score that round.
 */
export const BOARD_ONLY_REVIEW_TYPES: ReadonlyArray<ReviewType> = [
  "application",
  "telephone",
];

export function isBoardOnlyReviewType(reviewType: ReviewType): boolean {
  return BOARD_ONLY_REVIEW_TYPES.includes(reviewType);
}

/** The review type that matters for an applicant at a given stage. */
export function stageToReviewType(stage: string): ReviewType {
  if (stage === "telephone") return "telephone";
  if (stage === "assessment_center") return "assessment_center";
  return "application";
}
