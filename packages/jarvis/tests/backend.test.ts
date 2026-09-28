import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { seal } from "../convex/crypto";
const modules = import.meta.glob("../convex/**/*.{ts,js,mjs}");
const secret = "test-gateway-secret-at-least-32-characters";
beforeEach(() => {
  vi.stubEnv("JARVIS_GATEWAY_SECRET", secret);
  vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
});
async function seed(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const accountId = await ctx.db.insert("integrations", {
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
    const id = await ctx.db.insert("devices", {
      provider: "xiaomi",
      externalId: "123",
      kind: "light",
      name: "Desk light",
      room: "Office",
      model: "yeelink.light.color3",
      online: true,
      capabilities: ["power", "brightness", "color"],
      state: {
        power: true,
        brightness: 50,
        kelvin: 4000,
        color: "#ffffff",
        mode: "white",
        flowing: false,
        offInMinutes: 0,
      },
      updatedAt: Date.now(),
    });
    return { id, accountId };
  });
}
describe("Convex device workflow", () => {
  it("rejects unauthenticated reads and commands", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.store.snapshot, { secret: "wrong" })).rejects.toThrow("Unauthorized");
    await expect(
      t.action(api.gateway.execute, {
        secret: "wrong",
        operation: { type: "discover" },
      }),
    ).rejects.toThrow("Unauthorized");
  });
  it("never exposes encrypted account credentials or upstream identifiers in snapshots", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const result = await t.query(api.store.snapshot, { secret });
    expect(result.connected).toBe(true);
    expect(result.devices[0].name).toBe("Desk light");
    expect(JSON.stringify(result)).not.toMatch(
      /encryptedSession|serviceToken|externalId|test-token/,
    );
  });
  it("roundtrips a command through cloud RPC and saves the confirmed light state", async () => {
    const t = convexTest(schema, modules),
      { id } = await seed(t);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ code: 0, result: ["ok"] }))
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          result: ["off", "50", "4000", "16777215", "0", "0", "2", "0", "0", "Bulb"],
        }),
      );
    await expect(
      t.action(api.gateway.execute, {
        secret,
        operation: {
          type: "control",
          id,
          action: "power",
          data: { on: false },
        },
      }),
    ).resolves.toEqual({ ok: true });
    const result = await t.query(api.store.snapshot, { secret });
    expect(result.devices[0].state.power).toBe(false);
    expect(result.activity[0]).toMatchObject({
      label: "Turned off",
      status: "success",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never retries an unconfirmed command and records its failure", async () => {
    const t = convexTest(schema, modules),
      { id } = await seed(t);
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Timeout"));
    await expect(
      t.action(api.gateway.execute, {
        secret,
        operation: {
          type: "control",
          id,
          action: "power",
          data: { on: false },
        },
      }),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    const result = await t.query(api.store.snapshot, { secret });
    expect(result.activity[0].status).toBe("error");
    expect(result.devices[0].state.power).toBe(true);
  });
  it("serializes commands and only releases a lease held by the caller", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.store.acquire, { key: "test", token: "first" })).toBe(true);
    await t.mutation(internal.store.release, { key: "test", token: "other" });
    expect(
      await t.mutation(internal.store.acquire, {
        key: "test",
        token: "second",
      }),
    ).toBe(false);
    await t.mutation(internal.store.release, { key: "test", token: "first" });
    expect(
      await t.mutation(internal.store.acquire, {
        key: "test",
        token: "second",
      }),
    ).toBe(true);
  });
  it("keeps Jarvis room/name overrides when discovering devices again", async () => {
    const t = convexTest(schema, modules),
      { accountId } = await seed(t);
    await t.mutation(internal.store.syncDevices, {
      accountId,
      devices: [
        {
          externalId: "123",
          name: "Xiaomi name",
          model: "yeelink.light.color3",
          online: true,
        },
      ],
    });
    const result = await t.query(api.store.snapshot, { secret });
    expect(result.devices[0]).toMatchObject({
      name: "Desk light",
      room: "Office",
    });
  });
  it("persists hidden devices through discovery and restores them without a cloud command", async () => {
    const t = convexTest(schema, modules),
      { id, accountId } = await seed(t);
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(
      t.action(api.gateway.execute, {
        secret: "wrong",
        operation: { type: "visibility", id, hidden: true },
      }),
    ).rejects.toThrow("Unauthorized");
    await t.action(api.gateway.execute, {
      secret,
      operation: { type: "visibility", id, hidden: true },
    });
    await t.mutation(internal.store.syncDevices, {
      accountId,
      devices: [
        {
          externalId: "123",
          name: "Cloud name",
          model: "yeelink.light.color3",
          online: true,
        },
      ],
    });
    expect((await t.query(api.store.snapshot, { secret })).devices[0].hidden).toBe(true);
    await t.action(api.gateway.execute, {
      secret,
      operation: { type: "visibility", id, hidden: false },
    });
    expect((await t.query(api.store.snapshot, { secret })).devices[0].hidden).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("discovers fans, sends a MIoT command, and records confirmed state", async () => {
    const t = convexTest(schema, modules),
      { accountId } = await seed(t);
    const ids = await t.mutation(internal.store.syncDevices, {
      accountId,
      devices: [
        {
          externalId: "456",
          name: "Standing fan",
          model: "dmaker.fan.p18",
          online: true,
        },
      ],
    });
    const id = ids[0];
    const props = [
      [2, 1, true],
      [2, 10, 73],
      [2, 3, 1],
      [2, 4, true],
      [2, 5, 140],
      [2, 6, 0],
      [2, 7, false],
      [2, 8, false],
      [3, 1, false],
    ];
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          result: [{ did: "456", siid: 2, piid: 10, code: 0 }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          result: props.map(([siid, piid, value]) => ({
            did: "456",
            siid,
            piid,
            value,
            code: 0,
          })),
        }),
      );
    await expect(
      t.action(api.gateway.execute, {
        secret,
        operation: {
          type: "control",
          id,
          action: "speed",
          data: { speed: 73 },
        },
      }),
    ).resolves.toEqual({ ok: true });
    const snapshot = await t.query(api.store.snapshot, { secret });
    expect(snapshot.devices[0]).toMatchObject({
      kind: "fan",
      online: true,
      state: { speed: 73, mode: "natural" },
    });
    expect(snapshot.activity[0].label).toBe("Fan speed changed");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toEqual(expect.stringContaining("/miotspec/prop/set"));
    await expect(
      t.action(api.gateway.execute, {
        secret,
        operation: { type: "saveScene", id, name: "Invalid" },
      }),
    ).rejects.toThrow("Choose a light");
  });
  it("disconnect clears accounts, login attempts and devices", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await t.mutation(internal.store.putLogin, {
      key: "pending",
      encryptedSession: "test",
      expires: Date.now() + 1000,
    });
    await t.action(api.gateway.execute, {
      secret,
      operation: { type: "disconnect" },
    });
    const result = await t.query(api.store.snapshot, { secret });
    expect(result.connected).toBe(false);
    expect(result.devices).toEqual([]);
    expect(await t.query(internal.store.login, { key: "pending" })).toBe(null);
  });
  it("bounds owner login attempts atomically", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 10; i++)
      expect(
        await t.mutation(internal.store.rateLimit, {
          key: "owner-login",
          max: 10,
          window: 300000,
        }),
      ).toBe(true);
    expect(
      await t.mutation(internal.store.rateLimit, {
        key: "owner-login",
        max: 10,
        window: 300000,
      }),
    ).toBe(false);
  });
});
