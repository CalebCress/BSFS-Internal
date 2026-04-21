import { Password } from "@convex-dev/auth/providers/Password";
import {
  convexAuth,
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

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
