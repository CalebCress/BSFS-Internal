import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sentimentValidator = v.union(
  v.literal("bullish"),
  v.literal("bearish"),
  v.literal("neutral")
);

// Upsert: one thesis per user per stock
export const submit = mutation({
  args: {
    stockId: v.id("stocks"),
    rating: v.number(),
    thesis: v.string(),
    sentiment: sentimentValidator,
    priceTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (
      !Number.isInteger(args.rating) ||
      args.rating < 1 ||
      args.rating > 5
    ) {
      throw new Error("Rating must be a whole number between 1 and 5");
    }

    if (!args.thesis.trim()) {
      throw new Error("Thesis text is required");
    }

    // Check stock exists
    const stock = await ctx.db.get(args.stockId);
    if (!stock) throw new Error("Stock not found");

    // Check for existing thesis by this user for this stock
    const existingTheses = await ctx.db
      .query("stockTheses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const myExisting = existingTheses.find(
      (t) => t.stockId === args.stockId
    );

    const now = Date.now();

    if (myExisting) {
      await ctx.db.patch(myExisting._id, {
        rating: args.rating,
        thesis: args.thesis.trim(),
        sentiment: args.sentiment,
        priceTarget: args.priceTarget,
        updatedAt: now,
      });
      return myExisting._id;
    }

    return await ctx.db.insert("stockTheses", {
      stockId: args.stockId,
      userId,
      rating: args.rating,
      thesis: args.thesis.trim(),
      sentiment: args.sentiment,
      priceTarget: args.priceTarget,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Current user's theses with stock data
export const listMyTheses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const withStocks = await Promise.all(
      theses.map(async (thesis) => {
        const stock = await ctx.db.get(thesis.stockId);
        return {
          ...thesis,
          stock: stock
            ? { ticker: stock.ticker, name: stock.name, sector: stock.sector }
            : null,
        };
      })
    );

    // Sort by most recently updated
    return withStocks.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Delete own thesis
export const remove = mutation({
  args: { thesisId: v.id("stockTheses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thesis = await ctx.db.get(args.thesisId);
    if (!thesis) throw new Error("Thesis not found");

    if (thesis.userId !== userId) {
      throw new Error("You can only delete your own theses");
    }

    await ctx.db.delete(args.thesisId);
  },
});
