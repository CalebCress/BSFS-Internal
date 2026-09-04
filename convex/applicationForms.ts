import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { isBoardMember } from "./permissions";

/**
 * Application rounds are the board's to run - opening one starts accepting
 * applications from the public, and closing one stops it.
 *
 * Note getActive stays open to everyone, authenticated or not: the public
 * apply page needs it.
 */
async function isBoard(ctx: QueryCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  return !!profile && isBoardMember(profile) && profile.status === "approved";
}

async function requireBoard(ctx: QueryCtx) {
  if (!(await isBoard(ctx))) {
    throw new Error("Only board members can manage application rounds");
  }
}

export const create = mutation({
  args: {
    title: v.string(),
    semester: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBoard(ctx);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("applicationForms", {
      title: args.title,
      semester: args.semester,
      isActive: false,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isBoard(ctx))) return [];

    const forms = await ctx.db
      .query("applicationForms")
      .order("desc")
      .collect();

    const formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const applicants = await ctx.db
          .query("applicants")
          .withIndex("by_applicationForm", (q) =>
            q.eq("applicationFormId", form._id)
          )
          .collect();
        return {
          ...form,
          applicantCount: applicants.length,
        };
      })
    );

    return formsWithCounts;
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const activeForm = await ctx.db
      .query("applicationForms")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    return activeForm ?? null;
  },
});

export const activate = mutation({
  args: {
    id: v.id("applicationForms"),
  },
  handler: async (ctx, args) => {
    await requireBoard(ctx);

    // Deactivate all currently active forms
    const activeForms = await ctx.db
      .query("applicationForms")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const form of activeForms) {
      await ctx.db.patch(form._id, { isActive: false });
    }

    // Activate the target form
    await ctx.db.patch(args.id, { isActive: true });
  },
});

export const deactivate = mutation({
  args: {
    id: v.id("applicationForms"),
  },
  handler: async (ctx, args) => {
    await requireBoard(ctx);

    await ctx.db.patch(args.id, { isActive: false });
  },
});
