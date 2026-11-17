// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seal } from "./crypto";
import { XiaomiClient } from "./adapters/vendor/xiaomi.mjs";

const modules = import.meta.glob(["./**/*.{ts,js,mjs}", "!./**/*.test.ts"]);
const secret = "local-bridge-test-secret-at-least-32-characters";
const gateway = "local-gateway-test-secret-at-least-32-characters";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function setup() {
  vi.stubEnv("JARVIS_BRIDGE_SECRET", secret);
  vi.stubEnv("JARVIS_LOCAL_DEVICE_IDS", "123");
  vi.stubEnv("JARVIS_GATEWAY_SECRET", gateway);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  const t = convexTest(schema, modules);
  const encryptedSession = seal(
    { userId: "owner", serviceToken: "expired", region: "sg" },
    "xiaomi:account",
  );
  const id = await t.run(async (ctx) => {
    await ctx.db.insert("integrations", {
      provider: "xiaomi",
      encryptedSession,
      region: "sg",
      connectedAt: 1,
      requiresReconnect: true,
    });
    const id = await ctx.db.insert("devices", {
      externalId: "123",
      provider: "xiaomi",
      name: "Light",
      model: "yeelink.light.color4",
      room: "Home",
      kind: "light",
      online: true,
      updatedAt: 1,
      capabilities: ["power"],
      state: {
        power: false,
        brightness: 1,
        kelvin: 4000,
        color: "#ffffff",
        mode: "white",
        flowing: false,
        offInMinutes: 0,
      },
    });
    return id;
  });
  await t.mutation(api.localBridge.heartbeat, { secret });
  const request = { externalId: "123", method: "get_prop", params: ["power"] };
  return { t, id, request };
}

it("requires the bridge credential and refuses unknown devices or unsafe RPCs", async () => {
  const { t, request } = await setup();
  await expect(t.query(api.localBridge.pending, { secret: "wrong" })).rejects.toThrow(
    "Unauthorized",
  );
  await expect(t.mutation(api.localBridge.heartbeat, { secret: "wrong" })).rejects.toThrow(
    "Unauthorized",
  );
  await expect(
    t.mutation(internal.localBridge.enqueue, { ...request, externalId: "999" }),
  ).rejects.toThrow("not paired");
  await expect(
    t.mutation(internal.localBridge.enqueue, { ...request, method: "miIO.config_router" }),
  ).rejects.toThrow("Invalid");
});

it("claims a command once and never reissues it after a worker restart or lost result", async () => {
  const { t, request } = await setup();
  const id = await t.mutation(internal.localBridge.enqueue, request);
  const identity = { secret, id, claim: "worker-first-attempt" };
  expect(await t.mutation(api.localBridge.claim, identity)).toMatchObject(request);
  expect(await t.mutation(api.localBridge.claim, identity)).toBeNull();
  expect(
    await t.mutation(api.localBridge.claim, { ...identity, claim: "worker-after-restart" }),
  ).toBeNull();
  expect(await t.query(api.localBridge.pending, { secret })).toEqual([]);
  await t.mutation(api.localBridge.complete, { ...identity, claim: "wrong", result: ["on"] });
  expect(await t.query(internal.localBridge.result, { id })).toEqual({ status: "running" });
  await t.mutation(api.localBridge.complete, { ...identity, result: ["on"] });
  await t.mutation(api.localBridge.complete, { ...identity, result: ["off"] });
  expect(await t.query(internal.localBridge.result, { id })).toEqual({
    status: "done",
    result: ["on"],
  });
});

it("does not deliver queued or claimed commands after expiry", async () => {
  const { t, request } = await setup();
  const id = await t.mutation(internal.localBridge.enqueue, request);
  const identity = { secret, id, claim: "worker" };
  await t.run((ctx) => ctx.db.patch(id, { expiresAt: Date.now() - 1 }));
  expect(await t.mutation(api.localBridge.claim, identity)).toBeNull();
  const running = await t.mutation(internal.localBridge.enqueue, request);
  const second = { ...identity, id: running };
  await t.mutation(api.localBridge.claim, second);
  await t.mutation(internal.localBridge.expire, { id: running });
  expect(await t.mutation(api.localBridge.maySend, second)).toBe(false);
  await t.mutation(api.localBridge.complete, { ...second, result: ["on"] });
  expect(await t.query(internal.localBridge.result, { id: running })).toMatchObject({
    status: "failed",
  });
});

it("fails immediately when the bridge heartbeat is stale", async () => {
  const { t, request } = await setup();
  await t.run(async (ctx) => {
    const row = await ctx.db
      .query("bridgePresence")
      .withIndex("by_name", (q) => q.eq("name", "home"))
      .unique();
    await ctx.db.patch(row!._id, { lastSeenAt: Date.now() - 90001 });
  });
  await expect(t.mutation(internal.localBridge.enqueue, request)).rejects.toThrow(
    "bridge is offline",
  );
});

it("does not make a failed device read look like a fresh observation", async () => {
  const { t, id } = await setup();
  await t.mutation(internal.store.updateState, { id, online: false, error: "Read failed" });
  const snapshot = await t.query(api.store.snapshot, { secret: gateway });
  expect(snapshot.devices[0]).toMatchObject({
    online: false,
    updatedAt: 1,
    state: { power: false },
  });
});

it("refreshes a locally paired device after Xiaomi authentication expires without any cloud call", async () => {
  const { t, id } = await setup();
  const cloud = vi
    .spyOn(XiaomiClient.prototype, "api")
    .mockRejectedValue(new Error("Cloud must not be used"));
  const result = t.action(api.gateway.execute, {
    secret: gateway,
    operation: { type: "refresh", id },
  });
  let jobs: Awaited<ReturnType<typeof t.query<typeof api.localBridge.pending>>> = [];
  for (let i = 0; i < 100 && !jobs.length; i++) {
    jobs = await t.query(api.localBridge.pending, { secret });
    if (!jobs.length) await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(jobs).toHaveLength(1);
  const identity = { secret, id: jobs[0], claim: "worker" };
  const job = await t.mutation(api.localBridge.claim, identity);
  expect(job?.method).toBe("get_prop");
  await t.mutation(api.localBridge.complete, {
    ...identity,
    result: ["on", "70", "4000", "16711680", "0", "100", "2", "0", "0", "Light"],
  });
  await expect(result).resolves.toEqual({ ok: true });
  expect(cloud).not.toHaveBeenCalled();
  const snapshot = await t.query(api.store.snapshot, { secret: gateway });
  expect(snapshot.requiresReconnect).toBe(true);
  expect(snapshot.devices[0]).toMatchObject({
    transport: "local",
    online: true,
    state: { power: true, brightness: 70 },
  });
  expect(JSON.stringify(snapshot)).not.toContain("expired");
});
