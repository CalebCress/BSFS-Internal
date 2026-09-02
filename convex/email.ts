import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Outbound email, via the Resend Convex component.
 *
 * The component owns queueing, batching and retries, so callers just enqueue
 * from an ordinary mutation and the send happens durably in the background.
 *
 * testMode defaults to TRUE in the component, which silently drops anything
 * addressed outside Resend's own test inboxes. Production sending is therefore
 * opt-in: set RESEND_TEST_MODE=false on the deployment once your domain is
 * verified. Keeping it as an env var means dev can stay safely sandboxed while
 * prod sends for real.
 */
export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE !== "false",
  onEmailEvent: internal.email.handleEmailEvent,
});

/**
 * The verified sender, e.g. `BSFS Recruitment <recruitment@yourdomain.com>`.
 * Kept out of the code so dev and prod can differ and the domain isn't baked in.
 */
export function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set on this deployment. Set it to a verified " +
        'Resend sender, e.g. "BSFS Recruitment <recruitment@yourdomain.com>".'
    );
  }
  return from;
}

/** Where applicants' replies should land. Falls back to the from address. */
export function replyToAddresses(): string[] | undefined {
  const replyTo = process.env.RESEND_REPLY_TO;
  return replyTo ? [replyTo] : undefined;
}

/**
 * Delivery notifications from Resend's webhook.
 *
 * Logged rather than stored: a bounce is the one outcome worth acting on
 * (a typo'd applicant address means they never got their booking link), and
 * the component already keeps full history in its own tables.
 */
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: (_ctx, args) => {
    const { id, event } = args;
    if (event.type === "email.bounced" || event.type === "email.complained") {
      console.error(
        `Resend ${event.type} for email ${id}: ${JSON.stringify(event.data.to)}`
      );
    } else {
      console.log(`Resend ${event.type} for email ${id}`);
    }
  },
});
