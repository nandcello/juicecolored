import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const reviewValidator = v.union(
  v.literal("actively avoid"),
  v.literal("can visit again"),
  v.literal("will visit again"),
  v.literal("recommend"),
);

const restaurantReviewValidator = v.object({
  _id: v.id("restaurantReviews"),
  _creationTime: v.number(),
  restaurantName: v.string(),
  address: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  review: reviewValidator,
});

const syncRestaurantReviewValidator = v.object({
  ...restaurantReviewValidator.fields,
  clientId: v.string(),
  clientRevision: v.number(),
  clientCreatedAt: v.number(),
  serverUpdatedAt: v.number(),
  deletedAt: v.optional(v.number()),
});

export const list = query({
  args: {},
  returns: v.array(restaurantReviewValidator),
  handler: async (ctx) => {
    const items = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_deletedAt", (q) => q.eq("deletedAt", undefined))
      .order("desc")
      .take(50);
    return items.map(({ _id, _creationTime, restaurantName, address, lat, lng, review }) => ({
      _id,
      _creationTime,
      restaurantName,
      ...(address === undefined ? {} : { address }),
      ...(lat === undefined ? {} : { lat }),
      ...(lng === undefined ? {} : { lng }),
      review,
    }));
  },
});

export const syncPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(syncRestaurantReviewValidator),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("restaurantReviews")
      .order("desc")
      .paginate(args.paginationOpts);

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
        restaurantName: item.restaurantName,
        ...(item.address === undefined ? {} : { address: item.address }),
        ...(item.lat === undefined ? {} : { lat: item.lat }),
        ...(item.lng === undefined ? {} : { lng: item.lng }),
        review: item.review,
      })),
    };
  },
});

export const create = mutation({
  args: {
    restaurantName: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    review: reviewValidator,
  },
  returns: v.id("restaurantReviews"),
  handler: async (ctx, args) => {
    const restaurantName = args.restaurantName.trim();
    const address = args.address?.trim();

    if (!restaurantName) {
      throw new Error("Restaurant name is required.");
    }

    const now = Date.now();
    return await ctx.db.insert("restaurantReviews", {
      restaurantName,
      ...(address ? { address } : {}),
      ...(args.lat !== undefined && args.lng !== undefined ? { lat: args.lat, lng: args.lng } : {}),
      review: args.review,
      serverUpdatedAt: now,
    });
  },
});

export const syncUpsert = mutation({
  args: {
    clientId: v.string(),
    clientRevision: v.number(),
    clientCreatedAt: v.number(),
    restaurantName: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    review: reviewValidator,
  },
  returns: v.object({
    id: v.id("restaurantReviews"),
    clientRevision: v.number(),
  }),
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim();
    const restaurantName = args.restaurantName.trim();
    const address = args.address?.trim();

    if (!clientId) {
      throw new Error("Client ID is required.");
    }
    if (!restaurantName) {
      throw new Error("Restaurant name is required.");
    }

    const existing = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    if (existing && (existing.clientRevision ?? 0) >= args.clientRevision) {
      return { id: existing._id, clientRevision: existing.clientRevision ?? 0 };
    }

    const nextValue = {
      clientId,
      clientRevision: args.clientRevision,
      clientCreatedAt: args.clientCreatedAt,
      serverUpdatedAt: Date.now(),
      deletedAt: undefined,
      restaurantName,
      address: address || undefined,
      lat: args.lat,
      lng: args.lng,
      review: args.review,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextValue);
      return { id: existing._id, clientRevision: args.clientRevision };
    }

    const id = await ctx.db.insert("restaurantReviews", nextValue);
    return { id, clientRevision: args.clientRevision };
  },
});

export const syncRemove = mutation({
  args: {
    clientId: v.string(),
    clientRevision: v.number(),
    legacyId: v.optional(v.id("restaurantReviews")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingByClientId = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const existing = existingByClientId ?? (args.legacyId ? await ctx.db.get(args.legacyId) : null);

    if (!existing || (existing.clientRevision ?? 0) > args.clientRevision) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      clientId: existing.clientId ?? args.clientId,
      clientRevision: args.clientRevision,
      serverUpdatedAt: Date.now(),
      deletedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("restaurantReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.patch(args.id, {
        clientRevision: (existing.clientRevision ?? 0) + 1,
        serverUpdatedAt: Date.now(),
        deletedAt: Date.now(),
      });
    }
    return null;
  },
});
