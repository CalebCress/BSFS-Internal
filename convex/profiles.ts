import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess } from "./permissions";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    const user = await ctx.db.get(userId);
    const photoUrl = profile.photoStorageId
      ? await ctx.storage.getUrl(profile.photoStorageId)
      : null;
    const cvUrl = profile.cvStorageId
      ? await ctx.storage.getUrl(profile.cvStorageId)
      : null;

    return {
      ...profile,
      email: user?.email,
      photoUrl,
      cvUrl,
    };
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) return null;

    const user = await ctx.db.get(args.userId);
    const photoUrl = profile.photoStorageId
      ? await ctx.storage.getUrl(profile.photoStorageId)
      : null;
    const cvUrl = profile.cvStorageId
      ? await ctx.storage.getUrl(profile.cvStorageId)
      : null;

    return {
      ...profile,
      email: user?.email,
      photoUrl,
      cvUrl,
    };
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    linkedIn: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    cvStorageId: v.optional(v.id("_storage")),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      displayName: args.displayName.trim(),
      linkedIn: args.linkedIn?.trim() || undefined,
      photoStorageId: args.photoStorageId,
      cvStorageId: args.cvStorageId,
      jobTitle: args.jobTitle?.trim() || undefined,
      company: args.company?.trim() || undefined,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Sign-up: creates a new profile with status "pending"
export const submitSignUp = mutation({
  args: {
    displayName: v.string(),
    linkedIn: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    cvStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) throw new Error("Profile already exists");

    return await ctx.db.insert("profiles", {
      userId,
      role: "committee_member",
      status: "pending",
      displayName: args.displayName.trim(),
      linkedIn: args.linkedIn?.trim() || undefined,
      photoStorageId: args.photoStorageId,
      cvStorageId: args.cvStorageId,
    });
  },
});

// Alumni sign-up: creates a new profile with role "alumni" and status "pending"
export const submitAlumniSignUp = mutation({
  args: {
    displayName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    cvStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) throw new Error("Profile already exists");

    return await ctx.db.insert("profiles", {
      userId,
      role: "alumni",
      status: "pending",
      displayName: args.displayName.trim(),
      jobTitle: args.jobTitle?.trim() || undefined,
      company: args.company?.trim() || undefined,
      linkedIn: args.linkedIn?.trim() || undefined,
      photoStorageId: args.photoStorageId,
      cvStorageId: args.cvStorageId,
    });
  },
});

// List approved alumni (for the Alumni directory)
export const listAlumni = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const alumni = profiles.filter((p) => p.role === "alumni");

    return Promise.all(
      alumni.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const photoUrl = profile.photoStorageId
          ? await ctx.storage.getUrl(profile.photoStorageId)
          : null;
        return {
          ...profile,
          email: user?.email,
          photoUrl,
        };
      })
    );
  },
});

// Keep for backward compat — no longer auto-called from frontend
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) return existing._id;

    const user = await ctx.db.get(userId);
    const displayName = user?.name ?? user?.email ?? "Member";

    return await ctx.db.insert("profiles", {
      userId,
      role: "committee_member",
      status: "approved",
      displayName,
    });
  },
});

// Board member: approve a pending member
export const approveMember = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || !hasAdminAccess(callerProfile)) {
      throw new Error("Only admins can approve members");
    }

    const target = await ctx.db.get(args.profileId);
    if (!target || target.status !== "pending") {
      throw new Error("Profile not found or not pending");
    }

    await ctx.db.patch(args.profileId, { status: "approved" });
  },
});

// Board member: reject a pending member
export const rejectMember = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || !hasAdminAccess(callerProfile)) {
      throw new Error("Only admins can reject members");
    }

    const target = await ctx.db.get(args.profileId);
    if (!target || target.status !== "pending") {
      throw new Error("Profile not found or not pending");
    }

    await ctx.db.patch(args.profileId, { status: "rejected" });
  },
});

// Board member: list all pending sign-ups
export const listPendingSignUps = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || !hasAdminAccess(callerProfile)) return [];

    const pending = await ctx.db
      .query("profiles")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return Promise.all(
      pending.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const photoUrl = profile.photoStorageId
          ? await ctx.storage.getUrl(profile.photoStorageId)
          : null;
        const cvUrl = profile.cvStorageId
          ? await ctx.storage.getUrl(profile.cvStorageId)
          : null;
        return { ...profile, email: user?.email, photoUrl, cvUrl };
      })
    );
  },
});

// Board member: remove a member (deletes profile, cascades theses)
export const removeMember = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || !hasAdminAccess(callerProfile)) {
      throw new Error("Only admins can remove members");
    }

    const target = await ctx.db.get(args.profileId);
    if (!target) throw new Error("Profile not found");

    // Prevent removing yourself
    if (target.userId === userId) {
      throw new Error("You cannot remove yourself");
    }

    // Delete their stock theses
    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_user", (q) => q.eq("userId", target.userId))
      .collect();
    for (const thesis of theses) {
      await ctx.db.delete(thesis._id);
    }

    // Delete stored files
    if (target.photoStorageId) {
      await ctx.storage.delete(target.photoStorageId);
    }
    if (target.cvStorageId) {
      await ctx.storage.delete(target.cvStorageId);
    }

    // Delete the profile
    await ctx.db.delete(args.profileId);
  },
});

// Board member: list ALL members (for admin management page)
export const listAllMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || !hasAdminAccess(callerProfile)) return [];

    const profiles = await ctx.db.query("profiles").collect();
    return Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const photoUrl = profile.photoStorageId
          ? await ctx.storage.getUrl(profile.photoStorageId)
          : null;
        return {
          ...profile,
          email: user?.email,
          photoUrl,
        };
      })
    );
  },
});

export const updateRole = mutation({
  args: {
    profileId: v.id("profiles"),
    role: v.union(
      v.literal("board_member"),
      v.literal("committee_member"),
      v.literal("alumni")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!callerProfile || callerProfile.role !== "board_member") {
      throw new Error("Only board members can update roles");
    }

    await ctx.db.patch(args.profileId, { role: args.role });
  },
});

export const updateSpecialRole = mutation({
  args: {
    profileId: v.id("profiles"),
    specialRole: v.union(
      v.literal("admin"),
      v.literal("attendance_tracker"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // Only actual board members can assign special roles (prevents privilege escalation)
    if (!callerProfile || callerProfile.role !== "board_member") {
      throw new Error("Only board members can assign special roles");
    }

    await ctx.db.patch(args.profileId, {
      specialRole: args.specialRole === "none" ? undefined : args.specialRole,
    });
  },
});

// One-time migration: set status on existing profiles
export const migrateProfileStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profiles = await ctx.db.query("profiles").collect();
    let migrated = 0;

    for (const profile of profiles) {
      if (!(profile as any).status) {
        await ctx.db.patch(profile._id, { status: "approved" as const });
        migrated++;
      }
    }

    return { migrated };
  },
});

// One-time migration: rename old roles to new ones
export const migrateRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profiles = await ctx.db.query("profiles").collect();
    let migrated = 0;

    for (const profile of profiles) {
      const role = profile.role as string;
      if (role === "admin") {
        await ctx.db.patch(profile._id, {
          role: "board_member" as "board_member",
        });
        migrated++;
      } else if (role === "member") {
        await ctx.db.patch(profile._id, {
          role: "committee_member" as "committee_member",
        });
        migrated++;
      }
    }

    return { migrated };
  },
});

export const generateIcalToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    if (profile.icalToken) {
      return profile.icalToken;
    }

    const token = crypto.randomUUID();
    await ctx.db.patch(profile._id, { icalToken: token });
    return token;
  },
});

// Only return approved profiles (for the Members directory)
export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const photoUrl = profile.photoStorageId
          ? await ctx.storage.getUrl(profile.photoStorageId)
          : null;
        return {
          ...profile,
          email: user?.email,
          photoUrl,
        };
      })
    );
  },
});
