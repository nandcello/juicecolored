import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
export const reserve = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const row = await ctx.db
      .query("canceldtLimits")
      .withIndex("by_key", (q) => q.eq("key", "admin-login"))
      .unique();
    if (row && row.resetAt > now && row.count >= 10)
      throw new ConvexError("Too many sign-in attempts. Try again in five minutes.");
    const next = {
      count: row && row.resetAt > now ? row.count + 1 : 1,
      resetAt: row && row.resetAt > now ? row.resetAt : now + 300000,
    };
    if (row) await ctx.db.patch("canceldtLimits", row._id, next);
    else await ctx.db.insert("canceldtLimits", { key: "admin-login", ...next });
    return null;
  },
});
