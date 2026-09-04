import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Which applicants a member is personally involved with.
 *
 * Committee members don't get the whole pipeline: they see the people they are
 * actually interviewing and nobody else. That rule is enforced in several
 * places - the applicant list, the detail page, the stage counts - so the
 * lookup lives here rather than being re-derived at each call site.
 */

/**
 * Applicant ids this user is signed up to interview, optionally for one round.
 *
 * One query by user, then the slots they hold - cheaper than scanning slots per
 * applicant, and the set answers "can I see this person?" in O(1) afterwards.
 */
export async function applicantIdsIAmInterviewing(
  ctx: QueryCtx,
  userId: Id<"users">,
  type?: "telephone" | "assessment_center"
): Promise<Set<string>> {
  const signups = await ctx.db
    .query("interviewSignups")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const applicantIds = new Set<string>();
  for (const signup of signups) {
    const slot = await ctx.db.get(signup.slotId);
    if (!slot || !slot.applicantId) continue;
    if (type && slot.type !== type) continue;
    applicantIds.add(slot.applicantId.toString());
  }
  return applicantIds;
}
