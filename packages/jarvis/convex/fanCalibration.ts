import { ConvexError, v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  FAN_END_CHECK_MS,
  FAN_LEASE_MS,
  FAN_SETTLE_MS,
  MAX_TRAVEL_STEPS,
  validTravelSteps,
} from "../fan-direction";
import { directionFor, requireReadyFan } from "./fanDirectionStore";
import { continueMotion, finish, leaseFor } from "./fanMotionState";

const identity = { deviceId: v.id("devices"), token: v.string() };
const observation = { ...identity, round: v.number() };
const limitError =
  "Calibration reached its movement limit. Check the fan and connection, then start again.";

export const start = internalMutation({
  args: identity,
  returns: v.null(),
  handler: async (ctx, { deviceId, token }) => {
    requireReadyFan(await ctx.db.get(deviceId));
    const row = await directionFor(ctx, deviceId);
    if (row?.motion) throw new ConvexError("Wait for the fan to stop first.");
    const lease = await leaseFor(ctx);
    if (lease?.token !== token || lease.expires <= Date.now())
      throw new ConvexError("Fan request expired.");
    const expiresAt = Date.now() + FAN_LEASE_MS;
    const data = {
      deviceId,
      travelSteps: row?.travelSteps ?? 0,
      position: null,
      error: undefined,
      setup: {
        side: "left" as const,
        stage: "sweeping" as const,
        round: 0,
        attempts: 0,
        settleMs: Math.max(row?.settleMs ?? 0, FAN_SETTLE_MS),
      },
      motion: {
        token,
        kind: "seek" as const,
        direction: "left" as const,
        target: 0,
        steps: MAX_TRAVEL_STEPS,
        completed: 0,
        inFlight: false,
        stopping: false,
        expiresAt,
      },
    };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("fanDirections", data);
    await ctx.db.patch(lease._id, { expires: expiresAt });
    await ctx.scheduler.runAfter(0, internal.fanMotionActions.step, { deviceId, token, step: 0 });
    await ctx.scheduler.runAt(expiresAt, internal.fanMotion.watchdog, { deviceId, token });
    return null;
  },
});

async function beginProbes(ctx: MutationCtx, row: Doc<"fanDirections">) {
  const motion = row.motion!;
  motion.kind = "probe";
  motion.steps = motion.completed + 2;
  motion.inFlight = false;
  await continueMotion(ctx, row, FAN_END_CHECK_MS);
}

export const checkEnd = internalMutation({
  args: observation,
  returns: v.null(),
  handler: async (ctx, { deviceId, token, round }) => {
    const row = await directionFor(ctx, deviceId);
    if (
      !row?.setup ||
      row.motion?.token !== token ||
      row.setup.round !== round ||
      row.setup.stage !== "sweeping"
    )
      return null;
    const lease = await leaseFor(ctx);
    if (lease?.token !== token || lease.expires <= Date.now())
      throw new ConvexError("Calibration expired. Start again.");
    row.setup.stage = "checking";
    if (row.motion.inFlight) await ctx.db.patch(row._id, { setup: row.setup });
    else await beginProbes(ctx, row);
    return null;
  },
});

// Called by the shared motion worker after a settled command, or after a check
// request cancelled a claimed command before it was sent. Never infer movement
// from an acknowledgement or infer an end stop from a command count.
export async function completeCalibrationStep(
  ctx: MutationCtx,
  row: Doc<"fanDirections">,
  sent: boolean,
) {
  const motion = row.motion!,
    setup = row.setup!;
  if (sent) motion.completed++;
  motion.inFlight = false;
  if (motion.kind === "seek") {
    if (sent) setup.attempts++;
    if (setup.stage === "checking") {
      await beginProbes(ctx, row);
      return;
    }
    if (setup.attempts >= MAX_TRAVEL_STEPS) {
      await finish(ctx, row, limitError);
      return;
    }
    await continueMotion(ctx, row);
  } else if (motion.completed === motion.steps) {
    setup.stage = "confirm";
    await continueMotion(ctx, row);
  } else {
    await continueMotion(ctx, row);
  }
}

export const observeEnd = internalMutation({
  args: { ...observation, moved: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { deviceId, token, round, moved }) => {
    const row = await directionFor(ctx, deviceId);
    if (
      !row?.setup ||
      row.motion?.token !== token ||
      row.setup.round !== round ||
      row.setup.stage !== "confirm"
    )
      return null;
    requireReadyFan(await ctx.db.get(deviceId));
    const lease = await leaseFor(ctx);
    if (lease?.token !== token || lease.expires <= Date.now())
      throw new ConvexError("Calibration expired. Start again.");
    const setup = row.setup,
      motion = row.motion;
    setup.round++;
    if (moved) {
      // Neither the ignored sweep attempt nor the number of moving probes can be
      // established exactly. Preserve an upper bound and label the result estimated.
      setup.attempts += 2;
      setup.settleMs = Math.min(setup.settleMs + 2000, 7000);
      if (setup.attempts >= MAX_TRAVEL_STEPS) {
        await finish(ctx, row, limitError);
        return null;
      }
    } else if (setup.side === "left") {
      setup.side = "right";
      setup.attempts = 0;
    } else {
      // The two deliberately observed no-movement probes are NOT travel. Exclude
      // the additional no-movement attempt that prompted the check as well. Any
      // other ignored requests/reaction delay remain uncertainty, not measured motion.
      const travelSteps = setup.attempts - 1;
      if (!validTravelSteps(travelSteps)) {
        await finish(ctx, row, "Not enough travel was observed. Start calibration again.");
        return null;
      }
      await ctx.db.patch(row._id, {
        travelSteps,
        homingSteps: setup.attempts,
        settleMs: setup.settleMs,
        measurement: "observed",
      });
      motion.target = travelSteps;
      await finish(ctx, row);
      return null;
    }
    setup.stage = "sweeping";
    motion.kind = "seek";
    motion.direction = setup.side;
    motion.steps = motion.completed + MAX_TRAVEL_STEPS - setup.attempts;
    await continueMotion(ctx, row, setup.settleMs);
    return null;
  },
});
