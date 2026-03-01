import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

        return { ...applicant, averageOverall };
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

    return {
      ...applicant,
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
