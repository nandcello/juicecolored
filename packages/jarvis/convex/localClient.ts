"use node";
import type { ActionCtx } from "./_generated/server";
import type { CloudClient } from "./adapters/yeelight";
import { internal } from "./_generated/api";
import { usesLocalControl } from "./localConfig";

async function request(ctx: ActionCtx, externalId: string, method: string, params: unknown[]) {
  const id = await ctx.runMutation(internal.localBridge.enqueue, { externalId, method, params });
  try {
    const deadline = Date.now() + 14000;
    while (Date.now() < deadline) {
      const job = await ctx.runQuery(internal.localBridge.result, { id });
      if (!job) throw new Error("Device request expired. Refresh before retrying.");
      if (job.status === "done") return job.result;
      if (job.status === "failed")
        throw new Error(job.error ?? "Device did not confirm the request.");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("Device response timed out. Refresh before retrying.");
  } finally {
    // A queued command must never run after its caller has given up.
    await ctx.runMutation(internal.localBridge.expire, { id });
  }
}

export function withLocalControl(ctx: ActionCtx, client: CloudClient): CloudClient {
  const cloudRpc = client.rpc.bind(client),
    cloudApi = client.api.bind(client);
  client.rpc = (id, method, params) =>
    usesLocalControl(id) ? request(ctx, id, method, params) : cloudRpc(id, method, params);
  client.api = (path, data) => {
    if (path === "/miotspec/prop/get" || path === "/miotspec/prop/set") {
      const params = (data as { params?: { did: string }[] })?.params;
      const id = params?.[0]?.did;
      if (id && usesLocalControl(id) && params?.every((p) => p.did === id))
        return request(
          ctx,
          id,
          path.endsWith("/get") ? "get_properties" : "set_properties",
          params,
        );
    }
    return cloudApi(path, data);
  };
  return client;
}
