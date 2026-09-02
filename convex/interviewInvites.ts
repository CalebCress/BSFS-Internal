import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { hasAdminAccess } from "./permissions";
import { resend, fromAddress, replyToAddresses } from "./email";
import { RESCHEDULE_CUTOFF_HOURS } from "./interviewBooking";

/**
 * Emailing applicants their interview booking link.
 *
 * Sends are enqueued through the Resend component, which batches and retries
 * them durably, so a bulk send of a whole cohort is a single fast mutation.
 */

const interviewStageValidator = v.union(
  v.literal("telephone"),
  v.literal("assessment_center")
);

const STAGE_LABELS = {
  telephone: "telephone interview",
  assessment_center: "assessment centre",
} as const;

/** Require an approved board member / admin. */
async function requireAdmin(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile || !hasAdminAccess(profile)) {
    throw new Error("Only board members can send interview invites");
  }
  return profile;
}

/** Public origin for links in emails, e.g. https://bsfs.example.com */
function siteUrl(): string {
  const url = process.env.SITE_URL;
  if (!url) {
    throw new Error(
      "SITE_URL is not set on this deployment, so booking links cannot be built."
    );
  }
  return url.replace(/\/+$/, "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain, deliverable HTML - no external CSS or images, which spam filters dislike. */
function buildInviteEmail(firstName: string, stage: keyof typeof STAGE_LABELS, link: string) {
  const label = STAGE_LABELS[stage];
  const subject = `Book your BSFS ${label}`;
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(link);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
  <p>Hi ${safeName},</p>
  <p>
    Congratulations on progressing to the ${label} stage of the BSFS
    application process. Please use the link below to choose a time that suits you.
  </p>
  <p style="margin:28px 0">
    <a href="${safeLink}" style="background:#0b3d91;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">
      Choose your time
    </a>
  </p>
  <p style="color:#555">
    You can change or cancel your slot up until ${RESCHEDULE_CUTOFF_HOURS} hours
    before your interview. After that, please reply to this email and we'll help.
  </p>
  <p style="color:#555;font-size:13px">
    If the button doesn't work, copy this link into your browser:<br />
    <a href="${safeLink}" style="color:#0b3d91">${safeLink}</a>
  </p>
  <p>Best regards,<br />The BSFS Team</p>
</div>`.trim();

  const text = [
    `Hi ${firstName},`,
    "",
    `Congratulations on progressing to the ${label} stage of the BSFS application process.`,
    `Please use the link below to choose a time that suits you:`,
    "",
    link,
    "",
    `You can change or cancel your slot up until ${RESCHEDULE_CUTOFF_HOURS} hours before your interview.`,
    `After that, please reply to this email and we'll help.`,
    "",
    "Best regards,",
    "The BSFS Team",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Enqueue one invite. Mints a booking token if the applicant has none.
 *
 * `idempotencyKey` is supplied only for bulk sends: it keys on the current
 * token, so a double-clicked mass send can't email a cohort twice, while a
 * deliberate single resend from the detail page still goes out.
 */
async function enqueueInvite(
  ctx: MutationCtx,
  applicant: Doc<"applicants">,
  stage: keyof typeof STAGE_LABELS,
  opts: { dedupe: boolean }
) {
  let token = applicant.bookingToken;
  if (!token) {
    token = crypto.randomUUID();
    await ctx.db.patch(applicant._id, { bookingToken: token });
  }

  const link = `${siteUrl()}/interview/${token}`;
  const { subject, html, text } = buildInviteEmail(applicant.firstName, stage, link);

  await resend.sendEmail(ctx, {
    from: fromAddress(),
    to: `${applicant.firstName} ${applicant.lastName} <${applicant.email}>`,
    subject,
    html,
    text,
    replyTo: replyToAddresses(),
    ...(opts.dedupe ? { idempotencyKey: `invite:${applicant._id}:${token}` } : {}),
  });

  await ctx.db.patch(applicant._id, { inviteLastSentAt: Date.now() });
}

/** Send (or resend) the booking invite to a single applicant. */
export const sendInvite = mutation({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const applicant = await ctx.db.get(args.applicantId);
    if (!applicant) throw new Error("Applicant not found");
    if (
      applicant.stage !== "telephone" &&
      applicant.stage !== "assessment_center"
    ) {
      throw new Error(
        "This applicant isn't in an interview stage, so there's nothing to book yet."
      );
    }

    // No dedupe key: a single send from the detail page is always deliberate,
    // so resending after a bounce or a typo fix must actually go out.
    await enqueueInvite(ctx, applicant, applicant.stage, { dedupe: false });
    return { sent: 1 };
  },
});

/**
 * Send booking invites to everyone in a stage.
 *
 * Skips applicants already invited unless `includeAlreadyInvited` is set, so
 * running it again after adding a few people doesn't re-mail the whole cohort.
 */
export const sendInvitesForStage = mutation({
  args: {
    stage: interviewStageValidator,
    includeAlreadyInvited: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const applicants = await ctx.db
      .query("applicants")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .collect();

    const recipients = args.includeAlreadyInvited
      ? applicants
      : applicants.filter((a) => a.inviteLastSentAt === undefined);

    for (const applicant of recipients) {
      await enqueueInvite(ctx, applicant, args.stage, { dedupe: true });
    }

    return { sent: recipients.length, skipped: applicants.length - recipients.length };
  },
});

/** Recipient counts so the confirm dialog can say exactly who will be emailed. */
export const getInviteCounts = query({
  args: { stage: interviewStageValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, notYetInvited: 0, alreadyInvited: 0 };

    const applicants = await ctx.db
      .query("applicants")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .collect();

    const alreadyInvited = applicants.filter(
      (a) => a.inviteLastSentAt !== undefined
    ).length;

    return {
      total: applicants.length,
      notYetInvited: applicants.length - alreadyInvited,
      alreadyInvited,
    };
  },
});
