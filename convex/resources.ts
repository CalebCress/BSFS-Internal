import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess } from "./permissions";

async function requireAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile || !hasAdminAccess(profile)) {
    throw new Error("Only admins can manage resources");
  }
  return userId;
}

export const uploadPresentation = mutation({
  args: {
    eventId: v.id("events"),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const eventType = event.eventType
      ?? (event.isCorporateMarketUpdate ? "corporate_market_update" : undefined);

    if (eventType !== "corporate_market_update" && eventType !== "workshop") {
      throw new Error("Uploads are only supported for Market & Corporate Update and Workshop events");
    }

    const category = eventType === "corporate_market_update"
      ? "market_corporate" as const
      : "workshop" as const;

    // Check if a resource already exists for this event
    const existing = await ctx.db
      .query("resources")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (existing) {
      // Replace the old file
      await ctx.storage.delete(existing.fileStorageId);
      await ctx.db.patch(existing._id, {
        fileStorageId: args.fileStorageId,
        uploadedBy: userId,
        uploadedAt: Date.now(),
        category,
      });
      return existing._id;
    }

    const title = eventType === "corporate_market_update"
      ? "Corporate Market Update"
      : event.title;

    return await ctx.db.insert("resources", {
      title,
      eventId: args.eventId,
      fileStorageId: args.fileStorageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      category,
    });
  },
});

export const uploadInterviewPrep = mutation({
  args: {
    title: v.string(),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    return await ctx.db.insert("resources", {
      title: args.title.trim() || "Interview Prep",
      fileStorageId: args.fileStorageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      category: "interview_prep",
    });
  },
});

export const deleteResource = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new Error("Resource not found");

    await ctx.storage.delete(resource.fileStorageId);
    await ctx.db.delete(args.resourceId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const resources = await ctx.db
      .query("resources")
      .withIndex("by_uploadedAt")
      .collect();

    // Reverse to get newest first
    resources.reverse();

    return Promise.all(
      resources.map(async (resource) => {
        const fileUrl = await ctx.storage.getUrl(resource.fileStorageId);

        // Look up event to get presenter names and event date
        let corporatePresenterName: string | null = null;
        let marketPresenterName: string | null = null;
        let corporatePresenter: string | null = null;
        let marketPresenter: string | null = null;
        let eventDate: string | null = null;
        let eventType: string | null = null;

        const event = resource.eventId ? await ctx.db.get(resource.eventId) : null;

        if (event) {
          eventDate = event.date;
          eventType = event.eventType
            ?? (event.isCorporateMarketUpdate ? "corporate_market_update" : null);
          if (event.corporateAssignee) {
            corporatePresenter = event.corporateAssignee;
            const profile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q: any) =>
                q.eq("userId", event.corporateAssignee)
              )
              .unique();
            corporatePresenterName = profile?.displayName ?? null;
          }
          if (event.marketAssignee) {
            marketPresenter = event.marketAssignee;
            const profile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q: any) =>
                q.eq("userId", event.marketAssignee)
              )
              .unique();
            marketPresenterName = profile?.displayName ?? null;
          }
        }

        // Derive category: use stored category, or derive from event type, or default
        const category = resource.category
          ?? (eventType === "corporate_market_update" ? "market_corporate"
            : eventType === "workshop" ? "workshop"
            : "market_corporate");

        return {
          ...resource,
          fileUrl,
          eventDate,
          corporatePresenterName,
          marketPresenterName,
          corporatePresenter,
          marketPresenter,
          category,
        };
      })
    );
  },
});

export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const resource = await ctx.db
      .query("resources")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (!resource) return null;

    const fileUrl = await ctx.storage.getUrl(resource.fileStorageId);
    return { ...resource, fileUrl };
  },
});
