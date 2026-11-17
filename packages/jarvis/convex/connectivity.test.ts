// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seal } from "./crypto";
import { XiaomiClient } from "./adapters/vendor/xiaomi.mjs";

const modules = import.meta.glob(["./**/*.{ts,js,mjs}", "!./**/*.test.ts"]);
const secret = "connectivity-test-gateway-secret-at-least-32";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function setup() {
  vi.stubEnv("JARVIS_GATEWAY_SECRET", secret);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  const t = convexTest(schema, modules);
  const session = {
    userId: "owner",
    serviceToken: "old-secret-token",
    ssecurity: Buffer.alloc(16).toString("base64"),
    region: "sg",
  };
  const encryptedSession = seal(session, "xiaomi:account");
  const { id, accountId } = await t.run(async (ctx) => {
    const accountId = await ctx.db.insert("integrations", {
      provider: "xiaomi",
      encryptedSession,
      region: "sg",
      connectedAt: 1,
    });
    const id = await ctx.db.insert("devices", {
      provider: "xiaomi",
      externalId: "123",
      kind: "fan",
      model: "dmaker.fan.p18",
      name: "My fan",
      room: "Bedroom",
      hidden: true,
      online: true,
      updatedAt: 123,
      capabilities: ["power", "speed"],
      state: {
        power: true,
        speed: 42,
        mode: "straight",
        oscillating: false,
        angle: 140,
        offInMinutes: 0,
        indicator: false,
        sound: false,
        childLock: false,
      },
    });
    await ctx.db.insert("fanDirections", {
      deviceId: id,
      travelSteps: 22,
      position: 10,
      measurement: "observed",
    });
    return { id, accountId };
  });
  return {
    t,
    id,
    accountId,
    encryptedSession,
    session,
    snapshot: () => t.query(api.store.snapshot, { secret }),
    refresh: () => t.action(api.gateway.execute, { secret, operation: { type: "refresh", id } }),
  };
}

it.each([401, 403, 2, 3])(
  "distinguishes Xiaomi auth failure %s from device failure",
  async (code) => {
    const s = await setup();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        code >= 400 ? new Response(null, { status: code }) : Response.json({ code }),
      );
    await expect(s.refresh()).rejects.toThrow("Reconnect your Xiaomi Home account in Settings");
    const snapshot = await s.snapshot();
    expect(snapshot).toMatchObject({ connected: true, requiresReconnect: true });
    expect(snapshot.devices[0]).toMatchObject({
      online: false,
      updatedAt: 123,
      state: { power: true, speed: 42 },
      error: expect.stringContaining("sign-in is required"),
      direction: { travelSteps: 22, position: null },
    });
    // No fabricated physical state or credentials in the public result.
    expect(JSON.stringify(snapshot)).not.toMatch(/old-secret-token|encryptedSession|ssecurity/);
    await expect(s.refresh()).rejects.toThrow("Reconnect");
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("does not require a new sign-in after a network failure", async () => {
  const s = await setup();
  const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Timed out"));
  await expect(s.refresh()).rejects.toThrow("Unable to read the device");
  expect((await s.snapshot()).requiresReconnect).toBe(false);
  await expect(s.refresh()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("records discovery authorization failure without deleting devices or trying fallback endpoints", async () => {
  const s = await setup();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 401 }));
  await expect(
    s.t.action(api.gateway.execute, { secret, operation: { type: "discover" } }),
  ).rejects.toThrow("Reconnect");
  expect((await s.snapshot()).devices[0].id).toBe(s.id);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("never retries a command when authorization is rejected", async () => {
  const s = await setup();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 401 }));
  await expect(
    s.t.action(api.gateway.execute, {
      secret,
      operation: { type: "control", id: s.id, action: "speed", data: { speed: 50 } },
    }),
  ).rejects.toThrow("Reconnect");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect((await s.snapshot()).requiresReconnect).toBe(true);
});

it.each([
  { userId: "owner", region: "sg", preserve: true },
  { userId: "another-owner", region: "sg", preserve: false },
  { userId: "owner", region: "de", preserve: false },
])(
  "reconnects $userId in $region with preserve=$preserve",
  async ({ userId, region, preserve }) => {
    const s = await setup();
    await s.t.mutation(internal.store.requireReconnect, { encryptedSession: s.encryptedSession });
    await s.t.mutation(internal.store.putLogin, {
      key: "qr",
      encryptedSession: seal({ region }, "xiaomi:login:qr"),
      expires: Date.now() + 60000,
    });
    vi.spyOn(XiaomiClient.prototype, "pollQR").mockImplementation(async function (
      this: XiaomiClient,
    ) {
      this.session = { ...s.session, userId, region, serviceToken: "new-secret-token" };
      return true;
    });
    // A discovery outage must not undo successful reauthorization or destroy same-account settings.
    vi.spyOn(XiaomiClient.prototype, "devices").mockRejectedValue(new Error("Temporary outage"));
    await expect(
      s.t.action(api.gateway.execute, { secret, operation: { type: "pollLogin", key: "qr" } }),
    ).resolves.toMatchObject({ connected: true });
    const snapshot = await s.snapshot();
    expect(snapshot.requiresReconnect).toBe(false);
    if (preserve) {
      expect(snapshot.devices[0]).toMatchObject({
        id: s.id,
        name: "My fan",
        room: "Bedroom",
        hidden: true,
        online: false,
        direction: { travelSteps: 22, position: null, measurement: "observed" },
      });
      expect((await s.t.query(internal.store.account, {}))?._id).toBe(s.accountId);
    } else {
      expect(snapshot.devices).toEqual([]);
      expect(await s.t.run((ctx) => ctx.db.query("fanDirections").take(1))).toEqual([]);
    }
    // A failure completing after the reconnect cannot poison the new session.
    await s.t.mutation(internal.store.requireReconnect, { encryptedSession: s.encryptedSession });
    expect((await s.snapshot()).requiresReconnect).toBe(false);
  },
);
