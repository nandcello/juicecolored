"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createClient } from "./adapters/yeelight";
import { controlFan, readFan } from "./adapters/fan";
import { unseal } from "./crypto";
import type { FanState } from "../domain";

export const step = internalAction({
  args: { deviceId: v.id("devices"), token: v.string(), step: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const claimed = await ctx.runMutation(internal.fanMotion.claim, args);
      if (!claimed) return null;
      const client = createClient(unseal(claimed.encryptedSession, "xiaomi:account"));
      const checkState = async () => {
        let state: FanState;
        try {
          state = await readFan(client, claimed.externalId);
        } catch {
          await ctx.runMutation(internal.store.updateState, {
            id: args.deviceId,
            online: false,
            error: "Unable to read the fan. Check power and Xiaomi Home, then refresh.",
          });
          throw new Error("Fan state could not be read.");
        }
        await ctx.runMutation(internal.store.updateState, {
          id: args.deviceId,
          online: true,
          state,
        });
        if (!state.power || state.oscillating || state.childLock)
          throw new Error(
            "Fan controls changed. Turn off oscillation and child lock, then calibrate again.",
          );
      };
      // Read before starting, periodically during travel, and after the final step.
      // Re-reading all properties after every nudge adds latency but no heading feedback.
      if (claimed.checkBefore) await checkState();
      if (!(await ctx.runQuery(internal.fanMotion.maySend, args))) {
        await ctx.runMutation(internal.fanMotion.completeStep, {
          ...args,
          sent: false,
        });
        return null;
      }
      await controlFan(client, claimed.externalId, "direction", { direction: claimed.direction });
      await new Promise((resolve) => setTimeout(resolve, claimed.settleMs));
      if (claimed.last) await checkState();
      await ctx.runMutation(internal.fanMotion.completeStep, args);
    } catch {
      // A timeout can follow successful delivery. Never repeat a physical nudge.
      await ctx.runMutation(internal.fanMotion.completeStep, {
        ...args,
        error: "Movement could not be confirmed. Calibrate again before aiming.",
      });
    }
    return null;
  },
});
