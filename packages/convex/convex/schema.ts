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
});
