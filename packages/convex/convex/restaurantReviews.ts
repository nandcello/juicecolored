import { v } from "convex/values";

import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    restaurantName: v.string(),
    review: v.union(
      v.literal("actively avoid"),
      v.literal("can visit again"),
      v.literal("will visit again"),
      v.literal("recommend"),
    ),
  },
  returns: v.id("restaurantReviews"),
  handler: async (ctx, args) => {
    const restaurantName = args.restaurantName.trim();

    if (!restaurantName) {
      throw new Error("Restaurant name is required.");
    }

    return await ctx.db.insert("restaurantReviews", {
      restaurantName,
      review: args.review,
    });
  },
});
