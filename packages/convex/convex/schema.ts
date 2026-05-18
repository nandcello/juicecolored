import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  }),
});
