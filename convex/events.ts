import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { hasAdminAccess } from "./permissions";
import { blockStarts } from "./eventBlocks";

async function requireAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile || !hasAdminAccess(profile)) {
    throw new Error("Only admins can manage events");
  }
  return userId;
}

/**
 * The block length a sign-up sheet should be saved with. Only sign-up sheets
 * have blocks, so any other type stores nothing - a stale value would
 * silently turn the event back into a sheet if its type were changed later.
 */
function slotMinutesFor(
  eventType: string | undefined,
  slotMinutes: number | undefined
): number | undefined {
  if (eventType !== "signup") return undefined;
  const minutes = slotMinutes ?? 30;
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
    throw new Error("Block length must be between 5 and 240 minutes");
  }
  return minutes;
}

/** Delete an event and everything hanging off it. */
async function deleteEventCascade(ctx: MutationCtx, eventId: Id<"events">) {
  // Associated resource + file
  const resource = await ctx.db
    .query("resources")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .unique();
  if (resource) {
    await ctx.storage.delete(resource.fileStorageId);
    await ctx.db.delete(resource._id);
  }

  // Sign-up sheet entries
  const signups = await ctx.db
    .query("eventBlockSignups")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();
  for (const signup of signups) {
    await ctx.db.delete(signup._id);
  }

  await ctx.db.delete(eventId);
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
    eventType: v.optional(v.union(
      v.literal("corporate_market_update"),
      v.literal("workshop"),
      v.literal("regional"),
      v.literal("signup"),
      v.literal("other"),
    )),
    corporateAssignee: v.optional(v.id("users")),
    marketAssignee: v.optional(v.id("users")),
    mandatoryAttendance: v.optional(v.boolean()),
    slotMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    const isCMU = args.eventType === "corporate_market_update" || args.isCorporateMarketUpdate;
    const isRegional = args.eventType === "regional";
    // Auto-set mandatory attendance for Corporate & Market Updates
    const mandatory = isCMU ? true : args.mandatoryAttendance;

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      createdBy: userId,
      isCorporateMarketUpdate: isCMU || undefined,
      eventType: args.eventType,
      corporateAssignee: (isCMU || isRegional)
        ? args.corporateAssignee
        : undefined,
      marketAssignee: (isCMU || isRegional)
        ? args.marketAssignee
        : undefined,
      mandatoryAttendance: mandatory,
      slotMinutes: slotMinutesFor(args.eventType, args.slotMinutes),
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
    eventType: v.optional(v.union(
      v.literal("corporate_market_update"),
      v.literal("workshop"),
      v.literal("regional"),
      v.literal("signup"),
      v.literal("other"),
    )),
    mandatoryAttendance: v.optional(v.boolean()),
    slotMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

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

    const isCMU = args.eventType === "corporate_market_update" || args.isCorporateMarketUpdate;
    // Auto-set mandatory attendance for Corporate & Market Updates
    const mandatory = isCMU ? true : args.mandatoryAttendance;

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
        isCorporateMarketUpdate: isCMU || undefined,
        eventType: args.eventType,
        mandatoryAttendance: mandatory,
        slotMinutes: slotMinutesFor(args.eventType, args.slotMinutes),
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

        // Derive eventType for backward compat with old data
        const eventType = event.eventType
          ?? (event.isCorporateMarketUpdate ? "corporate_market_update" as const : undefined);

        return { ...event, corporateAssigneeName, marketAssigneeName, eventType };
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
    eventType: v.optional(v.union(
      v.literal("corporate_market_update"),
      v.literal("workshop"),
      v.literal("regional"),
      v.literal("signup"),
      v.literal("other"),
    )),
    corporateAssignee: v.optional(v.id("users")),
    marketAssignee: v.optional(v.id("users")),
    mandatoryAttendance: v.optional(v.boolean()),
    slotMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.date !== undefined) updates.date = args.date;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.endTime !== undefined) updates.endTime = args.endTime;
    if (args.location !== undefined) updates.location = args.location;

    if (args.eventType !== undefined) {
      updates.eventType = args.eventType;
      const isCMU = args.eventType === "corporate_market_update";
      const isRegional = args.eventType === "regional";
      updates.isCorporateMarketUpdate = isCMU || undefined;
      if (isCMU) {
        updates.mandatoryAttendance = true;
      }
      if (!isCMU && !isRegional) {
        // Clear assignees when type doesn't use them
        updates.corporateAssignee = undefined;
        updates.marketAssignee = undefined;
      }
    } else if (args.isCorporateMarketUpdate !== undefined) {
      updates.isCorporateMarketUpdate = args.isCorporateMarketUpdate;
      if (args.isCorporateMarketUpdate) {
        updates.mandatoryAttendance = true;
      } else {
        updates.corporateAssignee = undefined;
        updates.marketAssignee = undefined;
      }
    }
    if (args.mandatoryAttendance !== undefined)
      updates.mandatoryAttendance = args.mandatoryAttendance;
    if (args.corporateAssignee !== undefined)
      updates.corporateAssignee = args.corporateAssignee;
    if (args.marketAssignee !== undefined)
      updates.marketAssignee = args.marketAssignee;

    const nextType = args.eventType ?? event.eventType;
    if (args.eventType !== undefined || args.slotMinutes !== undefined) {
      updates.slotMinutes = slotMinutesFor(
        nextType,
        args.slotMinutes ?? event.slotMinutes
      );
    }

    await ctx.db.patch(args.eventId, updates);

    // Reshaping the sheet (new hours, block length, or no longer a sheet)
    // can leave names against blocks that no longer exist. Drop them rather
    // than let them resurface if the sheet is later reshaped back.
    const next = { ...event, ...updates };
    const valid = new Set(
      next.eventType === "signup"
        ? blockStarts(next.startTime, next.endTime, next.slotMinutes ?? 30)
        : []
    );
    const signups = await ctx.db
      .query("eventBlockSignups")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const signup of signups) {
      if (!valid.has(signup.blockStart)) await ctx.db.delete(signup._id);
    }
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await deleteEventCascade(ctx, args.eventId);
  },
});

export const removeSeries = mutation({
  args: { seriesId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const events = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    for (const event of events) {
      await deleteEventCascade(ctx, event._id);
    }

    return { deleted: events.length };
  },
});
