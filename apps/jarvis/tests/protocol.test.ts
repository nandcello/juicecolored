import { describe, expect, it, vi } from "vitest";
import {
  rc4,
  signedParams,
  b64,
  unb64,
  safeURL,
  XiaomiClient,
} from "../convex/adapters/vendor/xiaomi.mjs";
import { command, readLight, type CloudClient } from "../convex/adapters/yeelight";
import { seal, unseal, verifyPassword } from "../convex/crypto";
import { scryptSync } from "node:crypto";

describe("Yeelight and Xiaomi protocol boundary", () => {
  it("matches the RC4 reference vector and roundtrips Xiaomi dropped keystream", () => {
    const key = Uint8Array.from([1, 2, 3, 4, 5]);
    expect(Buffer.from(rc4(key, new Uint8Array(16), 0)).toString("hex")).toBe(
      "b2396305f03dc027ccc3524a0a1118a8",
    );
    const data = new TextEncoder().encode("light");
    expect(rc4(key, rc4(key, data))).toEqual(data);
  });
  it("binds encrypted RPC parameters to the path and nonce", async () => {
    const secret = b64(new Uint8Array(16).fill(7)),
      nonce = new Uint8Array(12);
    const a = await signedParams("/home/rpc/123", { method: "get_prop" }, secret, nonce),
      b = await signedParams("/home/device_list", { method: "get_prop" }, secret, nonce);
    expect(
      JSON.parse(
        new TextDecoder().decode(rc4(a.key, unb64((a.fields as Record<string, string>).data))),
      ),
    ).toEqual({ method: "get_prop" });
    expect(a.fields.signature).not.toBe(b.fields.signature);
  });
  it("rejects non-Xiaomi callbacks including userinfo, local addresses and lookalikes", () => {
    expect(safeURL("https://sgp.lp.account.xiaomi.com/lp/test").hostname).toBe(
      "sgp.lp.account.xiaomi.com",
    );
    for (const url of [
      "http://account.xiaomi.com",
      "https://account.xiaomi.com.evil.test",
      "https://127.0.0.1",
      "https://user:pass@account.xiaomi.com",
    ])
      expect(() => safeURL(url)).toThrow();
  });
  it("never follows redirects containing account credentials", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.test" },
      }),
    );
    const client = new XiaomiClient({
      userId: "test",
      serviceToken: "test-token",
      ssecurity: b64(new Uint8Array(16)),
      region: "sg",
    });
    await expect(client.api("/home/device_list", {})).rejects.toThrow("unexpected redirect");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.redirect).toBe("manual");
    fetch.mockRestore();
  });
  it("validates commands and uses an absolute power value instead of toggle", () => {
    expect(command("power", { on: false })).toEqual(["set_power", ["off", "smooth", 500]]);
    expect(command("scene", { mode: "color", color: "#ff7340", brightness: 15 })).toEqual([
      "set_scene",
      ["color", 16741184, 15],
    ]);
    for (const [name, value] of [
      ["brightness", { brightness: 101 }],
      ["temperature", { kelvin: 1699 }],
      ["color", { color: "red" }],
      ["timer", { minutes: 0 }],
      ["power", { on: 1 }],
      ["flow", { steps: [] }],
    ] as const)
      expect(() => command(name, value as never)).toThrow();
  });
  it("refuses partial or malformed state and normalizes valid properties", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue(["on", "65", "4000", "16777215", "0", "0", "2", "0", "30", "Bulb"]);
    expect(await readLight({ rpc } as unknown as CloudClient, "123")).toMatchObject({
      power: true,
      brightness: 65,
      mode: "white",
      offInMinutes: 30,
    });
    rpc.mockResolvedValue(["on"]);
    await expect(readLight({ rpc } as unknown as CloudClient, "123")).rejects.toThrow();
  });
});
describe("encrypted account state and owner login", () => {
  it("authenticates ciphertext and isolates the login/account contexts", () => {
    vi.stubEnv("XIAOMI_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const data = { serviceToken: "secret-test-token" },
      encrypted = seal(data, "xiaomi:account");
    expect(encrypted).not.toContain(data.serviceToken);
    expect(unseal(encrypted, "xiaomi:account")).toEqual(data);
    expect(() => unseal(encrypted, "xiaomi:login")).toThrow();
    const parts = encrypted.split("."),
      bytes = Buffer.from(parts[2], "base64");
    bytes[0] ^= 1;
    parts[2] = bytes.toString("base64");
    expect(() => unseal(parts.join("."), "xiaomi:account")).toThrow();
  });
  it("checks the salted owner passphrase and fails closed without configuration", () => {
    vi.stubEnv("JARVIS_PASSWORD_HASH", "salt:" + scryptSync("correct", "salt", 64).toString("hex"));
    expect(verifyPassword("correct")).toBe(true);
    expect(verifyPassword("incorrect")).toBe(false);
    vi.stubEnv("JARVIS_PASSWORD_HASH", "");
    expect(verifyPassword("correct")).toBe(false);
  });
});
