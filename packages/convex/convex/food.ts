import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

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
