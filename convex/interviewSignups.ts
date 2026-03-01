import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sign up for an interview slot
export const signup = mutation({
  args: { slotId: v.id("interviewSlots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");

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

    const mySignups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enriched = await Promise.all(
      mySignups.map(async (signup) => {
        const slot = await ctx.db.get(signup.slotId);
        if (!slot) return null;

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
