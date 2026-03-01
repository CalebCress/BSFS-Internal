import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getThesesByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return [];

    const theses = await ctx.db
      .query("stockTheses")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const withStocks = await Promise.all(
      theses.map(async (thesis) => {
        const stock = await ctx.db.get(thesis.stockId);
        return {
          ...thesis,
          stock: stock
            ? { ticker: stock.ticker, name: stock.name }
            : null,
        };
      })
    );

    return withStocks.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
