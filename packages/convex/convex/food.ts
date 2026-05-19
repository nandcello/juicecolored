import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";

export const createPendingUpload = internalMutation({
  args: {},
  returns: v.id("food"),
  handler: async (ctx) => {
    return await ctx.db.insert("food", {
      imageUrl: "",
      imageProviderID: "",
    });
  },
});

export const completeUpload = internalMutation({
  args: {
    foodId: v.id("food"),
    imageUrl: v.string(),
    imageProviderID: v.string(),
  },
  returns: v.id("food"),
  handler: async (ctx, args) => {
    const imageUrl = args.imageUrl.trim();
    const imageProviderID = args.imageProviderID.trim();

    if (!imageUrl) {
      throw new Error("Image URL is required.");
    }

    if (!imageProviderID) {
      throw new Error("Image provider ID is required.");
    }

    await ctx.db.patch(args.foodId, {
      imageUrl,
      imageProviderID,
    });

    return args.foodId;
  },
});

export const deletePendingUpload = internalMutation({
  args: {
    foodId: v.id("food"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.foodId);
    return null;
  },
});

export const createFromUpload = internalMutation({
  args: {
    imageUrl: v.string(),
    imageProviderID: v.string(),
  },
  returns: v.id("food"),
  handler: async (ctx, args) => {
    const imageUrl = args.imageUrl.trim();
    const imageProviderID = args.imageProviderID.trim();

    if (!imageUrl) {
      throw new Error("Image URL is required.");
    }

    if (!imageProviderID) {
      throw new Error("Image provider ID is required.");
    }

    return await ctx.db.insert("food", {
      imageUrl,
      imageProviderID,
    });
  },
});

export const get = query({
  args: {
    id: v.id("food"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("food"),
      _creationTime: v.number(),
      imageUrl: v.string(),
      restaurant: v.optional(v.id("restaurantReviews")),
      imageProviderID: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const connectRestaurant = mutation({
  args: {
    foodId: v.id("food"),
    restaurantId: v.optional(v.id("restaurantReviews")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const food = await ctx.db.get(args.foodId);
    if (!food) {
      throw new Error("Food record not found.");
    }
    if (args.restaurantId !== undefined) {
      const restaurant = await ctx.db.get(args.restaurantId);
      if (!restaurant) {
        throw new Error("Restaurant review not found.");
      }
      await ctx.db.patch(args.foodId, {
        restaurant: args.restaurantId,
      });
    } else {
      await ctx.db.patch(args.foodId, {
        restaurant: undefined,
      });
    }
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("food"),
      _creationTime: v.number(),
      imageUrl: v.string(),
      restaurant: v.optional(v.id("restaurantReviews")),
      imageProviderID: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("food").order("desc").take(100);
  },
});
