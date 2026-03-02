import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireBoardMember(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile || profile.role !== "board_member") {
    throw new Error("Only board members can manage resources");
  }
  return userId;
}

export const uploadPresentation = mutation({
  args: {
    eventId: v.id("events"),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireBoardMember(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (!event.isCorporateMarketUpdate) {
      throw new Error("This event is not a Corporate & Market Update");
    }

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
      });
      return existing._id;
    }

    const title = "Corporate Market Update";

    return await ctx.db.insert("resources", {
      title,
      eventId: args.eventId,
      fileStorageId: args.fileStorageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
    });
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
        const event = await ctx.db.get(resource.eventId);
        let corporatePresenterName: string | null = null;
        let marketPresenterName: string | null = null;
        let corporatePresenter: string | null = null;
        let marketPresenter: string | null = null;
        let eventDate: string | null = null;

        if (event) {
          eventDate = event.date;
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

        return {
          ...resource,
          fileUrl,
          eventDate,
          corporatePresenterName,
          marketPresenterName,
          corporatePresenter,
          marketPresenter,
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
