import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const reviewTypeValidator = v.union(
  v.literal("application"),
  v.literal("telephone"),
  v.literal("assessment_center")
);

function validateScore(score: number, name: string) {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error(`${name} score must be a whole number between 1 and 5`);
  }
}

// Check if a user is signed up for an applicant's interview of a given type
async function isUserSignedUpForInterview(
  ctx: { db: any },
  applicantId: any,
  reviewType: string,
  userId: any
): Promise<boolean> {
  if (reviewType === "application") return true;

  const slots = await ctx.db
    .query("interviewSlots")
    .withIndex("by_applicant", (q: any) => q.eq("applicantId", applicantId))
    .collect();

  const matchingSlots = slots.filter((s: any) => s.type === reviewType);

  for (const slot of matchingSlots) {
    const signups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_slot", (q: any) => q.eq("slotId", slot._id))
      .collect();
    if (signups.some((s: any) => s.userId === userId)) {
      return true;
    }
  }

  return false;
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
    scores: v.object({
      overall: v.number(),
      motivation: v.optional(v.number()),
      experience: v.optional(v.number()),
      cultureFit: v.optional(v.number()),
    }),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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

    // Validate score ranges
    validateScore(args.scores.overall, "Overall");
    if (args.scores.motivation !== undefined)
      validateScore(args.scores.motivation, "Motivation");
    if (args.scores.experience !== undefined)
      validateScore(args.scores.experience, "Experience");
    if (args.scores.cultureFit !== undefined)
      validateScore(args.scores.cultureFit, "Culture Fit");

    // Check for existing review by this user for this applicant + type
    const existingReviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    const myExisting = existingReviews.find(
      (r) => r.reviewerId === userId && r.reviewType === args.reviewType
    );

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

    let reviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    if (args.reviewType) {
      reviews = reviews.filter((r) => r.reviewType === args.reviewType);
    }

    return await Promise.all(
      reviews.map(async (review) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", review.reviewerId))
          .unique();
        return {
          ...review,
          reviewerName: profile?.displayName ?? "Unknown",
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

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    return (
      reviews.find(
        (r) => r.reviewerId === userId && r.reviewType === args.reviewType
      ) ?? null
    );
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

    let reviews = await ctx.db
      .query("reviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.applicantId))
      .collect();

    if (args.reviewType) {
      reviews = reviews.filter((r) => r.reviewType === args.reviewType);
    }

    if (reviews.length === 0) {
      return {
        overall: null,
        motivation: null,
        experience: null,
        cultureFit: null,
        count: 0,
      };
    }

    const avg = (values: (number | undefined)[]) => {
      const defined = values.filter((v): v is number => v !== undefined);
      if (defined.length === 0) return null;
      return (
        Math.round(
          (defined.reduce((a, b) => a + b, 0) / defined.length) * 10
        ) / 10
      );
    };

    return {
      overall: avg(reviews.map((r) => r.scores.overall)),
      motivation: avg(reviews.map((r) => r.scores.motivation)),
      experience: avg(reviews.map((r) => r.scores.experience)),
      cultureFit: avg(reviews.map((r) => r.scores.cultureFit)),
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

    return candidates;
  },
});
