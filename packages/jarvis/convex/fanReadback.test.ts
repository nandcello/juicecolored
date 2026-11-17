// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { seal } from "./crypto";
import { FAN_PROPERTIES } from "./adapters/fan";
import { XiaomiClient } from "./adapters/vendor/xiaomi.mjs";
import type { FanState } from "../domain";

const modules = import.meta.glob(["./**/*.{ts,js,mjs}", "!./**/*.test.ts"]);
const secret = "fan-readback-test-gateway-secret-32-characters";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function setup(initial = false, staleReads = 1) {
  vi.stubEnv("JARVIS_GATEWAY_SECRET", secret);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  const t = convexTest(schema, modules);
  const cached: FanState = {
    power: true,
    speed: 40,
    mode: "straight",
    oscillating: initial,
    angle: 140,
    offInMinutes: 0,
    indicator: false,
    sound: false,
    childLock: false,
  };
  const id = await t.run(async (ctx) => {
    await ctx.db.insert("integrations", {
      provider: "xiaomi",
      region: "sg",
      connectedAt: Date.now(),
      encryptedSession: seal({ serviceToken: "test-token", region: "sg" }, "xiaomi:account"),
    });
    return ctx.db.insert("devices", {
      externalId: "456",
      provider: "xiaomi",
      model: "dmaker.fan.p18",
      kind: "fan",
      name: "Standing fan",
      room: "Office",
      online: true,
      updatedAt: 1,
      capabilities: ["power", "speed", "oscillation"],
      state: cached,
    });
  });
  let physical = initial;
  let readCount = 0;
  const cloud = vi.spyOn(XiaomiClient.prototype, "api").mockImplementation(async (path, data) => {
    if (path === "/miotspec/prop/set") {
      physical = data.params[0].value;
      return [{ did: "456", siid: 2, piid: 4, code: 0 }];
    }
    expect(path).toBe("/miotspec/prop/get");
    expect(data.datasource).toBe(2);
    const reported = ++readCount > staleReads ? physical : cached.oscillating;
    return Object.entries(FAN_PROPERTIES).map(([key, [siid, piid]]) => ({
      did: "456",
      siid,
      piid,
      code: 0,
      value: key === "mode" ? 0 : key === "oscillating" ? reported : cached[key as keyof FanState],
    }));
  });
  return {
    t,
    id,
    cloud,
    control: () =>
      t.action(api.gateway.execute, {
        secret,
        operation: { type: "control", id, action: "oscillation", data: { on: !initial } },
      }),
    snapshot: () => t.query(api.store.snapshot, { secret }),
    refresh: () => t.action(api.gateway.execute, { secret, operation: { type: "refresh", id } }),
    fresh: () => {
      staleReads = 0;
    },
    writes: () => cloud.mock.calls.filter(([path]) => path.endsWith("/set")),
  };
}

it.each([false, true])(
  "confirms oscillation after a stale read and retains it across reloads (initial %s)",
  async (initial) => {
    const s = await setup(initial);
    expect(await s.control()).toEqual({ ok: true });
    expect(s.writes()).toHaveLength(1);
    expect(s.cloud).toHaveBeenCalledTimes(3);
    for (let reload = 0; reload < 3; reload++) {
      const snapshot = await s.snapshot();
      expect(snapshot.devices[0]).toMatchObject({ online: true, state: { oscillating: !initial } });
      expect(snapshot.devices[0].error).toBeUndefined();
      expect(snapshot.activity[0]).toMatchObject({
        label: "Oscillation changed",
        status: "success",
      });
    }
    expect(s.cloud).toHaveBeenCalledTimes(3);
  },
);

it("bounds confirmation reads and persists an honest warning when state never converges", async () => {
  const s = await setup(false, Infinity);
  const result = await s.control();
  expect(result).toMatchObject({
    ok: true,
    warning: expect.stringContaining("reported setting has not changed"),
  });
  expect(s.writes()).toHaveLength(1);
  expect(s.cloud).toHaveBeenCalledTimes(4);
  const snapshot = await s.snapshot();
  expect(snapshot.devices[0]).toMatchObject({
    online: true,
    state: { oscillating: false },
    error: expect.stringContaining("reported setting has not changed"),
  });
  expect(snapshot.activity[0]).toMatchObject({
    label: "Command accepted — state not confirmed",
    status: "error",
  });
  s.fresh();
  await s.refresh();
  const refreshed = await s.snapshot();
  expect(refreshed.devices[0].state).toMatchObject({ oscillating: true });
  expect(refreshed.devices[0].error).toBeUndefined();
  expect(s.writes()).toHaveLength(1);
});

it("finishes immediately when the first read matches", async () => {
  const s = await setup(false, 0);
  expect(await s.control()).toEqual({ ok: true });
  expect(s.cloud).toHaveBeenCalledTimes(2);
});

it("does not resend a command with an ambiguous network failure", async () => {
  const s = await setup();
  s.cloud.mockRejectedValueOnce(new Error("Timeout"));
  await expect(s.control()).rejects.toThrow();
  expect(s.cloud).toHaveBeenCalledTimes(1);
  expect((await s.snapshot()).devices[0].state).toMatchObject({ oscillating: false });
});
