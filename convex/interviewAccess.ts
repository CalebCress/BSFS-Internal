import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canReviewApplications, isBoardMember } from "./permissions";

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

/**
 * May this person open this applicant's record?
 *
 * Three ways in, and no others:
 *   - the board, who run the whole pipeline;
 *   - a CV Reviewer, but only while the applicant is still in the application
 *     round, which is the round they were given;
 *   - anyone signed up to interview that applicant, in either round.
 *
 * Shared by applicants.list, applicants.getById and the review queries, so the
 * list someone is shown and the records they can open can't disagree.
 */
export async function canAccessApplicant(
  ctx: QueryCtx,
  userId: Id<"users">,
  applicant: { _id: Id<"applicants">; stage: string },
  profile: { role: string; specialRole?: string; status?: string } | null
): Promise<boolean> {
  if (!profile) return false;
  if (isBoardMember(profile)) return true;
  if (canReviewApplications(profile) && applicant.stage === "applied") {
    return true;
  }

  const mine = await applicantIdsIAmInterviewing(ctx, userId);
  return mine.has(applicant._id.toString());
}
