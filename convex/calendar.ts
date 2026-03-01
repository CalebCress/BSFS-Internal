import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getProfileByIcalToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_icalToken", (q) => q.eq("icalToken", args.token))
      .unique();
    return profile;
  },
});

export const getCalendarData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events
    const events = await ctx.db.query("events").collect();

    // Get user's interview signups
    const signups = await ctx.db
      .query("interviewSignups")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich signups with slot details + applicant names
    const interviews = await Promise.all(
      signups.map(async (signup) => {
        const slot = await ctx.db.get(signup.slotId);
        if (!slot) return null;

        let applicantName: string | null = null;
        if (slot.applicantId) {
          const applicant = await ctx.db.get(slot.applicantId);
          if (applicant) {
            applicantName = `${applicant.firstName} ${applicant.lastName}`;
          }
        }

        return {
          _id: signup._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          applicantName,
        };
      })
    );

    return {
      events,
      interviews: interviews.filter(
        (i): i is NonNullable<typeof i> => i !== null
      ),
    };
  },
});
