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
    throw new Error("Only board members can manage attendance");
  }
  return userId;
}

/** Record or update attendance for a member at an event. */
export const record = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused")
    ),
  },
  handler: async (ctx, args) => {
    const recordedBy = await requireBoardMember(ctx);

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Check if record already exists
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_event_user", (q: any) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        recordedBy,
        recordedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("attendance", {
        eventId: args.eventId,
        userId: args.userId,
        status: args.status,
        recordedBy,
        recordedAt: Date.now(),
      });
    }
  },
});

/** Batch record attendance for multiple members at once. */
export const recordBatch = mutation({
  args: {
    eventId: v.id("events"),
    records: v.array(
      v.object({
        userId: v.id("users"),
        status: v.union(
          v.literal("present"),
          v.literal("absent"),
          v.literal("excused")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const recordedBy = await requireBoardMember(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    for (const record of args.records) {
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_event_user", (q: any) =>
          q.eq("eventId", args.eventId).eq("userId", record.userId)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: record.status,
          recordedBy,
          recordedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("attendance", {
          eventId: args.eventId,
          userId: record.userId,
          status: record.status,
          recordedBy,
          recordedAt: Date.now(),
        });
      }
    }
  },
});

/** Get attendance records for a specific event. */
export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Board-only check
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "board_member") return [];

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q: any) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with member names
    const enriched = await Promise.all(
      records.map(async (record: any) => {
        const memberProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", record.userId))
          .unique();
        return {
          ...record,
          displayName: memberProfile?.displayName ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

/** List events that can have attendance recorded (non-interview global events). */
export const listAttendanceEvents = query({
  args: {
    year: v.optional(v.number()),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "board_member") return [];

    let events = await ctx.db.query("events").collect();

    // Only show mandatory attendance events
    events = events.filter((e: any) => e.mandatoryAttendance === true);

    // Filter by year/month if provided
    if (args.year !== undefined && args.month !== undefined) {
      const monthStr = String(args.month).padStart(2, "0");
      const prefix = `${args.year}-${monthStr}`;
      events = events.filter((e: any) => e.date.startsWith(prefix));
    }

    // Enrich with attendance count
    const enriched = await Promise.all(
      events.map(async (event: any) => {
        const records = await ctx.db
          .query("attendance")
          .withIndex("by_event", (q: any) => q.eq("eventId", event._id))
          .collect();
        const presentCount = records.filter(
          (r: any) => r.status === "present"
        ).length;
        const totalRecords = records.length;
        return { ...event, presentCount, totalRecords };
      })
    );

    return enriched.sort((a: any, b: any) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

/** Get attendance statistics for all members. */
export const getMemberStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "board_member") return [];

    // Get all approved non-alumni members
    const allProfiles = await ctx.db.query("profiles").collect();
    const activeMembers = allProfiles.filter(
      (p: any) => p.status === "approved" && p.role !== "alumni"
    );

    // Get mandatory events only (for percentage calculation)
    const allEvents = await ctx.db.query("events").collect();
    const mandatoryEvents = allEvents.filter(
      (e: any) => e.mandatoryAttendance === true
    );
    const totalEvents = mandatoryEvents.length;
    const mandatoryEventIds = new Set(
      mandatoryEvents.map((e: any) => e._id.toString())
    );

    // Get attendance records for mandatory events only
    const allAttendanceRaw = await ctx.db.query("attendance").collect();
    const allAttendance = allAttendanceRaw.filter((a: any) =>
      mandatoryEventIds.has(a.eventId.toString())
    );

    // Build stats per member
    const stats = activeMembers.map((member: any) => {
      const memberRecords = allAttendance.filter(
        (a: any) => a.userId === member.userId
      );
      const present = memberRecords.filter(
        (r: any) => r.status === "present"
      ).length;
      const absent = memberRecords.filter(
        (r: any) => r.status === "absent"
      ).length;
      const excused = memberRecords.filter(
        (r: any) => r.status === "excused"
      ).length;
      const totalRecorded = memberRecords.length;
      const attendanceRate =
        totalRecorded > 0 ? Math.round((present / totalRecorded) * 100) : null;

      return {
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        present,
        absent,
        excused,
        totalRecorded,
        totalEvents,
        attendanceRate,
      };
    });

    return stats.sort((a: any, b: any) =>
      a.displayName.localeCompare(b.displayName)
    );
  },
});
