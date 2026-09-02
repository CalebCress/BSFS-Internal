import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess } from "./permissions";

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

    // Attach average overall score from reviews
    return await Promise.all(
      applicants.map(async (applicant) => {
        const reviews = await ctx.db
          .query("reviews")
          .withIndex("by_applicant", (q) =>
            q.eq("applicantId", applicant._id)
          )
          .collect();

        const overallScores = reviews.map((r) => r.scores.overall);
        const averageOverall =
          overallScores.length > 0
            ? Math.round(
                (overallScores.reduce((a, b) => a + b, 0) /
                  overallScores.length) *
                  10
              ) / 10
            : null;

        // bookingToken is a bearer capability - never ship it to list views.
        const { bookingToken: _bookingToken, ...rest } = applicant;
        return { ...rest, averageOverall };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("applicants") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const applicant = await ctx.db.get(args.id);
    if (!applicant) return null;

    const application = await ctx.db
      .query("applications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", args.id))
      .first();

    const form = await ctx.db.get(applicant.applicationFormId);

    // Resolve CV download URL from storage
    let cvUrl: string | null = null;
    if (application?.cvStorageId) {
      cvUrl = await ctx.storage.getUrl(application.cvStorageId);
    }

    // bookingToken is a bearer capability - it only ever leaves the server via
    // the explicit ensureBookingToken mutation, never on a read.
    const { bookingToken: _bookingToken, ...rest } = applicant;

    return {
      ...rest,
      application: application ?? null,
      cvUrl,
      formTitle: form?.title ?? "Unknown Form",
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
