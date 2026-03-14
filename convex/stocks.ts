import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hasAdminAccess } from "./lib/permissions";

// Upsert: ensure a stock record exists for the given ticker, return its _id
export const getOrCreateByTicker = mutation({
  args: {
    ticker: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const normalizedTicker = args.ticker.trim().toUpperCase();
    if (!normalizedTicker) throw new Error("Ticker is required");

    const existing = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("stocks", {
      ticker: normalizedTicker,
      name: args.name.trim(),
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

// Look up stock by ticker with full thesis enrichment
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .unique();

    if (!stock) return null;

    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_stock", (q) => q.eq("stockId", stock._id))
      .collect();

    const enrichedTheses = await Promise.all(
      theses.map(async (thesis) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", thesis.userId))
          .unique();
        return {
          ...thesis,
          authorName: profile?.displayName ?? "Unknown",
        };
      })
    );

    enrichedTheses.sort((a, b) => b.updatedAt - a.updatedAt);

    const ratings = theses.map((t) => t.rating);
    const averageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
          ) / 10
        : null;

    const bullishCount = theses.filter((t) => t.sentiment === "bullish").length;
    const bearishCount = theses.filter((t) => t.sentiment === "bearish").length;
    const neutralCount = theses.filter((t) => t.sentiment === "neutral").length;

    const priceTargets = theses
      .filter((t) => t.priceTarget !== undefined)
      .map((t) => t.priceTarget!);
    const avgPriceTarget =
      priceTargets.length > 0
        ? Math.round(
            (priceTargets.reduce((a, b) => a + b, 0) / priceTargets.length) *
              100
          ) / 100
        : null;

    // Detect current user's thesis
    const myThesis = theses.find((t) => t.userId === userId);

    return {
      ...stock,
      theses: enrichedTheses,
      averageRating,
      thesisCount: theses.length,
      bullishCount,
      bearishCount,
      neutralCount,
      avgPriceTarget,
      myThesisId: myThesis?._id ?? null,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const stocks = await ctx.db.query("stocks").collect();

    return await Promise.all(
      stocks.map(async (stock) => {
        const theses = await ctx.db
          .query("stockTheses")
          .withIndex("by_stock", (q) => q.eq("stockId", stock._id))
          .collect();

        const ratings = theses.map((t) => t.rating);
        const averageRating =
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
              ) / 10
            : null;

        const latestThesisAt =
          theses.length > 0
            ? Math.max(...theses.map((t) => t.updatedAt))
            : null;

        return {
          ...stock,
          averageRating,
          thesisCount: theses.length,
          latestThesisAt,
        };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const stock = await ctx.db.get(args.id);
    if (!stock) return null;

    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_stock", (q) => q.eq("stockId", args.id))
      .collect();

    // Enrich theses with author names
    const enrichedTheses = await Promise.all(
      theses.map(async (thesis) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", thesis.userId))
          .unique();
        return {
          ...thesis,
          authorName: profile?.displayName ?? "Unknown",
        };
      })
    );

    // Sort by most recent first
    enrichedTheses.sort((a, b) => b.updatedAt - a.updatedAt);

    // Compute aggregates
    const ratings = theses.map((t) => t.rating);
    const averageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
          ) / 10
        : null;

    const bullishCount = theses.filter((t) => t.sentiment === "bullish").length;
    const bearishCount = theses.filter((t) => t.sentiment === "bearish").length;
    const neutralCount = theses.filter((t) => t.sentiment === "neutral").length;

    const priceTargets = theses
      .filter((t) => t.priceTarget !== undefined)
      .map((t) => t.priceTarget!);
    const avgPriceTarget =
      priceTargets.length > 0
        ? Math.round(
            (priceTargets.reduce((a, b) => a + b, 0) / priceTargets.length) *
              100
          ) / 100
        : null;

    return {
      ...stock,
      theses: enrichedTheses,
      averageRating,
      thesisCount: theses.length,
      bullishCount,
      bearishCount,
      neutralCount,
      avgPriceTarget,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("stocks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || !hasAdminAccess(profile)) {
      throw new Error("Only admins can delete stocks");
    }

    // Cascade delete theses
    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_stock", (q) => q.eq("stockId", args.id))
      .collect();
    for (const thesis of theses) {
      await ctx.db.delete(thesis._id);
    }

    await ctx.db.delete(args.id);
  },
});
