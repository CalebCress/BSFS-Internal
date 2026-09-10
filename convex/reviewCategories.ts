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

/** Scores go in half points: 1, 1.5, 2 ... 5. */
export const SCORE_STEP = 0.5;

/** Every selectable score, in order - the review form renders straight from this. */
export const SCORE_OPTIONS: readonly number[] = Array.from(
  { length: (SCORE_MAX - SCORE_MIN) / SCORE_STEP + 1 },
  (_, i) => SCORE_MIN + i * SCORE_STEP
);

/**
 * Is this a score the scale actually allows?
 *
 * Checked with `value * 2` rather than a modulo on 0.5: floating point makes
 * `3.5 % 0.5` unreliable, while doubling a half-step always lands on a whole
 * number exactly.
 */
export function isValidScore(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX &&
    Number.isInteger(value * 2)
  );
}

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

/**
 * May someone with these capabilities see and submit reviews of this type?
 *
 * Imported by both sides so the tabs a person is shown are exactly the ones
 * the server will answer. `board` is a board seat; `telephone` is whoever
 * conducts telephone interviews, which the TI Reviewer role also grants; and
 * `application` is whoever reviews CVs and written answers, which the CV
 * Reviewer role also grants.
 */
export function canSeeReviewType(
  reviewType: ReviewType,
  caps: { board: boolean; telephone: boolean; application: boolean }
): boolean {
  if (!isBoardOnlyReviewType(reviewType)) return true;
  if (reviewType === "telephone") return caps.telephone;
  if (reviewType === "application") return caps.application;
  return caps.board;
}

/** The review type that matters for an applicant at a given stage. */
export function stageToReviewType(stage: string): ReviewType {
  if (stage === "telephone") return "telephone";
  if (stage === "assessment_center") return "assessment_center";
  return "application";
}
