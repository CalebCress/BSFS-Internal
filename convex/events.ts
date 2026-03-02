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
    throw new Error("Only board members can manage events");
  }
  return userId;
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    isCorporateMarketUpdate: v.optional(v.boolean()),
    corporateAssignee: v.optional(v.id("users")),
    marketAssignee: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await requireBoardMember(ctx);

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      createdBy: userId,
      isCorporateMarketUpdate: args.isCorporateMarketUpdate,
      corporateAssignee: args.isCorporateMarketUpdate
        ? args.corporateAssignee
        : undefined,
      marketAssignee: args.isCorporateMarketUpdate
        ? args.marketAssignee
        : undefined,
    });
  },
});

export const createRecurring = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    startDate: v.string(),
    weeksCount: v.optional(v.number()),
    isCorporateMarketUpdate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireBoardMember(ctx);

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be 0 (Sunday) through 6 (Saturday)");
    }

    const weeks = args.weeksCount ?? 12;
    if (weeks < 1 || weeks > 52) {
      throw new Error("weeksCount must be between 1 and 52");
    }

    const seriesId = crypto.randomUUID();

    // Find the first occurrence on or after startDate matching dayOfWeek
    const start = new Date(args.startDate + "T00:00:00");
    const startDow = start.getDay();
    let daysUntil = args.dayOfWeek - startDow;
    if (daysUntil < 0) daysUntil += 7;
    start.setDate(start.getDate() + daysUntil);

    let eventsCreated = 0;
    for (let i = 0; i < weeks; i++) {
      const eventDate = new Date(start);
      eventDate.setDate(start.getDate() + i * 7);
      const dateStr = eventDate.toISOString().split("T")[0];

      await ctx.db.insert("events", {
        title: args.title,
        description: args.description,
        date: dateStr,
        startTime: args.startTime,
        endTime: args.endTime,
        seriesId,
        createdBy: userId,
        isCorporateMarketUpdate: args.isCorporateMarketUpdate,
        // corporateAssignee and marketAssignee intentionally omitted
        // so each occurrence gets independent assignments
      });
      eventsCreated++;
    }

    return { eventsCreated, seriesId };
  },
});

export const list = query({
  args: {
    year: v.optional(v.number()),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let events = await ctx.db.query("events").collect();

    // Filter by year/month if provided
    if (args.year !== undefined && args.month !== undefined) {
      const monthStr = String(args.month).padStart(2, "0");
      const prefix = `${args.year}-${monthStr}`;
      events = events.filter((e) => e.date.startsWith(prefix));
    }

    // Enrich with assignee names
    const enriched = await Promise.all(
      events.map(async (event) => {
        let corporateAssigneeName: string | null = null;
        let marketAssigneeName: string | null = null;

        if (event.corporateAssignee) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) =>
              q.eq("userId", event.corporateAssignee!)
            )
            .unique();
          corporateAssigneeName = profile?.displayName ?? null;
        }
        if (event.marketAssignee) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) =>
              q.eq("userId", event.marketAssignee!)
            )
            .unique();
          marketAssigneeName = profile?.displayName ?? null;
        }

        return { ...event, corporateAssigneeName, marketAssigneeName };
      })
    );

    return enriched.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    isCorporateMarketUpdate: v.optional(v.boolean()),
    corporateAssignee: v.optional(v.id("users")),
    marketAssignee: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireBoardMember(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.date !== undefined) updates.date = args.date;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.endTime !== undefined) updates.endTime = args.endTime;
    if (args.location !== undefined) updates.location = args.location;

    if (args.isCorporateMarketUpdate !== undefined) {
      updates.isCorporateMarketUpdate = args.isCorporateMarketUpdate;
      if (!args.isCorporateMarketUpdate) {
        // Clear assignees when toggling off
        updates.corporateAssignee = undefined;
        updates.marketAssignee = undefined;
      }
    }
    if (args.corporateAssignee !== undefined)
      updates.corporateAssignee = args.corporateAssignee;
    if (args.marketAssignee !== undefined)
      updates.marketAssignee = args.marketAssignee;

    await ctx.db.patch(args.eventId, updates);
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireBoardMember(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Cascade-delete associated resource + file
    const resource = await ctx.db
      .query("resources")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (resource) {
      await ctx.storage.delete(resource.fileStorageId);
      await ctx.db.delete(resource._id);
    }

    await ctx.db.delete(args.eventId);
  },
});

export const removeSeries = mutation({
  args: { seriesId: v.string() },
  handler: async (ctx, args) => {
    await requireBoardMember(ctx);

    const events = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    for (const event of events) {
      // Cascade-delete associated resource + file
      const resource = await ctx.db
        .query("resources")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .unique();
      if (resource) {
        await ctx.storage.delete(resource.fileStorageId);
        await ctx.db.delete(resource._id);
      }

      await ctx.db.delete(event._id);
    }

    return { deleted: events.length };
  },
});
