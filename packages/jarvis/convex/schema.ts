import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const lightState = v.object({
  power: v.boolean(),
  brightness: v.number(),
  kelvin: v.number(),
  color: v.string(),
  mode: v.union(v.literal("white"), v.literal("color")),
  flowing: v.boolean(),
  offInMinutes: v.number(),
});
export const fanState = v.object({
  power: v.boolean(),
  speed: v.number(),
  mode: v.union(v.literal("straight"), v.literal("natural")),
  oscillating: v.boolean(),
  angle: v.number(),
  offInMinutes: v.number(),
  indicator: v.boolean(),
  sound: v.boolean(),
  childLock: v.boolean(),
});
export const deviceState = v.union(lightState, fanState);
export const sceneFields = {
  name: v.string(),
  description: v.string(),
  mode: v.union(v.literal("white"), v.literal("color")),
  kelvin: v.number(),
  color: v.string(),
  brightness: v.number(),
};
export const fanMotion = v.object({
  token: v.string(),
  kind: v.union(v.literal("home"), v.literal("aim"), v.literal("seek"), v.literal("probe")),
  direction: v.union(v.literal("left"), v.literal("right")),
  target: v.number(),
  steps: v.number(),
  completed: v.number(),
  inFlight: v.boolean(),
  stopping: v.boolean(),
  expiresAt: v.number(),
  notBefore: v.optional(v.number()),
});
export const fanSetup = v.object({
  side: v.union(v.literal("left"), v.literal("right")),
  stage: v.union(v.literal("sweeping"), v.literal("checking"), v.literal("confirm")),
  round: v.number(),
  attempts: v.number(),
  settleMs: v.number(),
});
export default defineSchema({
  fanDirections: defineTable({
    deviceId: v.id("devices"),
    travelSteps: v.number(),
    position: v.union(v.number(), v.null()),
    motion: v.optional(fanMotion),
    error: v.optional(v.string()),
    setup: v.optional(fanSetup),
    homingSteps: v.optional(v.number()),
    settleMs: v.optional(v.number()),
    measurement: v.optional(v.literal("observed")),
  }).index("by_deviceId", ["deviceId"]),
  integrations: defineTable({
    provider: v.literal("xiaomi"),
    encryptedSession: v.string(),
    connectedAt: v.number(),
    region: v.string(),
  }).index("by_provider", ["provider"]),
  logins: defineTable({
    key: v.string(),
    encryptedSession: v.string(),
    expires: v.number(),
  }).index("by_key", ["key"]),
  devices: defineTable({
    externalId: v.string(),
    name: v.string(),
    room: v.string(),
    kind: v.union(v.literal("light"), v.literal("fan")),
    hidden: v.optional(v.boolean()),
    provider: v.literal("xiaomi"),
    model: v.string(),
    online: v.boolean(),
    capabilities: v.array(v.string()),
    state: deviceState,
    updatedAt: v.number(),
    error: v.optional(v.string()),
  }).index("by_external", ["provider", "externalId"]),
  scenes: defineTable(sceneFields),
  activity: defineTable({
    deviceName: v.string(),
    label: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
    createdAt: v.number(),
  }),
  limits: defineTable({
    key: v.string(),
    expires: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
  leases: defineTable({
    key: v.string(),
    token: v.string(),
    expires: v.number(),
  }).index("by_key", ["key"]),
});
