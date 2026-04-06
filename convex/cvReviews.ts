import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hasCvReviewerAccess } from "./permissions";

export const submit = mutation({
  args: {
    cvStorageId: v.id("_storage"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("cvReviews", {
      submittedBy: userId,
      cvStorageId: args.cvStorageId,
      assignedTo: args.assignedTo,
      status: "pending",
      submittedAt: Date.now(),
    });
  },
});

export const listMy = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reviews = await ctx.db
      .query("cvReviews")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", userId))
      .collect();

    // Newest first
    reviews.reverse();

    return Promise.all(
      reviews.map(async (review) => {
        const cvUrl = await ctx.storage.getUrl(review.cvStorageId);
        let assignedToName: string | null = null;
        if (review.assignedTo) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", review.assignedTo))
            .unique();
          assignedToName = profile?.displayName ?? null;
        }
        return { ...review, cvUrl, assignedToName };
      })
    );
  },
});

export const listForReviewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasCvReviewerAccess(profile)) return [];

    const allPending = await ctx.db
      .query("cvReviews")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Show reviews assigned to this reviewer OR to "Anyone" (assignedTo === undefined)
    const myReviews = allPending.filter(
      (r) => r.assignedTo === userId || r.assignedTo === undefined
    );

    // Oldest first (queue order)
    return Promise.all(
      myReviews.map(async (review) => {
        const cvUrl = await ctx.storage.getUrl(review.cvStorageId);
        const submitter = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", review.submittedBy))
          .unique();
        return {
          ...review,
          cvUrl,
          submitterName: submitter?.displayName ?? "Unknown",
          submitterPhone: submitter?.phoneNumber ?? null,
        };
      })
    );
  },
});

export const markCompleted = mutation({
  args: { reviewId: v.id("cvReviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasCvReviewerAccess(profile)) {
      throw new Error("Only CV reviewers can mark reviews as completed");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");

    await ctx.db.patch(args.reviewId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});
