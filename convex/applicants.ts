import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess, isBoardMember } from "./permissions";
import {
  isBoardOnlyReviewType,
  stageToReviewType,
  type ReviewType,
} from "./reviewCategories";
import {
  averageScoreOf,
  averageZScoreOf,
  buildReviewerStats,
  type ReviewLike,
} from "./reviewStats";
import { isUserSignedUpForInterview } from "./reviews";

export const list = query({
  args: {
    stage: v.optional(
      v.union(
        v.literal("applied"),
        v.literal("telephone"),
        v.literal("assessment_center"),
        v.literal("accepted"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const applicants = args.stage
      ? await ctx.db
          .query("applicants")
          .withIndex("by_stage", (q) => q.eq("stage", args.stage!))
          .collect()
      : await ctx.db.query("applicants").collect();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const board = !!profile && isBoardMember(profile);

    // One scan of the whole reviews table rather than a query per applicant:
    // z-scores need every reviewer's full distribution anyway.
    const allReviews = await ctx.db.query("reviews").collect();
    const stats = buildReviewerStats(allReviews as unknown as ReviewLike[]);

    const byApplicant = new Map<string, typeof allReviews>();
    for (const review of allReviews) {
      const key = review.applicantId.toString();
      const existing = byApplicant.get(key);
      if (existing) existing.push(review);
      else byApplicant.set(key, [review]);
    }

    return applicants.map((applicant) => {
      const mine = byApplicant.get(applicant._id.toString()) ?? [];

      // Scores are scoped to the round the applicant is currently in, so the
      // number always describes the decision actually in front of you. For
      // accepted/rejected there is no "current" round, so fall back to the
      // furthest round they were actually reviewed in.
      let type: ReviewType;
      if (applicant.stage === "accepted" || applicant.stage === "rejected") {
        const present = new Set(mine.map((r) => r.reviewType));
        type = present.has("assessment_center")
          ? "assessment_center"
          : present.has("telephone")
            ? "telephone"
            : "application";
      } else {
        type = stageToReviewType(applicant.stage);
      }

      const scoped = mine.filter((r) => r.reviewType === type);

      // Aggregates summarise the underlying reviews, so they must obey the same
      // board-only rule - otherwise a committee member could read the shape of
      // application and telephone scores they aren't allowed to see.
      const visible = board || !isBoardOnlyReviewType(type);

      // bookingToken is a bearer capability - never ship it to list views.
      const { bookingToken: _bookingToken, ...rest } = applicant;
      return {
        ...rest,
        reviewType: visible ? type : null,
        reviewCount: visible ? scoped.length : 0,
        averageScore: visible
          ? averageScoreOf(scoped as unknown as ReviewLike[])
          : null,
        averageZScore: visible
          ? averageZScoreOf(stats, scoped as unknown as ReviewLike[])
          : null,
      };
    });
  },
});

export const getById = query({
  args: { id: v.id("applicants") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const applicant = await ctx.db.get(args.id);
    if (!applicant) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // The CV and written answers are first-stage review material, so they are
    // board-only - except for someone actually interviewing this applicant at
    // the assessment centre, who needs the context to run the interview.
    const canViewApplication =
      (!!profile && isBoardMember(profile)) ||
      (await isUserSignedUpForInterview(
        ctx,
        args.id,
        "assessment_center",
        userId
      ));

    const form = await ctx.db.get(applicant.applicationFormId);

    // bookingToken is a bearer capability - it only ever leaves the server via
    // the explicit ensureBookingToken mutation, never on a read.
    const { bookingToken: _bookingToken, ...rest } = applicant;

    if (!canViewApplication) {
      return {
        ...rest,
        application: null,
        cvUrl: null,
        formTitle: form?.title ?? "Unknown Form",
        canViewApplication: false as const,
      };
    }

    const application = await ctx.db
      .query("applications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.id))
      .first();

    // Resolve CV download URL from storage
    let cvUrl: string | null = null;
    if (application?.cvStorageId) {
      cvUrl = await ctx.storage.getUrl(application.cvStorageId);
    }

    return {
      ...rest,
      application: application ?? null,
      cvUrl,
      formTitle: form?.title ?? "Unknown Form",
      canViewApplication: true as const,
    };
  },
});

export const updateStage = mutation({
  args: {
    id: v.id("applicants"),
    stage: v.union(
      v.literal("applied"),
      v.literal("telephone"),
      v.literal("assessment_center"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, { stage: args.stage });

    // Moving someone into an interview round must leave them linkable, so mint
    // a booking token now if they don't already have one.
    if (args.stage === "telephone" || args.stage === "assessment_center") {
      const applicant = await ctx.db.get(args.id);
      if (applicant && !applicant.bookingToken) {
        await ctx.db.patch(args.id, { bookingToken: crypto.randomUUID() });
      }
    }
  },
});

/**
 * Return this applicant's booking-link token, minting one on first use.
 * This is the only path by which a token leaves the server.
 */
export const ensureBookingToken = mutation({
  args: { id: v.id("applicants") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.status !== "approved") {
      throw new Error("Not authorised");
    }

    const applicant = await ctx.db.get(args.id);
    if (!applicant) throw new Error("Applicant not found");

    if (applicant.bookingToken) return applicant.bookingToken;

    const token = crypto.randomUUID();
    await ctx.db.patch(args.id, { bookingToken: token });
    return token;
  },
});

/** Invalidate an applicant's existing link and issue a fresh one. */
export const regenerateBookingToken = mutation({
  args: { id: v.id("applicants") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasAdminAccess(profile)) {
      throw new Error("Only board members can regenerate booking links");
    }

    const applicant = await ctx.db.get(args.id);
    if (!applicant) throw new Error("Applicant not found");

    const token = crypto.randomUUID();
    await ctx.db.patch(args.id, { bookingToken: token });
    return token;
  },
});

/**
 * One-off backfill for applicants created before booking tokens existed.
 * Idempotent - safe to re-run. Invoke from the Convex dashboard.
 */
export const backfillBookingTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasAdminAccess(profile)) {
      throw new Error("Only board members can run this migration");
    }

    const applicants = await ctx.db.query("applicants").collect();
    let minted = 0;
    for (const applicant of applicants) {
      if (!applicant.bookingToken) {
        await ctx.db.patch(applicant._id, { bookingToken: crypto.randomUUID() });
        minted++;
      }
    }
    return { minted, total: applicants.length };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const applicants = await ctx.db.query("applicants").collect();

    const stats: Record<string, number> = {
      applied: 0,
      telephone: 0,
      assessment_center: 0,
      accepted: 0,
      rejected: 0,
    };

    for (const applicant of applicants) {
      stats[applicant.stage] = (stats[applicant.stage] ?? 0) + 1;
    }

    return stats;
  },
});
