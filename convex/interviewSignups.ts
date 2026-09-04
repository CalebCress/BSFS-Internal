import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { isBoardMember } from "./permissions";
import { isBoardOnlyReviewType } from "./reviewCategories";
import { overlaps, type TimeWindow } from "./interviewTimes";

/**
 * The signup of `userId` that clashes with `slot`, ignoring `exceptSlotId`.
 *
 * Shared by self-signup and by a board member moving someone: a rearranged
 * schedule must not double-book an interviewer any more than a careless
 * self-signup can.
 */
async function findConflict(
  ctx: MutationCtx,
  userId: Id<"users">,
  slot: TimeWindow,
  exceptSlotId?: Id<"interviewSlots">
): Promise<Doc<"interviewSlots"> | null> {
  const signups = await ctx.db
    .query("interviewSignups")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const signup of signups) {
    if (signup.slotId === exceptSlotId) continue;
    const other = await ctx.db.get(signup.slotId);
    if (other && overlaps(slot, other)) return other;
  }
  return null;
}

// Sign up for an interview slot
export const signup = mutation({
  args: { slotId: v.id("interviewSlots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");

    // Telephone interviews are run by the board, so they are neither listed to
    // nor bookable by anyone else. Enforced here and not just hidden in the UI:
    // the slot id is guessable from a shared link or an old page.
    if (isBoardOnlyReviewType(slot.type)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (!profile || !isBoardMember(profile)) {
        throw new Error("Only board members conduct telephone interviews");
      }
    }

    // Check if already signed up
    const existingSignups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect();

    const alreadySignedUp = existingSignups.some(
      (s) => s.userId === userId
    );
    if (alreadySignedUp) {
      throw new Error("You are already signed up for this slot");
    }

    // Check capacity
    if (existingSignups.length >= slot.maxInterviewers) {
      throw new Error("This slot is at capacity");
    }

    // You can only be in one interview at a time. This is easy to get wrong by
    // accident: an assessment centre runs several tables in the same half hour,
    // so two adjacent cards on the schedule can be the very same time window.
    const conflict = await findConflict(ctx, userId, slot, slot._id);
    if (conflict) {
      throw new Error(
        `You are already signed up for ${conflict.startTime}-${conflict.endTime} ` +
          `on ${conflict.date}, which overlaps this slot. Cancel that signup ` +
          `first if you meant to move.`
      );
    }

    return await ctx.db.insert("interviewSignups", {
      slotId: args.slotId,
      userId,
      signedUpAt: Date.now(),
    });
  },
});

// Cancel signup for an interview slot
export const cancel = mutation({
  args: { slotId: v.id("interviewSlots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const signups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect();

    const mySignup = signups.find((s) => s.userId === userId);
    if (!mySignup) {
      throw new Error("You are not signed up for this slot");
    }

    await ctx.db.delete(mySignup._id);
  },
});

// List all slots the current user is signed up for
export const listMySignups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const board = !!profile && isBoardMember(profile);

    const mySignups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enriched = await Promise.all(
      mySignups.map(async (signup) => {
        const slot = await ctx.db.get(signup.slotId);
        if (!slot) return null;
        // Consistent with the schedule: a non-board member is never shown a
        // telephone slot, including one they somehow hold.
        if (!board && isBoardOnlyReviewType(slot.type)) return null;

        // Get signup count for this slot
        const allSignups = await ctx.db
          .query("interviewSignups")
          .withIndex("by_slot", (q) => q.eq("slotId", slot._id))
          .collect();

        // Get applicant name if assigned
        let applicantName: string | null = null;
        if (slot.applicantId) {
          const applicant = await ctx.db.get(slot.applicantId);
          if (applicant) {
            applicantName = `${applicant.firstName} ${applicant.lastName}`;
          }
        }

        return {
          signupId: signup._id,
          signedUpAt: signup.signedUpAt,
          slot: {
            ...slot,
            signupCount: allSignups.length,
            applicantName,
          },
        };
      })
    );

    // Filter nulls (deleted slots) and sort by date, startTime
    return enriched
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => {
        if (a.slot.date !== b.slot.date)
          return a.slot.date.localeCompare(b.slot.date);
        return a.slot.startTime.localeCompare(b.slot.startTime);
      });
  },
});

/**
 * Move an interviewer from one slot to another (board members only).
 *
 * The signup row is patched rather than deleted and recreated, so the original
 * signedUpAt survives the move - who volunteered first still reads correctly
 * after the board rearranges a day.
 *
 * Every rule that applies to signing yourself up applies here too. A board
 * member rearranging a schedule at speed is at least as likely to create a
 * double-booking as the person clicking one slot at a time.
 */
export const moveInterviewer = mutation({
  args: {
    fromSlotId: v.id("interviewSlots"),
    toSlotId: v.id("interviewSlots"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .unique();
    if (!caller || !isBoardMember(caller) || caller.status !== "approved") {
      throw new Error("Only board members can move interviewers");
    }

    if (args.fromSlotId === args.toSlotId) return;

    const target = await ctx.db.get(args.toSlotId);
    if (!target) throw new Error("That slot no longer exists");

    const signup = (
      await ctx.db
        .query("interviewSignups")
        .withIndex("by_slot", (q) => q.eq("slotId", args.fromSlotId))
        .collect()
    ).find((row) => row.userId === args.userId);
    if (!signup) {
      throw new Error("That interviewer is not signed up for this slot");
    }

    const targetSignups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", args.toSlotId))
      .collect();

    if (targetSignups.some((row) => row.userId === args.userId)) {
      throw new Error("They are already signed up for that slot");
    }
    if (targetSignups.length >= target.maxInterviewers) {
      throw new Error("That slot is already at capacity");
    }

    // Their other commitments still stand - just not the one being vacated.
    const conflict = await findConflict(
      ctx,
      args.userId,
      target,
      args.fromSlotId
    );
    if (conflict) {
      throw new Error(
        `They are already interviewing at ${conflict.startTime}-` +
          `${conflict.endTime} on ${conflict.date}, which overlaps that slot.`
      );
    }

    await ctx.db.patch(signup._id, { slotId: args.toSlotId });
  },
});

/** Remove an interviewer from a slot (board members only). */
export const removeInterviewer = mutation({
  args: { slotId: v.id("interviewSlots"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .unique();
    if (!caller || !isBoardMember(caller) || caller.status !== "approved") {
      throw new Error("Only board members can remove interviewers");
    }

    const signup = (
      await ctx.db
        .query("interviewSignups")
        .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
        .collect()
    ).find((row) => row.userId === args.userId);
    if (!signup) {
      throw new Error("That interviewer is not signed up for this slot");
    }

    await ctx.db.delete(signup._id);
  },
});
