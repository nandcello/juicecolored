import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { FAN_LEASE_MS } from "../fan-direction";

export async function leaseFor(ctx: MutationCtx) {
  return ctx.db
    .query("leases")
    .withIndex("by_key", (q) => q.eq("key", "xiaomi-owner"))
    .unique();
}

export async function finish(ctx: MutationCtx, row: Doc<"fanDirections">, error?: string) {
  const motion = row.motion;
  if (!motion) return;
  await ctx.db.patch(row._id, {
    motion: undefined,
    setup: undefined,
    position: error ? null : motion.target,
    error,
  });
  const lease = await leaseFor(ctx);
  if (lease?.token === motion.token) await ctx.db.delete(lease._id);
  const device = await ctx.db.get(row.deviceId);
  if (device) {
    await ctx.db.insert("activity", {
      deviceName: device.name,
      label: error ?? (motion.kind === "aim" ? "Fan aimed" : "Fan direction calibrated"),
      status: error ? "error" : "success",
      createdAt: Date.now(),
    });
    for (const event of (await ctx.db.query("activity").order("desc").take(101)).slice(100))
      await ctx.db.delete(event._id);
  }
}

export async function continueMotion(ctx: MutationCtx, row: Doc<"fanDirections">, delay = 0) {
  const motion = row.motion!;
  const expiresAt = Date.now() + FAN_LEASE_MS;
  const lease = await leaseFor(ctx);
  if (!lease || lease.token !== motion.token || lease.expires <= Date.now()) {
    await finish(ctx, row, "Movement expired. Start calibration again.");
    return;
  }
  await ctx.db.patch(row._id, {
    setup: row.setup,
    motion: { ...motion, expiresAt, notBefore: Date.now() + delay },
  });
  await ctx.db.patch(lease._id, { expires: expiresAt });
  if (row.setup?.stage !== "confirm") {
    await ctx.scheduler.runAfter(delay, internal.fanMotionActions.step, {
      deviceId: row.deviceId,
      token: motion.token,
      step: motion.completed,
    });
  }
}
