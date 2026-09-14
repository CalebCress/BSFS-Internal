import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { blockEnd, blockStarts } from "./eventBlocks";

/**
 * Members putting their names against blocks of a sign-up sheet event.
 *
 * Every approved member can see the whole sheet, including who else is in
 * each block - that visibility is the point of a sheet - and can hold as many
 * blocks as they like.
 */

const DEFAULT_SLOT_MINUTES = 30;

/**
 * The sheet for one event: every block with the members in it, in time order.
 * Returns null for events that aren't sign-up sheets.
 */
export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const event = await ctx.db.get(args.eventId);
    if (!event || event.eventType !== "signup") return null;

    const slotMinutes = event.slotMinutes ?? DEFAULT_SLOT_MINUTES;
    const signups = await ctx.db
      .query("eventBlockSignups")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // One profile lookup per distinct member, not per row.
    const names = new Map<string, string>();
    for (const signup of signups) {
      const key = signup.userId.toString();
      if (names.has(key)) continue;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", signup.userId))
        .unique();
      names.set(key, profile?.displayName ?? "Unknown member");
    }

    const blocks = blockStarts(event.startTime, event.endTime, slotMinutes).map(
      (blockStart) => {
        const members = signups
          .filter((s) => s.blockStart === blockStart)
          .sort((a, b) => a.signedUpAt - b.signedUpAt)
          .map((s) => ({
            userId: s.userId,
            displayName: names.get(s.userId.toString()) ?? "Unknown member",
            isMe: s.userId === userId,
          }));
        return {
          blockStart,
          blockEnd: blockEnd(blockStart, slotMinutes),
          members,
          signedUp: members.some((m) => m.isMe),
        };
      }
    );

    return { slotMinutes, blocks };
  },
});

/**
 * Put the caller's name against a block, or take it off if it's already
 * there. A toggle rather than separate sign-up/withdraw mutations so a
 * double-click can't produce two rows or an error.
 */
export const toggle = mutation({
  args: { eventId: v.id("events"), blockStart: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.status !== "approved") {
      throw new Error("Only approved members can sign up");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.eventType !== "signup") {
      throw new Error("This event does not have a sign-up sheet");
    }

    // Checked against the derived blocks, not just the time range: the
    // client only offers valid starts, but the value arrives as a string.
    const valid = blockStarts(
      event.startTime,
      event.endTime,
      event.slotMinutes ?? DEFAULT_SLOT_MINUTES
    );
    if (!valid.includes(args.blockStart)) {
      throw new Error("That block is not part of this sign-up sheet");
    }

    const mine = await ctx.db
      .query("eventBlockSignups")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", userId)
      )
      .collect();
    const existing = mine.find((s) => s.blockStart === args.blockStart);

    if (existing) {
      await ctx.db.delete(existing._id);
      return { signedUp: false as const };
    }

    await ctx.db.insert("eventBlockSignups", {
      eventId: args.eventId,
      userId,
      blockStart: args.blockStart,
      signedUpAt: Date.now(),
    });
    return { signedUp: true as const };
  },
});
