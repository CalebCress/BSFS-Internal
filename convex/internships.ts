import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess } from "./permissions";
import type { Doc, Id } from "./_generated/dataModel";

const STATUS_VALIDATOR = v.union(
  v.literal("not_started"),
  v.literal("applied"),
  v.literal("online_assessment"),
  v.literal("hirevue"),
  v.literal("technical_interview"),
  v.literal("assessment_centre"),
  v.literal("final"),
  v.literal("offer"),
  v.literal("rejected"),
  v.literal("withdrew"),
);

const PROGRAMME_TYPE_VALIDATOR = v.union(
  v.literal("summer-internships"),
  v.literal("spring-weeks"),
);

// Before May we look for the current year's season; from May onward we look one year ahead.
export function currentTrackrSeason(now: Date = new Date()): string {
  const month = now.getUTCMonth(); // 0 = Jan, 4 = May
  const year = now.getUTCFullYear();
  return month >= 4 ? String(year + 1) : String(year);
}

async function getProfile(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
}

export const list = query({
  args: {
    season: v.optional(v.string()),
    programmeType: v.optional(PROGRAMME_TYPE_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const season = args.season ?? currentTrackrSeason();
    const programmeType = args.programmeType ?? "summer-internships";

    const programmes = await ctx.db
      .query("internshipProgrammes")
      .withIndex("by_season", (q) => q.eq("season", season))
      .collect();

    // Pre-existing user-added rows may have type "summer-internships" set
    // explicitly; treat anything missing/unknown as summer for back-compat.
    const filtered = programmes.filter((p) => {
      const t = p.type ?? "summer-internships";
      return t === programmeType;
    });

    const myProgress = await ctx.db
      .query("internshipProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const progressByProgramme = new Map<string, Doc<"internshipProgress">>();
    for (const p of myProgress) {
      progressByProgramme.set(p.programmeId, p);
    }

    return filtered.map((p) => {
      const prog = progressByProgramme.get(p._id);
      return {
        ...p,
        myStatus: prog?.status ?? "not_started",
        myNotes: prog?.notes ?? null,
      };
    });
  },
});

export const setProgress = mutation({
  args: {
    programmeId: v.id("internshipProgrammes"),
    status: STATUS_VALIDATOR,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("Internship not found");

    const existing = await ctx.db
      .query("internshipProgress")
      .withIndex("by_user_programme", (q) =>
        q.eq("userId", userId).eq("programmeId", args.programmeId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        notes: args.notes,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("internshipProgress", {
      userId,
      programmeId: args.programmeId,
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

export const addUserInternship = mutation({
  args: {
    name: v.string(),
    companyName: v.string(),
    url: v.string(),
    season: v.optional(v.string()),
    programmeType: v.optional(PROGRAMME_TYPE_VALIDATOR),
    categories: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    closingDate: v.optional(v.number()),
    openingDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim();
    const companyName = args.companyName.trim();
    const url = args.url.trim();
    if (!name) throw new Error("Role name is required");
    if (!companyName) throw new Error("Company name is required");
    if (!url) throw new Error("Application URL is required");

    return await ctx.db.insert("internshipProgrammes", {
      source: "user",
      addedBy: userId,
      name,
      companyName,
      url,
      season: args.season ?? currentTrackrSeason(),
      categories: args.categories ?? [],
      locations: args.locations ?? [],
      closingDate: args.closingDate,
      openingDate: args.openingDate,
      notes: args.notes?.trim() || undefined,
      region: "UK",
      industry: "Finance",
      type: args.programmeType ?? "summer-internships",
    });
  },
});

export const updateUserInternship = mutation({
  args: {
    programmeId: v.id("internshipProgrammes"),
    name: v.string(),
    companyName: v.string(),
    url: v.string(),
    season: v.optional(v.string()),
    programmeType: v.optional(PROGRAMME_TYPE_VALIDATOR),
    categories: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    closingDate: v.optional(v.number()),
    openingDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("Internship not found");
    if (programme.source !== "user") {
      throw new Error("Only user-added internships can be edited");
    }

    const profile = await getProfile(ctx, userId);
    const isAdmin = profile && hasAdminAccess(profile);
    if (programme.addedBy !== userId && !isAdmin) {
      throw new Error("Only the author or an admin can edit this internship");
    }

    await ctx.db.patch(args.programmeId, {
      name: args.name.trim(),
      companyName: args.companyName.trim(),
      url: args.url.trim(),
      season: args.season ?? programme.season,
      type: args.programmeType ?? programme.type,
      categories: args.categories ?? programme.categories,
      locations: args.locations ?? programme.locations,
      closingDate: args.closingDate,
      openingDate: args.openingDate,
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const deleteUserInternship = mutation({
  args: { programmeId: v.id("internshipProgrammes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("Internship not found");
    if (programme.source !== "user") {
      throw new Error("Only user-added internships can be deleted");
    }

    const profile = await getProfile(ctx, userId);
    const isAdmin = profile && hasAdminAccess(profile);
    if (programme.addedBy !== userId && !isAdmin) {
      throw new Error("Only the author or an admin can delete this internship");
    }

    // Cascade delete progress records
    const progress = await ctx.db
      .query("internshipProgress")
      .withIndex("by_programme", (q) => q.eq("programmeId", args.programmeId))
      .collect();
    for (const p of progress) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.programmeId);
  },
});

// Internal: called by the trackr sync action
export const upsertTrackrProgrammes = internalMutation({
  args: {
    season: v.string(),
    programmeType: v.union(
      v.literal("summer-internships"),
      v.literal("spring-weeks"),
    ),
    programmes: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        companyName: v.string(),
        companyId: v.optional(v.string()),
        companyDescription: v.optional(v.string()),
        url: v.optional(v.string()),
        region: v.optional(v.string()),
        industry: v.optional(v.string()),
        type: v.optional(v.string()),
        categories: v.array(v.string()),
        locations: v.array(v.string()),
        process: v.optional(v.string()),
        openingDate: v.optional(v.number()),
        closingDate: v.optional(v.number()),
        currentStage: v.optional(v.string()),
        rolling: v.optional(v.boolean()),
        requiresCv: v.optional(v.boolean()),
        coverLetter: v.optional(v.string()),
        writtenAnswers: v.optional(v.string()),
        sponsorsVisa: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const seenExternalIds = new Set<string>();

    for (const p of args.programmes) {
      seenExternalIds.add(p.externalId);
      const existing = await ctx.db
        .query("internshipProgrammes")
        .withIndex("by_externalId", (q) => q.eq("externalId", p.externalId))
        .unique();

      const fields = {
        source: "trackr" as const,
        externalId: p.externalId,
        name: p.name,
        companyName: p.companyName,
        companyId: p.companyId,
        companyDescription: p.companyDescription,
        url: p.url,
        region: p.region,
        industry: p.industry,
        season: args.season,
        type: args.programmeType,
        categories: p.categories,
        locations: p.locations,
        process: p.process,
        openingDate: p.openingDate,
        closingDate: p.closingDate,
        currentStage: p.currentStage,
        rolling: p.rolling,
        requiresCv: p.requiresCv,
        coverLetter: p.coverLetter,
        writtenAnswers: p.writtenAnswers,
        sponsorsVisa: p.sponsorsVisa,
        lastSyncedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert("internshipProgrammes", fields);
      }
    }

    // Sweep: remove trackr programmes for this (season + type) that no longer
    // appear in the API. Scope by type so syncing spring-weeks doesn't wipe
    // summer-internships.
    const seasonProgrammes = await ctx.db
      .query("internshipProgrammes")
      .withIndex("by_season", (q) => q.eq("season", args.season))
      .collect();
    for (const existing of seasonProgrammes) {
      if (
        existing.source === "trackr" &&
        existing.type === args.programmeType &&
        existing.externalId &&
        !seenExternalIds.has(existing.externalId)
      ) {
        const progress = await ctx.db
          .query("internshipProgress")
          .withIndex("by_programme", (q) => q.eq("programmeId", existing._id))
          .collect();
        for (const pr of progress) {
          await ctx.db.delete(pr._id);
        }
        await ctx.db.delete(existing._id);
      }
    }

    return { upserted: args.programmes.length };
  },
});
