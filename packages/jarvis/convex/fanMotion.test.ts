// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { seal } from "./crypto";
import * as fanAdapter from "./adapters/fan";
import type { FanState } from "../domain";

const modules = import.meta.glob(["./**/*.{ts,js,mjs}", "!./**/*.test.ts"]);
const secret = "fan-motion-test-gateway-secret-32-characters";
const requestUrl = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : String(input);
const ready: FanState = {
  power: true,
  speed: 40,
  mode: "straight",
  oscillating: false,
  angle: 140,
  offInMinutes: 0,
  indicator: false,
  sound: false,
  childLock: false,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("JARVIS_GATEWAY_SECRET", secret);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const id = await t.run(async (ctx) => {
    await ctx.db.insert("integrations", {
      provider: "xiaomi",
      region: "sg",
      connectedAt: Date.now(),
      encryptedSession: seal(
        {
          userId: "test",
          serviceToken: "test-token",
          ssecurity: Buffer.alloc(16).toString("base64"),
          region: "sg",
        },
        "xiaomi:account",
      ),
    });
    return ctx.db.insert("devices", {
      externalId: "456",
      provider: "xiaomi",
      model: "dmaker.fan.p18",
      kind: "fan",
      name: "Standing fan",
      room: "Office",
      online: true,
      updatedAt: Date.now(),
      capabilities: ["power", "speed", "oscillation"],
      state: ready,
    });
  });
  let physical = { ...ready };
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const result = requestUrl(input).includes("/prop/set")
      ? [{ did: "456", siid: 2, piid: 9, code: 0 }]
      : Object.entries(fanAdapter.FAN_PROPERTIES).map(([key, [siid, piid]]) => ({
          did: "456",
          siid,
          piid,
          code: 0,
          value:
            key === "mode"
              ? physical.mode === "natural"
                ? 1
                : 0
              : physical[key as keyof FanState],
        }));
    return Response.json({ code: 0, result });
  });
  const control = vi.spyOn(fanAdapter, "controlFan");
  const snapshot = () => t.query(api.store.snapshot, { secret });
  const direction = async () => (await snapshot()).devices[0].direction!;
  const home = (travelSteps = 4) =>
    t.action(api.gateway.execute, { secret, operation: { type: "fanHome", id, travelSteps } });
  const drain = () => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(50), 5000);
  return {
    t,
    id,
    fetch,
    control,
    snapshot,
    direction,
    home,
    drain,
    setPhysical: (state: Partial<FanState>) => {
      physical = { ...physical, ...state };
    },
  };
}

describe("background fan calibration", () => {
  it("homes without a browser, persists its reference, and then aims from it", async () => {
    const s = await setup();
    await s.home();
    expect((await s.direction()).motion).toMatchObject({ kind: "home", steps: 4, completed: 0 });
    expect(s.fetch).not.toHaveBeenCalled();
    await s.drain();
    expect(await s.direction()).toEqual({ travelSteps: 4, position: 0 });
    expect(s.control.mock.calls.map((call) => call[3])).toEqual(
      Array(4).fill({ direction: "left" }),
    );
    expect(
      s.fetch.mock.calls.filter(([url]) => requestUrl(url).includes("/prop/get")),
    ).toHaveLength(2);
    expect((await s.snapshot()).activity[0].label).toBe("Fan direction calibrated");
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanAim", id: s.id, position: 2 },
    });
    await s.drain();
    expect((await s.direction()).position).toBe(2);
    expect(s.control.mock.calls.slice(4).map((call) => call[3])).toEqual([
      { direction: "right" },
      { direction: "right" },
    ]);
    expect(
      await s.t.mutation(internal.store.acquire, { key: "xiaomi-owner", token: "after" }),
    ).toBe(true);
  });

  it("keeps the saved server measurement when another browser sends an old one", async () => {
    const s = await setup();
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanReference", id: s.id, travelSteps: 4, position: 4 },
    });
    await s.home(70);
    expect((await s.direction()).motion?.steps).toBe(4);
    await s.drain();
    expect(s.control).toHaveBeenCalledTimes(4);
  });

  it("rejects unauthorized, invalid, and unready requests before sending anything", async () => {
    const s = await setup();
    await expect(
      s.t.action(api.gateway.execute, {
        secret: "wrong",
        operation: { type: "fanHome", id: s.id, travelSteps: 4 },
      }),
    ).rejects.toThrow("Unauthorized");
    for (const total of [0, 1, 2.5, 71]) await expect(s.home(total)).rejects.toThrow("Measure");
    await expect(
      s.t.action(api.gateway.execute, {
        secret,
        operation: { type: "fanAim", id: s.id, position: 2 },
      }),
    ).rejects.toThrow();
    await s.t.mutation(internal.store.updateState, {
      id: s.id,
      online: true,
      state: { ...ready, oscillating: true },
    });
    await expect(s.home()).rejects.toThrow("oscillation");
    expect(s.fetch).not.toHaveBeenCalled();
  });

  it("blocks another tab's commands but allows authenticated cancellation", async () => {
    const s = await setup();
    await s.home();
    const token = (await s.direction()).motion!.token;
    await expect(
      s.t.action(api.gateway.execute, {
        secret,
        operation: { type: "control", id: s.id, action: "power", data: { on: false } },
      }),
    ).rejects.toThrow("in progress");
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanStop", id: s.id, token: "old-token" },
    });
    expect((await s.direction()).motion).toBeDefined();
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanStop", id: s.id, token },
    });
    await s.drain();
    expect(s.control).not.toHaveBeenCalled();
    expect(await s.direction()).toMatchObject({
      position: null,
      error: expect.stringContaining("stopped"),
    });
  });

  it("finishes only the in-flight nudge after stop and never repeats it", async () => {
    const s = await setup();
    // Stop while the physical request is in progress, rather than cancelling before it starts.
    s.control.mockImplementationOnce(async () => {
      const token = (await s.direction()).motion!.token;
      await s.t.action(api.gateway.execute, {
        secret,
        operation: { type: "fanStop", id: s.id, token },
      });
    });
    await s.home();
    await s.drain();
    expect(s.control).toHaveBeenCalledTimes(1);
    expect((await s.direction()).motion).toBeUndefined();
    expect((await s.direction()).position).toBeNull();
  });

  it("does not retry an ambiguous nudge or leave a usable position", async () => {
    const s = await setup();
    s.control.mockRejectedValueOnce(new Error("delivery timed out"));
    await s.home();
    await s.drain();
    expect(s.control).toHaveBeenCalledTimes(1);
    expect(await s.direction()).toMatchObject({
      position: null,
      error: expect.stringContaining("not be confirmed"),
    });
    expect((await s.direction()).motion).toBeUndefined();
  });

  it("physically checks readiness before movement, even if the cached state is ready", async () => {
    const s = await setup();
    s.setPhysical({ childLock: true });
    await s.home();
    await s.drain();
    expect(s.control).not.toHaveBeenCalled();
    expect((await s.direction()).position).toBeNull();
  });

  it("does not claim success when the final physical read fails", async () => {
    const s = await setup();
    let reads = 0;
    const original = s.fetch.getMockImplementation()!;
    s.fetch.mockImplementation(async (...args) => {
      if (requestUrl(args[0]).includes("/prop/get") && ++reads === 2) throw new Error("offline");
      return original(...args);
    });
    await s.home();
    await s.drain();
    expect(s.control).toHaveBeenCalledTimes(4);
    expect((await s.direction()).position).toBeNull();
    expect((await s.direction()).error).toBeDefined();
    expect((await s.snapshot()).devices[0].online).toBe(false);
  });

  it("expires a lost worker and ignores stale completions after a new job starts", async () => {
    const s = await setup();
    await s.home();
    const token = (await s.direction()).motion!.token;
    // Claim without running its action, simulating a process lost before its result is recorded.
    expect(
      await s.t.mutation(internal.fanMotion.claim, { deviceId: s.id, token, step: 0 }),
    ).not.toBeNull();
    expect(
      await s.t.mutation(internal.fanMotion.claim, { deviceId: s.id, token, step: 0 }),
    ).toBeNull();
    vi.advanceTimersByTime(120001);
    await s.drain();
    expect(s.control).not.toHaveBeenCalled();
    expect((await s.direction()).error).toBeDefined();
    await s.home();
    const fresh = (await s.direction()).motion!.token;
    await s.t.mutation(internal.fanMotion.completeStep, {
      deviceId: s.id,
      token,
      step: 0,
      error: "stale failure",
    });
    expect((await s.direction()).motion?.token).toBe(fresh);
    await s.drain();
    expect((await s.direction()).position).toBe(0);
  });

  it("invalidates the saved position on manual movement, state changes, and disconnect", async () => {
    const s = await setup();
    await s.home();
    await s.drain();
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "control", id: s.id, action: "direction", data: { direction: "right" } },
    });
    expect((await s.direction()).position).toBeNull();
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanReference", id: s.id, travelSteps: 4, position: 0 },
    });
    await s.t.mutation(internal.store.updateState, { id: s.id, online: false });
    expect((await s.direction()).position).toBeNull();
    await s.t.action(api.gateway.execute, { secret, operation: { type: "disconnect" } });
    expect(await s.t.run((ctx) => ctx.db.query("fanDirections").take(1))).toEqual([]);
  });
});

async function automaticSetup() {
  const s = await setup();
  const row = () =>
    s.t.run((ctx) =>
      ctx.db
        .query("fanDirections")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", s.id))
        .unique(),
    );
  async function until(
    predicate: (value: NonNullable<Awaited<ReturnType<typeof row>>>) => boolean,
  ) {
    for (let i = 0; i < 2500; i++) {
      const value = await row();
      if (value && predicate(value)) return value;
      await vi.advanceTimersByTimeAsync(100);
    }
    throw new Error("Calibration did not reach the expected state.");
  }
  async function check() {
    const value = (await row())!;
    await s.t.action(api.gateway.execute, {
      secret,
      operation: {
        type: "fanCheckEnd",
        id: s.id,
        token: value.motion!.token,
        round: value.setup!.round,
      },
    });
    return until((v) => v.setup?.stage === "confirm");
  }
  async function observe(moved: boolean) {
    const value = (await row())!;
    await s.t.action(api.gateway.execute, {
      secret,
      operation: {
        type: "fanObserveEnd",
        id: s.id,
        token: value.motion!.token,
        round: value.setup!.round,
        moved,
      },
    });
  }
  await s.t.action(api.gateway.execute, { secret, operation: { type: "fanSetup", id: s.id } });
  return { ...s, row, until, check, observe };
}

describe("automatic first-time fan setup", () => {
  it("moves without per-step clicks, checks both ends, and excludes known no-movement attempts", async () => {
    const s = await automaticSetup();
    expect((await s.direction()).travelSteps).toBe(0);
    await s.until((r) => (r.setup?.attempts ?? 0) >= 2);
    const left = await s.check();
    expect(left.setup?.side).toBe("left");
    expect(left.position).toBeNull();
    const waitingWrites = s.control.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(s.control).toHaveBeenCalledTimes(waitingWrites);
    await s.observe(false);
    await s.until((r) => r.setup?.side === "right" && r.setup.attempts >= 5);
    const right = await s.check();
    const attempts = right.setup!.attempts;
    expect(right.motion?.direction).toBe("right");
    await s.observe(false);
    const result = (await s.row())!;
    expect(result.setup).toBeUndefined();
    expect(result.motion).toBeUndefined();
    expect(result.travelSteps).toBe(attempts - 1);
    expect(result.homingSteps).toBe(attempts);
    expect(result.position).toBe(attempts - 1);
    expect(result.measurement).toBe("observed");
    expect((await s.snapshot()).activity[0].status).toBe("success");
    // Automatic re-homing uses the conservative command count, not the smaller
    // estimated travel distance, and retains the verified slower cadence.
    await s.home();
    expect((await s.direction()).motion?.steps).toBe(attempts);
    await s.drain();
  });

  it("pauses before probes, spaces them six seconds apart, and slows down after a false end", async () => {
    const s = await automaticSetup();
    const sends: number[] = [];
    s.control.mockImplementation(async () => {
      sends.push(Date.now());
    });
    await s.until((r) => (r.setup?.attempts ?? 0) >= 2);
    const beforeCheck = Date.now();
    const checked = await s.check();
    const probes = sends.slice(-2);
    expect(probes[0] - beforeCheck).toBeGreaterThanOrEqual(6000);
    expect(probes[1] - probes[0]).toBeGreaterThanOrEqual(6000);
    expect(checked.travelSteps).toBe(0);
    const oldRound = checked.setup!.round;
    const token = checked.motion!.token;
    await s.observe(true);
    expect((await s.row())!.setup).toMatchObject({
      side: "left",
      stage: "sweeping",
      settleMs: 5000,
      round: oldRound + 1,
    });
    // A delayed duplicate observation must not advance the next phase.
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanObserveEnd", id: s.id, token, round: oldRound, moved: false },
    });
    expect((await s.row())!.setup?.side).toBe("left");
    const count = sends.length;
    await s.until(() => sends.length >= count + 2);
    expect(sends.at(-1)! - sends.at(-2)!).toBeGreaterThanOrEqual(5000);
    await s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "fanStop", id: s.id, token },
    });
    await s.drain();
  });

  it("does not mistake accepted commands or a movement cap for a detected endpoint", async () => {
    const s = await automaticSetup();
    // All acknowledgements succeed, regardless of actual head movement. Without
    // an observation the bounded sweep must fail, never save a measurement.
    await s.until((r) => !r.motion);
    expect((await s.row())!.position).toBeNull();
    expect((await s.row())!.travelSteps).toBe(0);
    expect((await s.row())!.error).toContain("movement limit");
    expect(s.control).toHaveBeenCalledTimes(70);
    await s.drain();
  });

  it("ignores premature/stale observations and expires an abandoned endpoint question", async () => {
    const s = await automaticSetup();
    const initial = (await s.row())!;
    for (const token of ["stale", initial.motion!.token]) {
      await s.t.action(api.gateway.execute, {
        secret,
        operation: { type: "fanObserveEnd", id: s.id, token, round: 0, moved: false },
      });
    }
    expect((await s.row())!.setup?.side).toBe("left");
    await s.until((r) => (r.setup?.attempts ?? 0) >= 1);
    await s.check();
    await vi.advanceTimersByTimeAsync(120001);
    await s.drain();
    expect((await s.row())!.motion).toBeUndefined();
    expect((await s.row())!.setup).toBeUndefined();
    expect((await s.row())!.position).toBeNull();
    expect((await s.row())!.travelSteps).toBe(0);
  });

  it("does not retry failed physical commands during first setup", async () => {
    const s = await automaticSetup();
    s.control.mockRejectedValueOnce(new Error("ambiguous delivery"));
    await s.drain();
    expect(s.control).toHaveBeenCalledTimes(1);
    expect((await s.direction()).setup).toBeUndefined();
    expect((await s.direction()).position).toBeNull();
    expect((await s.direction()).error).toContain("not be confirmed");
    // An abandoned first setup leaves a provisional zero count. It must not
    // prevent a different browser from importing its older valid measurement.
    await s.home(4);
    await s.drain();
    expect((await s.direction()).travelSteps).toBe(4);
    expect((await s.direction()).position).toBe(0);
  });
});
