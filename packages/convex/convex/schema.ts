import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { canceldtTables } from "../../canceldt/convex/schema";

export default defineSchema({
  ...canceldtTables,
  listeningStatus: defineTable({
    source: v.literal("spotify"),
    trackName: v.string(),
    spotifyUrl: v.optional(v.string()),
    isPlaying: v.boolean(),
    playedAt: v.number(),
    updatedAt: v.number(),
    lastPollError: v.optional(v.string()),
    lastPollErrorAt: v.optional(v.number()),
    nextPollAt: v.optional(v.number()),
    backoffLevel: v.optional(v.number()),
  }).index("by_source", ["source"]),
  restaurantReviews: defineTable({
    clientId: v.optional(v.string()),
    clientRevision: v.optional(v.number()),
    clientCreatedAt: v.optional(v.number()),
    serverUpdatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    restaurantName: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    review: v.union(
      v.literal("actively avoid"),
      v.literal("can visit again"),
      v.literal("will visit again"),
      v.literal("recommend"),
    ),
  })
    .index("by_clientId", ["clientId"])
    .index("by_deletedAt", ["deletedAt"]),
  food: defineTable({
    clientId: v.optional(v.string()),
    clientRevision: v.optional(v.number()),
    clientCreatedAt: v.optional(v.number()),
    serverUpdatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    imageUrl: v.string(),
    restaurant: v.optional(v.id("restaurantReviews")),
    imageProviderID: v.string(),
    uploadStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    uploadStorageId: v.optional(v.id("_storage")),
    uploadContentType: v.optional(v.string()),
    uploadAttempt: v.optional(v.number()),
    uploadError: v.optional(v.string()),
  })
    .index("by_clientId", ["clientId"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_uploadStatus", ["uploadStatus"]),
});
