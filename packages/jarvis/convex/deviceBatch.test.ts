// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// Combined device changes, verified at the local bridge boundary: every bridge
// job below is one miIO request that the Bathala worker sends exactly once.
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seal } from "./crypto";
import { FAN_PROPERTIES } from "./adapters/fan";
import { PROPS } from "./adapters/vendor/controls.mjs";
import { XiaomiClient } from "./adapters/vendor/xiaomi.mjs";
import type { FanState, LightState } from "../domain";

const modules = import.meta.glob(["./**/*.{ts,js,mjs}", "!./**/*.test.ts"]);
const bridge = "device-batch-bridge-secret-at-least-32-characters";
const gateway = "device-batch-gateway-secret-at-least-32-characters";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

type Job = { externalId: string; method: string; params: unknown[] };
type Property = { did: string; siid: number; piid: number; value?: unknown };

async function setup() {
  vi.stubEnv("JARVIS_BRIDGE_SECRET", bridge);
  vi.stubEnv("JARVIS_LOCAL_DEVICE_IDS", "456,123");
  vi.stubEnv("JARVIS_GATEWAY_SECRET", gateway);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  vi.spyOn(XiaomiClient.prototype, "api").mockRejectedValue(new Error("Cloud must not be used"));
  vi.spyOn(XiaomiClient.prototype, "rpc").mockRejectedValue(new Error("Cloud must not be used"));
  const t = convexTest(schema, modules);
  const fan: FanState = {
    power: true,
    speed: 40,
    mode: "straight",
    oscillating: true,
    angle: 90,
    offInMinutes: 0,
    indicator: true,
    sound: false,
    childLock: false,
  };
  const light: LightState = {
    power: false,
    brightness: 20,
    kelvin: 2700,
    color: "#ffffff",
    mode: "white",
    flowing: false,
    offInMinutes: 0,
  };
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("integrations", {
      provider: "xiaomi",
      region: "sg",
      connectedAt: 1,
      encryptedSession: seal(
        { userId: "owner", serviceToken: "token", region: "sg" },
        "xiaomi:account",
      ),
    });
    const base = { provider: "xiaomi", room: "Home", online: true, updatedAt: 1 } as const;
    const fanId = await ctx.db.insert("devices", {
      ...base,
      externalId: "456",
      model: "dmaker.fan.p18",
      kind: "fan",
      name: "Fan",
      capabilities: ["power", "speed", "oscillation", "fanMode", "timer"],
      state: fan,
    });
    const lightId = await ctx.db.insert("devices", {
      ...base,
      externalId: "123",
      model: "yeelink.light.color4",
      kind: "light",
      name: "Lamp",
      capabilities: ["power", "brightness", "temperature", "color", "timer"],
      state: light,
    });
    return { fanId, lightId };
  });
  await t.mutation(api.localBridge.heartbeat, { secret: bridge });

  // A simulated home: the fan applies MIoT properties, the bulb applies miIO methods.
  const physical = { fan: { ...fan }, light: { ...light } };
  const sent: Job[] = [];
  const holds = new Map<string, Promise<void>>();
  const rejectFan = new Set<number>();
  let failLightAt = -1;
  const fanKeys = Object.entries(FAN_PROPERTIES) as [keyof FanState, readonly [number, number]][];
  function respond(job: Job): { result?: unknown; error?: string } {
    if (job.externalId === "456") {
      const props = job.params as Property[];
      if (job.method === "get_properties")
        return {
          result: props.map((p) => {
            const [key] = fanKeys.find(([, [s, i]]) => s === p.siid && i === p.piid)!;
            const value = physical.fan[key];
            return { ...p, code: 0, value: key === "mode" ? (value === "natural" ? 1 : 0) : value };
          }),
        };
      return {
        result: props.map((p) => {
          const [key] = fanKeys.find(([, [s, i]]) => s === p.siid && i === p.piid)!;
          if (rejectFan.has(p.piid)) return { did: p.did, siid: p.siid, piid: p.piid, code: -4004 };
          (physical.fan as Record<string, unknown>)[key] =
            key === "mode" ? (p.value === 1 ? "natural" : "straight") : p.value;
          return { did: p.did, siid: p.siid, piid: p.piid, code: 0 };
        }),
      };
    }
    const l = physical.light;
    if (job.method === "get_prop")
      return {
        result: PROPS.map(
          (key) =>
            ({
              power: l.power ? "on" : "off",
              bright: String(l.brightness),
              ct: String(l.kelvin),
              rgb: String(parseInt(l.color.slice(1), 16)),
              hue: "0",
              sat: "0",
              color_mode: l.mode === "white" ? "2" : "1",
              flowing: "0",
              delayoff: String(l.offInMinutes),
              name: "Lamp",
            })[key],
        ),
      };
    const writes = sent.filter((j) => j.externalId === "123" && j.method !== "get_prop").length - 1;
    if (writes === failLightAt) return { error: "Device did not confirm the local request." };
    const [value] = job.params as [unknown];
    if (job.method === "set_power") l.power = value === "on";
    if (job.method === "set_bright") l.brightness = value as number;
    if (job.method === "set_ct_abx") Object.assign(l, { kelvin: value, mode: "white" });
    if (job.method === "set_rgb")
      Object.assign(l, {
        color: "#" + (value as number).toString(16).padStart(6, "0"),
        mode: "color",
      });
    if (job.method === "cron_add") l.offInMinutes = (job.params as number[])[1];
    if (job.method === "cron_del") l.offInMinutes = 0;
    return { result: ["ok"] };
  }
  let running = true;
  const worker = (async () => {
    while (running) {
      for (const id of await t.query(api.localBridge.pending, { secret: bridge })) {
        const identity = { secret: bridge, id, claim: "worker" };
        const job = await t.mutation(api.localBridge.claim, identity);
        if (!job) continue;
        sent.push({ externalId: job.externalId, method: job.method, params: job.params });
        // Each device has its own lane, as on the Bathala worker.
        void (async () => {
          await holds.get(job.externalId);
          await t.mutation(api.localBridge.complete, { ...identity, ...respond(job) });
        })();
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  })();
  return {
    t,
    ...ids,
    physical,
    sent,
    rejectFan,
    failLight: (index: number) => (failLightAt = index),
    hold(externalId: string) {
      let release!: () => void;
      holds.set(externalId, new Promise<void>((resolve) => (release = resolve)));
      return () => {
        holds.delete(externalId);
        release();
      };
    },
    writes: (externalId: string) =>
      sent.filter((j) => j.externalId === externalId && !j.method.startsWith("get_")),
    apply: (id: string, settings: Record<string, unknown>, duration?: number) =>
      t.action(api.gateway.execute, {
        secret: gateway,
        operation: {
          type: "apply",
          id: id as never,
          settings,
          ...(duration === undefined ? {} : { duration }),
        },
      }),
    snapshot: () => t.query(api.store.snapshot, { secret: gateway }),
    async stop() {
      running = false;
      await worker;
    },
  };
}

it("delivers a combined fan change as one set_properties request with every changed property", async () => {
  const s = await setup();
  await expect(
    s.apply(s.fanId, { speed: 72, oscillating: false, mode: "natural" }),
  ).resolves.toEqual({ ok: true });
  expect(s.writes("456")).toEqual([
    {
      externalId: "456",
      method: "set_properties",
      params: [
        { did: "456", siid: 2, piid: 10, value: 72 },
        { did: "456", siid: 2, piid: 3, value: 1 },
        { did: "456", siid: 2, piid: 4, value: false },
      ],
    },
  ]);
  const snapshot = await s.snapshot();
  expect(snapshot.devices.find((d) => d.name === "Fan")?.state).toMatchObject({
    speed: 72,
    oscillating: false,
    mode: "natural",
  });
  expect(snapshot.activity.map((a) => a.label)).toEqual(["Speed, wind mode, oscillation"]);
  await s.stop();
});

it("orders power-on first and power-off last inside the single fan request", async () => {
  const s = await setup();
  await s.apply(s.fanId, { speed: 30, power: false });
  expect((s.writes("456")[0].params as Property[]).map((p) => p.piid)).toEqual([10, 1]);
  await s.apply(s.fanId, { angle: 140, power: true });
  expect((s.writes("456")[1].params as Property[]).map((p) => p.piid)).toEqual([1, 5]);
  expect(s.writes("456")).toHaveLength(2);
  await s.stop();
});

it("sends one miIO method per changed light setting, in a safe order, and reads back once", async () => {
  const s = await setup();
  await expect(
    s.apply(s.lightId, { brightness: 65, power: true, kelvin: 4000 }, 30),
  ).resolves.toEqual({ ok: true });
  expect(s.writes("123")).toEqual([
    { externalId: "123", method: "set_power", params: ["on", "smooth", 30] },
    { externalId: "123", method: "set_bright", params: [65, "smooth", 30] },
    { externalId: "123", method: "set_ct_abx", params: [4000, "smooth", 30] },
  ]);
  expect(s.sent.filter((j) => j.method === "get_prop")).toHaveLength(1);
  expect((await s.snapshot()).devices.find((d) => d.name === "Lamp")?.state).toMatchObject({
    power: true,
    brightness: 65,
    kelvin: 4000,
  });
  await s.stop();
});

it("keeps devices independent: a delayed fan does not block a light change", async () => {
  const s = await setup();
  const release = s.hold("456");
  const fan = s.apply(s.fanId, { speed: 80 });
  await vi.waitFor(() => expect(s.writes("456")).toHaveLength(1));
  await expect(s.apply(s.lightId, { power: true }, 30)).resolves.toEqual({ ok: true });
  expect(s.physical.light.power).toBe(true);
  expect(s.physical.fan.speed).toBe(40);
  // The same device is still serialized while its write is in flight.
  await expect(s.apply(s.fanId, { speed: 20 })).rejects.toThrow("finishing another request");
  release();
  await expect(fan).resolves.toEqual({ ok: true });
  expect(s.writes("456")).toHaveLength(1);
  await s.stop();
});

it("account-wide work and fan movement exclude device leases in both directions", async () => {
  const s = await setup();
  const release = s.hold("456");
  const fan = s.apply(s.fanId, { speed: 80 });
  await vi.waitFor(() => expect(s.writes("456")).toHaveLength(1));
  expect(await s.t.mutation(internal.store.acquire, { key: "xiaomi-owner", token: "motion" })).toBe(
    false,
  );
  release();
  await fan;
  expect(await s.t.mutation(internal.store.acquire, { key: "xiaomi-owner", token: "motion" })).toBe(
    true,
  );
  await expect(s.apply(s.lightId, { power: true })).rejects.toThrow("in progress");
  expect(s.writes("123")).toEqual([]);
  await s.stop();
});

it("reports a partially rejected fan change as unconfirmed and never resends it", async () => {
  const s = await setup();
  s.rejectFan.add(4);
  await expect(s.apply(s.fanId, { speed: 60, oscillating: false })).rejects.toThrow(
    "The fan accepted 1 of 2 settings. Refresh before retrying.",
  );
  expect(s.writes("456")).toHaveLength(1);
  const snapshot = await s.snapshot();
  expect(snapshot.devices.find((d) => d.name === "Fan")).toMatchObject({ online: false });
  expect(snapshot.activity[0]).toMatchObject({ status: "error" });
  await s.stop();
});

it("stops a light change at the first unconfirmed method without sending the rest", async () => {
  const s = await setup();
  s.failLight(1);
  await expect(
    s.apply(s.lightId, { power: true, brightness: 50, color: "#ff0000" }, 30),
  ).rejects.toThrow(/bulb applied 1 of 3 changes|did not confirm/);
  expect(s.writes("123").map((j) => j.method)).toEqual(["set_power", "set_bright"]);
  await s.stop();
});

it("rejects settings that do not belong to the device kind before sending anything", async () => {
  const s = await setup();
  await expect(s.apply(s.lightId, { speed: 10 })).rejects.toThrow("Invalid setting");
  await expect(s.apply(s.lightId, { kelvin: 3000, color: "#ff0000" })).rejects.toThrow(
    "white temperature or color",
  );
  expect(s.sent).toEqual([]);
  await s.stop();
});
