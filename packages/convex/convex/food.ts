import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

const uploadStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed"),
);

const foodValidator = v.object({
  _id: v.id("food"),
  _creationTime: v.number(),
  imageUrl: v.string(),
  restaurant: v.optional(v.id("restaurantReviews")),
  imageProviderID: v.string(),
});

const syncFoodValidator = v.object({
  ...foodValidator.fields,
  clientId: v.string(),
  clientRevision: v.number(),
  clientCreatedAt: v.number(),
  serverUpdatedAt: v.number(),
  deletedAt: v.optional(v.number()),
  uploadStatus: uploadStatusValidator,
  uploadError: v.optional(v.string()),
});

export const createPendingUpload = internalMutation({
  args: {
    clientId: v.string(),
    clientRevision: v.number(),
    clientCreatedAt: v.number(),
    storageId: v.id("_storage"),
    contentType: v.string(),
  },
  returns: v.object({
    foodId: v.id("food"),
    status: uploadStatusValidator,
  }),
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim();
    if (!clientId) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Client ID is required.");
    }

    const existing = await ctx.db
      .query("food")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    if (existing?.imageUrl) {
      await ctx.storage.delete(args.storageId);
      return { foodId: existing._id, status: "complete" as const };
    }

    if (
      existing &&
      (existing.uploadStatus === "pending" || existing.uploadStatus === "processing")
    ) {
      await ctx.storage.delete(args.storageId);
      return { foodId: existing._id, status: existing.uploadStatus };
    }

    const now = Date.now();
    let foodId: Id<"food">;
    if (existing) {
      if (existing.uploadStorageId) {
        await ctx.storage.delete(existing.uploadStorageId);
      }
      await ctx.db.patch(existing._id, {
        clientRevision: Math.max(existing.clientRevision ?? 0, args.clientRevision),
        clientCreatedAt: existing.clientCreatedAt ?? args.clientCreatedAt,
        serverUpdatedAt: now,
        uploadStatus: "pending",
        uploadStorageId: args.storageId,
        uploadContentType: args.contentType,
        uploadAttempt: 0,
        uploadError: undefined,
      });
      foodId = existing._id;
    } else {
      foodId = await ctx.db.insert("food", {
        clientId,
        clientRevision: args.clientRevision,
        clientCreatedAt: args.clientCreatedAt,
        serverUpdatedAt: now,
        imageUrl: "",
        imageProviderID: "",
        uploadStatus: "pending",
        uploadStorageId: args.storageId,
        uploadContentType: args.contentType,
        uploadAttempt: 0,
      });
    }

    await ctx.scheduler.runAfter(0, internal.uploadthing.processQueuedFoodUpload, {
      foodId,
      attempt: 0,
    });
    return { foodId, status: "pending" as const };
  },
});

export const claimPendingUpload = internalMutation({
  args: { foodId: v.id("food"), attempt: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      storageId: v.id("_storage"),
      contentType: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const food = await ctx.db.get(args.foodId);
    if (!food || food.imageUrl || !food.uploadStorageId) {
      return null;
    }

    await ctx.db.patch(args.foodId, {
      uploadStatus: "processing",
      uploadAttempt: args.attempt,
      uploadError: undefined,
      serverUpdatedAt: Date.now(),
    });
    return {
      storageId: food.uploadStorageId,
      contentType: food.uploadContentType ?? "image/png",
    };
  },
});

export const recordUploadFailure = internalMutation({
  args: {
    foodId: v.id("food"),
    attempt: v.number(),
    error: v.string(),
    final: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const food = await ctx.db.get(args.foodId);
    if (!food || food.imageUrl) {
      return null;
    }
    await ctx.db.patch(args.foodId, {
      uploadStatus: args.final ? "failed" : "pending",
      uploadAttempt: args.attempt,
      uploadError: args.error.slice(0, 500),
      serverUpdatedAt: Date.now(),
    });
    return null;
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
    if (!imageUrl || !imageProviderID) {
      throw new Error("Completed uploads require an image URL and provider ID.");
    }

    await ctx.db.patch(args.foodId, {
      imageUrl,
      imageProviderID,
      uploadStatus: "complete",
      uploadStorageId: undefined,
      uploadContentType: undefined,
      uploadError: undefined,
      serverUpdatedAt: Date.now(),
    });
    return args.foodId;
  },
});

export const get = query({
  args: { id: v.id("food") },
  returns: v.union(v.null(), foodValidator),
  handler: async (ctx, args) => {
    const food = await ctx.db.get(args.id);
    if (!food || food.deletedAt !== undefined) return null;
    return {
      _id: food._id,
      _creationTime: food._creationTime,
      imageUrl: food.imageUrl,
      ...(food.restaurant === undefined ? {} : { restaurant: food.restaurant }),
      imageProviderID: food.imageProviderID,
    };
  },
});

export const syncConnectRestaurant = mutation({
  args: {
    clientId: v.string(),
    clientRevision: v.number(),
    legacyId: v.optional(v.id("food")),
    restaurantClientId: v.optional(v.string()),
    restaurantLegacyId: v.optional(v.id("restaurantReviews")),
  },
  returns: v.object({ id: v.id("food"), clientRevision: v.number() }),
  handler: async (ctx, args) => {
    const byClientId = await ctx.db
      .query("food")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const food = byClientId ?? (args.legacyId ? await ctx.db.get(args.legacyId) : null);
    if (!food || food.deletedAt !== undefined) {
      throw new Error("Food record is not ready yet.");
    }
    if ((food.clientRevision ?? 0) > args.clientRevision) {
      return { id: food._id, clientRevision: food.clientRevision ?? 0 };
    }

    let restaurantId: Id<"restaurantReviews"> | undefined;
    if (args.restaurantClientId) {
      const restaurantByClientId = await ctx.db
        .query("restaurantReviews")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.restaurantClientId))
        .unique();
      const restaurant =
        restaurantByClientId ??
        (args.restaurantLegacyId ? await ctx.db.get(args.restaurantLegacyId) : null);
      if (!restaurant || restaurant.deletedAt !== undefined) {
        throw new Error("Restaurant review is not ready yet.");
      }
      restaurantId = restaurant._id;
    }

    await ctx.db.patch(food._id, {
      clientId: food.clientId ?? args.clientId,
      clientRevision: args.clientRevision,
      restaurant: restaurantId,
      serverUpdatedAt: Date.now(),
    });
    return { id: food._id, clientRevision: args.clientRevision };
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
      if (!restaurant || restaurant.deletedAt !== undefined) {
        throw new Error("Restaurant review not found.");
      }
    }
    await ctx.db.patch(args.foodId, {
      restaurant: args.restaurantId,
      clientRevision: (food.clientRevision ?? 0) + 1,
      serverUpdatedAt: Date.now(),
    });
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(foodValidator),
  handler: async (ctx) => {
    const items = await ctx.db
      .query("food")
      .withIndex("by_deletedAt", (q) => q.eq("deletedAt", undefined))
      .order("desc")
      .take(100);
    return items
      .filter((item) => item.imageUrl.length > 0)
      .map(({ _id, _creationTime, imageUrl, restaurant, imageProviderID }) => ({
        _id,
        _creationTime,
        imageUrl,
        ...(restaurant === undefined ? {} : { restaurant }),
        imageProviderID,
      }));
  },
});

export const syncPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(syncFoodValidator),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("food").order("desc").paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((item) => ({
        _id: item._id,
        _creationTime: item._creationTime,
        clientId: item.clientId ?? item._id,
        clientRevision: item.clientRevision ?? 0,
        clientCreatedAt: item.clientCreatedAt ?? item._creationTime,
        serverUpdatedAt: item.serverUpdatedAt ?? item._creationTime,
        ...(item.deletedAt === undefined ? {} : { deletedAt: item.deletedAt }),
        imageUrl: item.imageUrl,
        ...(item.restaurant === undefined ? {} : { restaurant: item.restaurant }),
        imageProviderID: item.imageProviderID,
        uploadStatus: item.uploadStatus ?? (item.imageUrl ? "complete" : "pending"),
        ...(item.uploadError === undefined ? {} : { uploadError: item.uploadError }),
      })),
    };
  },
});

const recentFoodItem = v.object({
  _id: v.id("food"),
  imageUrl: v.string(),
});

export const recent = query({
  args: {},
  returns: v.array(recentFoodItem),
  handler: async (ctx) => {
    const items = await ctx.db
      .query("food")
      .withIndex("by_deletedAt", (q) => q.eq("deletedAt", undefined))
      .order("desc")
      .take(30);
    return items
      .filter((item) => item.imageUrl.trim() !== "")
      .slice(0, 5)
      .map(({ _id, imageUrl }) => ({ _id, imageUrl }));
  },
});
