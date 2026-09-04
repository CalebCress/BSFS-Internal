import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess, isBoardMember } from "./permissions";

/** Convert "HH:MM" to total minutes for arithmetic */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert total minutes back to "HH:MM" */
function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const slotTypeValidator = v.union(
  v.literal("telephone"),
  v.literal("assessment_center")
);

// Batch create interview slots from a time range
export const batchCreate = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    duration: v.number(),
    type: slotTypeValidator,
    maxInterviewers: v.number(),
    // Parallel tables per time window. Assessment centres run several at once;
    // telephone interviews are always 1.
    tables: v.optional(v.number()),
    autoAssign: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Board member check
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasAdminAccess(profile)) {
      throw new Error("Only board members can create interview slots");
    }

    // Validate inputs
    if (![15, 30, 45, 60].includes(args.duration)) {
      throw new Error("Duration must be 15, 30, 45, or 60 minutes");
    }
    if (args.maxInterviewers < 1) {
      throw new Error("Max interviewers must be at least 1");
    }
    const tables = args.tables ?? 1;
    if (!Number.isInteger(tables) || tables < 1 || tables > 20) {
      throw new Error("Tables must be a whole number between 1 and 20");
    }

    const startMin = toMinutes(args.startTime);
    const endMin = toMinutes(args.endTime);
    if (endMin <= startMin) {
      throw new Error("End time must be after start time");
    }

    // Generate slots
    const slotIds = [];
    let currentMin = startMin;
    while (currentMin + args.duration <= endMin) {
      const slotStart = fromMinutes(currentMin);
      const slotEnd = fromMinutes(currentMin + args.duration);

      // One row per table, all sharing the same time window.
      for (let table = 1; table <= tables; table++) {
        const slotId = await ctx.db.insert("interviewSlots", {
          date: args.date,
          startTime: slotStart,
          endTime: slotEnd,
          type: args.type,
          maxInterviewers: args.maxInterviewers,
          tableNumber: tables > 1 ? table : undefined,
          createdBy: userId,
        });
        slotIds.push(slotId);
      }
      currentMin += args.duration;
    }

    // Auto-assign applicants in the matching stage
    let applicantsAssigned = 0;
    if (args.autoAssign && slotIds.length > 0) {
      // Find applicants in the matching stage
      const applicants = await ctx.db
        .query("applicants")
        .withIndex("by_stage", (q) => q.eq("stage", args.type))
        .collect();

      // Find which applicants already have a slot assigned (any slot of this type)
      const allSlotsOfType = await ctx.db
        .query("interviewSlots")
        .withIndex("by_type", (q) => q.eq("type", args.type))
        .collect();

      const alreadyAssigned = new Set(
        allSlotsOfType
          .filter((s) => s.applicantId !== undefined)
          .map((s) => s.applicantId!.toString())
      );

      // Filter to unassigned, sorted by appliedAt
      const toAssign = applicants
        .filter((a) => !alreadyAssigned.has(a._id.toString()))
        .sort((a, b) => a.appliedAt - b.appliedAt);

      // Round-robin assign to new slots
      for (
        let i = 0;
        i < Math.min(toAssign.length, slotIds.length);
        i++
      ) {
        await ctx.db.patch(slotIds[i], { applicantId: toAssign[i]._id });
        applicantsAssigned++;
      }
    }

    return { slotsCreated: slotIds.length, applicantsAssigned };
  },
});

// List all slots with signup counts and applicant names
export const list = query({
  args: {
    type: v.optional(slotTypeValidator),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let slots;
    if (args.type) {
      slots = await ctx.db
        .query("interviewSlots")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else if (args.date) {
      slots = await ctx.db
        .query("interviewSlots")
        .withIndex("by_date", (q) => q.eq("date", args.date!))
        .collect();
    } else {
      slots = await ctx.db.query("interviewSlots").collect();
    }

    // Filter by date if both type and date are provided
    if (args.type && args.date) {
      slots = slots.filter((s) => s.date === args.date);
    }

    // Interviewer names, resolved once for the whole page rather than per
    // slot: the profiles table is small and the same people recur across every
    // slot in a round.
    const profiles = await ctx.db.query("profiles").collect();
    const nameByUserId = new Map(
      profiles.map((p) => [p.userId.toString(), p.displayName])
    );

    // Enrich each slot with signup count and applicant name
    const enriched = await Promise.all(
      slots.map(async (slot) => {
        const signups = await ctx.db
          .query("interviewSignups")
          .withIndex("by_slot", (q) => q.eq("slotId", slot._id))
          .collect();

        let applicantName: string | null = null;
        if (slot.applicantId) {
          const applicant = await ctx.db.get(slot.applicantId);
          if (applicant) {
            applicantName = `${applicant.firstName} ${applicant.lastName}`;
          }
        }

        return {
          ...slot,
          signupCount: signups.length,
          signupUserIds: signups.map((s) => s.userId.toString()),
          interviewers: signups.map((s) => ({
            userId: s.userId,
            name: nameByUserId.get(s.userId.toString()) ?? "Unknown member",
          })),
          applicantName,
        };
      })
    );

    // Sort by date, then startTime
    return enriched.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Reassign or unassign an applicant on a slot (board members only)
export const update = mutation({
  args: {
    slotId: v.id("interviewSlots"),
    applicantId: v.optional(v.id("applicants")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasAdminAccess(profile)) {
      throw new Error("Only board members can reassign applicants");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");

    await ctx.db.patch(args.slotId, { applicantId: args.applicantId });
  },
});

// Delete a slot and all its signups (board members only)
export const remove = mutation({
  args: { slotId: v.id("interviewSlots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    // Strictly the board seat, not hasAdminAccess: deleting a slot destroys an
    // applicant's booked time and every interviewer signup on it, so it is
    // held tighter than creating or reassigning one.
    if (!profile || !isBoardMember(profile) || profile.status !== "approved") {
      throw new Error("Only board members can delete slots");
    }

    // Cascade-delete all signups for this slot
    const signups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect();
    for (const signup of signups) {
      await ctx.db.delete(signup._id);
    }

    await ctx.db.delete(args.slotId);
  },
});
