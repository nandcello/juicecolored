import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { FanDirectionState } from "../fan-direction";
import type { FanState, LightState } from "../domain";

export function directionFor(ctx: QueryCtx, deviceId: Id<"devices">) {
  return ctx.db
    .query("fanDirections")
    .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
    .unique();
}

export function publicDirection(row: Doc<"fanDirections"> | null): FanDirectionState | undefined {
  if (!row) return undefined;
  const { travelSteps, position, error, motion } = row;
  return {
    travelSteps,
    position,
    ...(error ? { error } : {}),
    ...(motion
      ? {
          motion: {
            token: motion.token,
            kind: motion.kind,
            steps: motion.steps,
            completed: motion.completed,
            stopping: motion.stopping,
          },
        }
      : {}),
  };
}

export function requireReadyFan(device: Doc<"devices"> | null) {
  if (!device || device.kind !== "fan" || device.model !== "dmaker.fan.p18")
    throw new ConvexError("Choose a supported fan.");
  if (
    !device.online ||
    !device.updatedAt ||
    !("oscillating" in device.state) ||
    !device.state.power ||
    device.state.oscillating ||
    device.state.childLock
  )
    throw new ConvexError(
      "Turn on the fan and turn off oscillation and child lock before calibrating.",
    );
  return device;
}

export async function invalidateDirection(ctx: MutationCtx, deviceId: Id<"devices">) {
  const row = await directionFor(ctx, deviceId);
  if (row) await ctx.db.patch(row._id, { position: null });
}

export async function deleteDirection(ctx: MutationCtx, deviceId: Id<"devices">) {
  const row = await directionFor(ctx, deviceId);
  if (row) await ctx.db.delete(row._id);
}

export function directionChanged(
  previous: FanState | LightState,
  next: FanState | LightState | undefined,
  online: boolean,
) {
  if (!online) return true;
  if (!next || !("oscillating" in next) || !("oscillating" in previous)) return false;
  return (
    !next.power ||
    next.oscillating ||
    next.childLock ||
    previous.power !== next.power ||
    previous.oscillating !== next.oscillating ||
    previous.childLock !== next.childLock ||
    previous.angle !== next.angle
  );
}
