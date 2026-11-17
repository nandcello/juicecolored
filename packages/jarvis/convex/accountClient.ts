"use node";

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { createClient } from "./adapters/yeelight";
import { XiaomiAuthError } from "./adapters/vendor/xiaomi.mjs";
import { unseal } from "./crypto";
import { withLocalControl } from "./localClient";

/** Record account authorization failures separately from physical reachability. */
export function accountClient(ctx: ActionCtx, encryptedSession: string, cloudUnavailable = false) {
  const client = createClient(unseal(encryptedSession, "xiaomi:account"));
  const api = client.api.bind(client);
  client.api = async (path, data) => {
    if (cloudUnavailable) throw new XiaomiAuthError();
    try {
      return await api(path, data);
    } catch (error) {
      if (error instanceof XiaomiAuthError)
        await ctx.runMutation(internal.store.requireReconnect, { encryptedSession });
      // Never retry a physical command after an ambiguous response.
      throw error;
    }
  };
  return withLocalControl(ctx, client);
}
