import { getAuthUserId } from "@convex-dev/auth/server";
import { applicantIdsIAmInterviewing } from "./interviewAccess";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { isBoardMember } from "./permissions";
import {
  REVIEW_CATEGORIES,
  SCORE_MAX,
  SCORE_MIN,
  isBoardOnlyReviewType,
  type ReviewType,
  type ScoreKey,
} from "./reviewCategories";
import {
  buildReviewerStats,
  zScoresForReview,
  type ReviewLike,
} from "./reviewStats";

const reviewTypeValidator = v.union(
  v.literal("application"),
  v.literal("telephone"),
  v.literal("assessment_center")
);

/** Every score key, all optional - the required pair depends on reviewType. */
const scoresValidator = v.object({
  cv: v.optional(v.number()),
  responses: v.optional(v.number()),
  technical: v.optional(v.number()),
  behavioral: v.optional(v.number()),
});

/**
 * Require exactly the two factors that belong to this review type.
 *
 * Rejecting foreign keys matters beyond tidiness: a telephone review carrying
 * a `cv` score would land in the wrong z-score population.
 */
function validateScores(
  reviewType: ReviewType,
  scores: Partial<Record<ScoreKey, number>>
) {
  const categories = REVIEW_CATEGORIES[reviewType];
  const allowed = new Set<string>(categories.map((c) => c.key));

  for (const key of Object.keys(scores)) {
    if (scores[key as ScoreKey] === undefined) continue;
    if (!allowed.has(key)) {
      throw new Error(`"${key}" is not scored for this review type`);
    }
  }

  for (const { key, label } of categories) {
    const value = scores[key];
    if (value === undefined) {
      throw new Error(`${label} score is required`);
    }
    if (!Number.isInteger(value) || value < SCORE_MIN || value > SCORE_MAX) {
      throw new Error(
        `${label} score must be a whole number between ${SCORE_MIN} and ${SCORE_MAX}`
      );
    }
  }
}

/**
 * May this user see this applicant at all?
 *
 * The review type gate below answers "which rounds may you read", which is a
 * different question from "whose reviews may you read". Without this, an
 * applicant id is enough to read the assessment centre reviews - scores,
 * comments and reviewer names - of someone you are not interviewing, which is
 * exactly what applicants.list and getById refuse to hand over.
 */
async function canSeeApplicant(
  ctx: QueryCtx,
  userId: Id<"users">,
  applicantId: Id<"applicants">
): Promise<boolean> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!!profile && isBoardMember(profile)) return true;

  const mine = await applicantIdsIAmInterviewing(ctx, userId);
  return mine.has(applicantId.toString());
}

/**
 * Application and telephone reviews are board-only, for both reading and
 * writing. Assessment centre reviews stay open to committee members.
 */
async function canAccessReviewType(
  ctx: QueryCtx,
  userId: Id<"users">,
  reviewType: ReviewType
): Promise<boolean> {
  if (!isBoardOnlyReviewType(reviewType)) return true;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  return !!profile && isBoardMember(profile);
}

/**
 * Is this user signed up to conduct the applicant's interview of this type?
 *
 * Exported because applicants.getById uses it to decide whether a non-board
 * member may see the applicant's CV and written answers.
 */
export async function isUserSignedUpForInterview(
  ctx: QueryCtx,
  applicantId: Id<"applicants">,
  reviewType: string,
  userId: Id<"users">
): Promise<boolean> {
  if (reviewType === "application") return true;
  if (reviewType !== "telephone" && reviewType !== "assessment_center") {
    return false;
  }

  const mine = await applicantIdsIAmInterviewing(ctx, userId, reviewType);
  return mine.has(applicantId.toString());
}

/** Reviewer stats need the whole table; it is small and read in one scan. */
async function loadReviewerStats(ctx: QueryCtx) {
  const all = await ctx.db.query("reviews").collect();
  return buildReviewerStats(all as unknown as ReviewLike[]);
}

// Check if current user can submit a review of a given type for an applicant
export const canReview = query({
  args: {
    applicantId: v.id("applicants"),
    reviewType: reviewTypeValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    if (!(await canAccessReviewType(ctx, userId, args.reviewType))) return false;

    return await isUserSignedUpForInterview(
      ctx,
      args.applicantId,
      args.reviewType,
      userId
    );
  },
});

// Upsert: one review per (applicant, reviewer, reviewType)
export const submit = mutation({
  args: {
    applicantId: v.id("applicants"),
    reviewType: reviewTypeValidator,
    scores: scoresValidator,
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!(await canAccessReviewType(ctx, userId, args.reviewType))) {
      throw new Error("Only board members can review this stage");
    }

    // Restrict telephone/AC reviews to signed-up interviewers
    const allowed = await isUserSignedUpForInterview(
      ctx,
      args.applicantId,
      args.reviewType,
      userId
    );
    if (!allowed) {
      throw new Error(
        "You must be signed up for this applicant's interview to submit this review type"
      );
    }

    validateScores(args.reviewType, args.scores);

    // One review per (applicant, reviewer, type) - resolved by index rather
    // than scanning every review for the applicant.
    const myExisting = await ctx.db
      .query("reviews")
      .withIndex("by_applicant_reviewer_type", (q) =>
        q
          .eq("applicantId", args.applicantId)
          .eq("reviewerId", userId)
          .eq("reviewType", args.reviewType)
      )
      .first();

    if (myExisting) {
      // Update existing review
      await ctx.db.patch(myExisting._id, {
        scores: args.scores,
        comments: args.comments,
        createdAt: Date.now(),
      });
      return myExisting._id;
    }

    // Insert new review
    return await ctx.db.insert("reviews", {
      applicantId: args.applicantId,
      reviewerId: userId,
      reviewType: args.reviewType,
      scores: args.scores,
      comments: args.comments,
      createdAt: Date.now(),
    });
  },
});

// All reviews for an applicant, optionally filtered by review type
export const listByApplicant = query({
  args: {
    applicantId: v.id("applicants"),
    reviewType: v.optional(reviewTypeValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!(await canSeeApplicant(ctx, userId, args.applicantId))) return [];

    if (
      args.reviewType &&
      !(await canAccessReviewType(ctx, userId, args.reviewType))
    ) {
      return [];
    }

    let reviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    if (args.reviewType) {
      reviews = reviews.filter((r) => r.reviewType === args.reviewType);
    } else {
      // Unfiltered: drop any board-only types this user may not see.
      const permitted = new Set<string>();
      for (const type of ["application", "telephone", "assessment_center"] as const) {
        if (await canAccessReviewType(ctx, userId, type)) permitted.add(type);
      }
      reviews = reviews.filter((r) => permitted.has(r.reviewType));
    }

    const stats = await loadReviewerStats(ctx);

    return await Promise.all(
      reviews.map(async (review) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", review.reviewerId))
          .unique();
        return {
          ...review,
          reviewerName: profile?.displayName ?? "Unknown",
          zScores: zScoresForReview(stats, review as unknown as ReviewLike),
        };
      })
    );
  },
});

// Current user's review for a specific (applicant, reviewType)
export const getMyReview = query({
  args: {
    applicantId: v.id("applicants"),
    reviewType: reviewTypeValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    if (!(await canAccessReviewType(ctx, userId, args.reviewType))) return null;

    return await ctx.db
      .query("reviews")
      .withIndex("by_applicant_reviewer_type", (q) =>
        q
          .eq("applicantId", args.applicantId)
          .eq("reviewerId", userId)
          .eq("reviewType", args.reviewType)
      )
      .first();
  },
});

// Average scores across all reviews for an applicant, optionally filtered by type
export const getAggregateScores = query({
  args: {
    applicantId: v.id("applicants"),
    reviewType: v.optional(reviewTypeValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    if (!(await canSeeApplicant(ctx, userId, args.applicantId))) return null;

    if (
      args.reviewType &&
      !(await canAccessReviewType(ctx, userId, args.reviewType))
    ) {
      return null;
    }

    let reviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    // Categories are per review type, so an aggregate only makes sense for one
    // type at a time; default to application when unfiltered.
    const type: ReviewType = args.reviewType ?? "application";

    // Always narrow to the type being summarised. Leaving every type in when
    // unfiltered made `count` a tally of reviews from rounds the caller may not
    // be able to read, and one that didn't match the categories beside it.
    reviews = reviews.filter((r) => r.reviewType === type);

    const avg = (key: ScoreKey) => {
      const defined = reviews
        .map((r) => r.scores[key])
        .filter((v): v is number => v !== undefined);
      if (defined.length === 0) return null;
      return (
        Math.round((defined.reduce((a, b) => a + b, 0) / defined.length) * 10) / 10
      );
    };

    return {
      categories: REVIEW_CATEGORIES[type].map(({ key, label }) => ({
        key,
        label,
        average: avg(key),
      })),
      count: reviews.length,
    };
  },
});

// Map review type to the applicant stage that should appear in that tab
function reviewTypeToStage(
  reviewType: string
): "applied" | "telephone" | "assessment_center" {
  if (reviewType === "telephone") return "telephone";
  if (reviewType === "assessment_center") return "assessment_center";
  return "applied";
}

// Applicants the current user hasn't reviewed yet (for queue page)
// Filters to: in matching stage, not yet reviewed, and (for tel/AC) user signed up for their interview
export const listUnreviewed = query({
  args: {
    reviewType: v.optional(reviewTypeValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const effectiveType = args.reviewType ?? "application";

    if (!(await canAccessReviewType(ctx, userId, effectiveType))) return [];

    const matchingStage = reviewTypeToStage(effectiveType);

    // Get all reviews by this user
    const myReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewer", (q) => q.eq("reviewerId", userId))
      .collect();

    // Build set of applicant IDs this user has reviewed for this type
    const reviewedIds = new Set(
      myReviews
        .filter((r) => r.reviewType === effectiveType)
        .map((r) => r.applicantId.toString())
    );

    // Get applicants in the matching stage only
    const applicants = await ctx.db
      .query("applicants")
      .withIndex("by_stage", (q) => q.eq("stage", matchingStage))
      .collect();

    // Filter out already-reviewed applicants
    let candidates = applicants.filter(
      (a) => !reviewedIds.has(a._id.toString())
    );

    // For telephone/AC, only show applicants whose interview the user is signed up for
    if (effectiveType !== "application") {
      // Get all user's signups
      const mySignups = await ctx.db
        .query("interviewSignups")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      // Resolve which applicant IDs the user is signed up to interview
      const myApplicantIds = new Set<string>();
      for (const signup of mySignups) {
        const slot = await ctx.db.get(signup.slotId);
        if (
          slot &&
          slot.type === effectiveType &&
          slot.applicantId
        ) {
          myApplicantIds.add(slot.applicantId.toString());
        }
      }

      candidates = candidates.filter((a) =>
        myApplicantIds.has(a._id.toString())
      );
    }

    // bookingToken is a bearer capability - strip it, as list/getById do.
    return candidates.map(({ bookingToken: _bookingToken, ...rest }) => rest);
  },
});
