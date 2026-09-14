import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import {
  convexAuth,
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  resend,
  resetFromAddress,
  replyToAddresses,
  siteUrl,
  escapeHtml,
} from "./email";

/** How long a password reset link stays valid. */
const RESET_LINK_MAX_AGE_S = 60 * 60;

/**
 * Self-service password reset.
 *
 * Convex Auth mints a one-time code, and we email it as a link to
 * /reset-password carrying both the code and the email: the verification step
 * needs both, so the page can submit them along with the new password without
 * the user retyping anything. The code is 32 random alphanumerics, so the
 * link is not guessable.
 */
const ResendPasswordReset = Email({
  id: "resend-password-reset",
  maxAge: RESET_LINK_MAX_AGE_S,
  // The library passes its action ctx as a second argument, but the Auth.js
  // type it reuses doesn't declare it - hence the optional, explicitly typed
  // parameter rather than the inferred one.
  async sendVerificationRequest(
    { identifier: email, token }: { identifier: string; token: string },
    ctx?: ActionCtx
  ) {
    if (!ctx) throw new Error("Password reset requires an action context");
    const link =
      `${siteUrl()}/reset-password` +
      `?email=${encodeURIComponent(email)}&code=${encodeURIComponent(token)}`;
    const { subject, html, text } = buildResetEmail(link);

    // The auth library hands us an action ctx, which can enqueue through the
    // Resend component just like a mutation can.
    await resend.sendEmail(ctx, {
      from: resetFromAddress(),
      to: email,
      subject,
      html,
      text,
      replyTo: replyToAddresses(),
    });
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ reset: ResendPasswordReset })],
});

/** Plain, deliverable HTML - no external CSS or images, which spam filters dislike. */
function buildResetEmail(link: string) {
  const subject = "Reset your BSFS App password";
  const safeLink = escapeHtml(link);
  const hours = RESET_LINK_MAX_AGE_S / 3600;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
  <p>Hi,</p>
  <p>
    We received a request to reset the password for your BSFS App account.
    Use the button below to choose a new one.
  </p>
  <p style="margin:28px 0">
    <a href="${safeLink}" style="background:#0b3d91;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">
      Reset password
    </a>
  </p>
  <p style="color:#555">
    This link expires in ${hours} hour${hours === 1 ? "" : "s"}. If you didn't
    ask to reset your password, you can ignore this email and your password
    will stay the same.
  </p>
  <p style="color:#555;font-size:13px">
    If the button doesn't work, copy this link into your browser:<br />
    <a href="${safeLink}" style="color:#0b3d91">${safeLink}</a>
  </p>
  <p>Best regards,<br />The BSFS Team</p>
</div>`.trim();

  const text = [
    "Hi,",
    "",
    "We received a request to reset the password for your BSFS App account.",
    "Use the link below to choose a new one:",
    "",
    link,
    "",
    `This link expires in ${hours} hour${hours === 1 ? "" : "s"}.`,
    "If you didn't ask to reset your password, you can ignore this email and your password will stay the same.",
    "",
    "Best regards,",
    "The BSFS Team",
  ].join("\n");

  return { subject, html, text };
}

export const getMyEmail = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.runQuery(internal.auth.getMyEmail);
    if (!email) {
      throw new Error("You must be signed in to change your password.");
    }
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }
    if (args.currentPassword === args.newPassword) {
      throw new Error("New password must be different from the current password.");
    }

    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.currentPassword },
      });
    } catch {
      throw new Error("Current password is incorrect.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.newPassword },
    });
  },
});

// Manual password reset, intended to be run from the Convex dashboard's
// function runner. The dashboard is only accessible to trusted project
// members, so this does not require the user's current password — it sets a
// new password directly for the account matching `email`.
export const adminResetPassword = action({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.newPassword },
    });
  },
});
