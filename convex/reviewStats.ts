import {
  REVIEW_CATEGORIES,
  type ReviewType,
  type ScoreKey,
} from "./reviewCategories";

/**
 * Per-reviewer score normalisation (z-scores).
 *
 * Reviewers calibrate differently: a 4 from someone who never gives above a 4
 * means more than a 4 from someone who gives them out freely. A z-score
 * restates each score in terms of that reviewer's own distribution, so scores
 * from different reviewers become comparable.
 *
 * A reviewer's distribution is computed per (reviewType, category) - their
 * telephone Technical scores are a different population from their assessment
 * centre Behavioral scores.
 */

/** Below this many reviews, a reviewer's mean and spread aren't meaningful. */
export const MIN_REVIEWS_FOR_ZSCORE = 3;

export type ReviewLike = {
  reviewerId: string;
  reviewType: ReviewType;
  scores: Partial<Record<ScoreKey, number>>;
};

export type ReviewerStat = { mean: number; sd: number; n: number };

/** Group key: one reviewer's scores for one category within one review type. */
function statKey(
  reviewerId: string,
  reviewType: ReviewType,
  category: ScoreKey
): string {
  return `${reviewerId}|${reviewType}|${category}`;
}

/**
 * Build every reviewer's mean and standard deviation in one pass.
 *
 * Pass the whole reviews table: callers need stats for reviewers they aren't
 * otherwise loading, and the table is small enough that one scan beats an
 * N+1 of per-reviewer queries.
 */
export function buildReviewerStats(
  reviews: ReviewLike[]
): Map<string, ReviewerStat> {
  const values = new Map<string, number[]>();

  for (const review of reviews) {
    for (const { key } of REVIEW_CATEGORIES[review.reviewType] ?? []) {
      const value = review.scores[key];
      if (typeof value !== "number") continue;

      const mapKey = statKey(review.reviewerId, review.reviewType, key);
      const existing = values.get(mapKey);
      if (existing) existing.push(value);
      else values.set(mapKey, [value]);
    }
  }

  const stats = new Map<string, ReviewerStat>();
  for (const [mapKey, list] of values) {
    const n = list.length;
    const mean = list.reduce((a, b) => a + b, 0) / n;
    // Population SD: this is the reviewer's complete set of reviews, not a
    // sample drawn from something larger.
    const variance =
      list.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    stats.set(mapKey, { mean, sd: Math.sqrt(variance), n });
  }

  return stats;
}

/**
 * Standardise one score against its reviewer's own distribution.
 *
 * Returns 0 when the reviewer has fewer than MIN_REVIEWS_FOR_ZSCORE reviews in
 * the group, or when they scored everyone identically (sd === 0, which would
 * divide by zero). In both cases the score carries no comparative information,
 * so it contributes "exactly average" rather than skewing the mean.
 */
export function zScoreFor(
  stats: Map<string, ReviewerStat>,
  reviewerId: string,
  reviewType: ReviewType,
  category: ScoreKey,
  value: number
): number {
  const stat = stats.get(statKey(reviewerId, reviewType, category));
  if (!stat || stat.n < MIN_REVIEWS_FOR_ZSCORE || stat.sd === 0) return 0;
  return (value - stat.mean) / stat.sd;
}

/** Every z-score on one review, keyed by category. */
export function zScoresForReview(
  stats: Map<string, ReviewerStat>,
  review: ReviewLike
): Partial<Record<ScoreKey, number>> {
  const result: Partial<Record<ScoreKey, number>> = {};
  for (const { key } of REVIEW_CATEGORIES[review.reviewType] ?? []) {
    const value = review.scores[key];
    if (typeof value === "number") {
      result[key] = zScoreFor(stats, review.reviewerId, review.reviewType, key, value);
    }
  }
  return result;
}

/** Mean of every defined score on a set of reviews, or null if there are none. */
export function averageScoreOf(reviews: ReviewLike[]): number | null {
  const values: number[] = [];
  for (const review of reviews) {
    for (const { key } of REVIEW_CATEGORIES[review.reviewType] ?? []) {
      const value = review.scores[key];
      if (typeof value === "number") values.push(value);
    }
  }
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Mean z-score across a set of reviews, or null if there are none. */
export function averageZScoreOf(
  stats: Map<string, ReviewerStat>,
  reviews: ReviewLike[]
): number | null {
  const zs: number[] = [];
  for (const review of reviews) {
    for (const value of Object.values(zScoresForReview(stats, review))) {
      zs.push(value);
    }
  }
  if (zs.length === 0) return null;
  return Math.round((zs.reduce((a, b) => a + b, 0) / zs.length) * 100) / 100;
}
