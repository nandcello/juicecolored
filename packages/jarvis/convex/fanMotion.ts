import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { FAN_LEASE_MS, validTravelSteps } from "../fan-direction";
import { directionFor, requireReadyFan } from "./fanDirectionStore";

const identity = { deviceId: v.id("devices"), token: v.string() };
const stepIdentity = { ...identity, step: v.number() };
const stopped = "Movement stopped. Calibrate again before aiming.";
const expired = "Movement could not be confirmed. Calibrate again before aiming.";

async function leaseFor(ctx: MutationCtx) {
  return ctx.db
    .query("leases")
    .withIndex("by_key", (q) => q.eq("key", "xiaomi-owner"))
    .unique();
}

async function finish(ctx: MutationCtx, row: Doc<"fanDirections">, error?: string) {
  const motion = row.motion;
  if (!motion) return;
  await ctx.db.patch(row._id, { motion: undefined, position: error ? null : motion.target, error });
  const lease = await leaseFor(ctx);
  if (lease?.token === motion.token) await ctx.db.delete(lease._id);
  const device = await ctx.db.get(row.deviceId);
  if (device) {
    await ctx.db.insert("activity", {
      deviceName: device.name,
      label: error ?? (motion.kind === "home" ? "Fan direction calibrated" : "Fan aimed"),
      status: error ? "error" : "success",
      createdAt: Date.now(),
    });
    for (const event of (await ctx.db.query("activity").order("desc").take(101)).slice(100))
      await ctx.db.delete(event._id);
  }
}

export const reference = internalMutation({
  args: { deviceId: v.id("devices"), travelSteps: v.number(), position: v.number() },
  returns: v.null(),
  handler: async (ctx, { deviceId, travelSteps, position }) => {
    requireReadyFan(await ctx.db.get(deviceId));
    if (!validTravelSteps(travelSteps) || (position !== 0 && position !== travelSteps))
      throw new ConvexError("Invalid fan travel measurement.");
    const row = await directionFor(ctx, deviceId);
    if (row?.motion) throw new ConvexError("Wait for the fan to stop first.");
    const data = { deviceId, travelSteps, position, error: undefined };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("fanDirections", data);
    return null;
  },
});

export const start = internalMutation({
  args: {
    ...identity,
    kind: v.union(v.literal("home"), v.literal("aim")),
    travelSteps: v.optional(v.number()),
    target: v.optional(v.number()),
  },
  returns: v.boolean(),
  handler: async (ctx, { deviceId, token, kind, travelSteps: saved, target: requested }) => {
    requireReadyFan(await ctx.db.get(deviceId));
    const row = await directionFor(ctx, deviceId);
    if (row?.motion) throw new ConvexError("Wait for the fan to stop first.");
    const travelSteps = row?.travelSteps ?? saved ?? 0;
    if (!validTravelSteps(travelSteps))
      throw new ConvexError("Measure the fan travel once before using auto-calibration.");
    const target = kind === "home" ? 0 : requested;
    if (target === undefined || !Number.isInteger(target) || target < 0 || target > travelSteps)
      throw new ConvexError("Invalid fan direction.");
    if (kind === "aim" && row?.position == null)
      throw new ConvexError("Calibrate the fan before aiming.");
    const startPosition = row?.position ?? 0;
    const steps = kind === "home" ? travelSteps : Math.abs(target - startPosition);
    if (!steps) return false;
    const lease = await leaseFor(ctx);
    if (lease?.token !== token || lease.expires <= Date.now())
      throw new ConvexError("Fan request expired. Try again.");
    const expiresAt = Date.now() + FAN_LEASE_MS;
    const motion = {
      token,
      kind,
      direction: (kind === "home" || target < startPosition ? "left" : "right") as "left" | "right",
      target,
      steps,
      completed: 0,
      inFlight: false,
      stopping: false,
      expiresAt,
    };
    const data = { deviceId, travelSteps, position: null, motion, error: undefined };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("fanDirections", data);
    await ctx.db.patch(lease._id, { expires: expiresAt });
    await ctx.scheduler.runAfter(0, internal.fanMotionActions.step, { deviceId, token, step: 0 });
    await ctx.scheduler.runAt(expiresAt, internal.fanMotion.watchdog, { deviceId, token });
    return true;
  },
});

export const claim = internalMutation({
  args: stepIdentity,
  returns: v.union(
    v.null(),
    v.object({
      externalId: v.string(),
      encryptedSession: v.string(),
      direction: v.union(v.literal("left"), v.literal("right")),
      last: v.boolean(),
    }),
  ),
  handler: async (ctx, { deviceId, token, step }) => {
    const row = await directionFor(ctx, deviceId),
      motion = row?.motion;
    if (!row || !motion || motion.token !== token || motion.completed !== step || motion.inFlight)
      return null;
    const lease = await leaseFor(ctx);
    if (
      motion.stopping ||
      motion.expiresAt <= Date.now() ||
      lease?.token !== token ||
      lease.expires <= Date.now()
    ) {
      await finish(ctx, row, motion.stopping ? stopped : expired);
      return null;
    }
    const device = requireReadyFan(await ctx.db.get(deviceId));
    const account = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (q) => q.eq("provider", "xiaomi"))
      .unique();
    if (!account) {
      await finish(ctx, row, "Connect Xiaomi Home before calibrating.");
      return null;
    }
    const expiresAt = Date.now() + FAN_LEASE_MS;
    await ctx.db.patch(row._id, { motion: { ...motion, inFlight: true, expiresAt } });
    await ctx.db.patch(lease._id, { expires: expiresAt });
    return {
      externalId: device.externalId,
      encryptedSession: account.encryptedSession,
      direction: motion.direction,
      last: step + 1 === motion.steps,
    };
  },
});

// Check again after a slow physical read, before issuing a non-idempotent nudge.
export const maySend = internalQuery({
  args: stepIdentity,
  returns: v.boolean(),
  handler: async (ctx, { deviceId, token, step }) => {
    const row = await directionFor(ctx, deviceId),
      motion = row?.motion;
    const lease = await ctx.db
      .query("leases")
      .withIndex("by_key", (q) => q.eq("key", "xiaomi-owner"))
      .unique();
    return !!(
      motion &&
      motion.token === token &&
      motion.completed === step &&
      motion.inFlight &&
      !motion.stopping &&
      motion.expiresAt > Date.now() &&
      lease?.token === token &&
      lease.expires > Date.now()
    );
  },
});

export const completeStep = internalMutation({
  args: { ...stepIdentity, error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { deviceId, token, step, error }) => {
    const row = await directionFor(ctx, deviceId),
      motion = row?.motion;
    if (!row || !motion || motion.token !== token || motion.completed !== step) return null;
    const lease = await leaseFor(ctx);
    if (
      error ||
      motion.stopping ||
      motion.expiresAt <= Date.now() ||
      lease?.token !== token ||
      lease.expires <= Date.now()
    ) {
      await finish(ctx, row, error ?? (motion.stopping ? stopped : expired));
    } else if (motion.inFlight) {
      const completed = step + 1;
      if (completed === motion.steps) await finish(ctx, row);
      else {
        await ctx.db.patch(row._id, { motion: { ...motion, completed, inFlight: false } });
        await ctx.scheduler.runAfter(0, internal.fanMotionActions.step, {
          deviceId,
          token,
          step: completed,
        });
      }
    }
    return null;
  },
});

export const stop = internalMutation({
  args: identity,
  returns: v.null(),
  handler: async (ctx, { deviceId, token }) => {
    const row = await directionFor(ctx, deviceId);
    if (row?.motion?.token === token) {
      if (row.motion.inFlight)
        await ctx.db.patch(row._id, { motion: { ...row.motion, stopping: true } });
      else await finish(ctx, row, stopped);
    }
    return null;
  },
});

export const watchdog = internalMutation({
  args: identity,
  returns: v.null(),
  handler: async (ctx, { deviceId, token }) => {
    const row = await directionFor(ctx, deviceId);
    if (row?.motion?.token === token) {
      if (row.motion.expiresAt <= Date.now()) await finish(ctx, row, expired);
      else
        await ctx.scheduler.runAt(row.motion.expiresAt, internal.fanMotion.watchdog, {
          deviceId,
          token,
        });
    }
    return null;
  },
});
