import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

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
