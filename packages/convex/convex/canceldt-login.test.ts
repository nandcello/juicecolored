// @vitest-environment node
/// <reference types="vite/client" />
import { scryptSync } from "node:crypto";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const password = "independent-canceldt-test-passphrase";
const secret = "independent-canceldt-test-gateway";
const salt = Buffer.alloc(16, 1);
const hash = scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
beforeEach(() => {
  vi.stubEnv("CANCELDT_LOGIN_SECRET", secret);
  vi.stubEnv("CANCELDT_PASSPHRASE_HASH", `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("accepts only the independent passphrase", async () => {
  const t = convexTest(schema, modules);
  expect(await t.action(api.canceldt.login.verify, { secret, password })).toBe(true);
  expect(
    await t.action(api.canceldt.login.verify, { secret, password: "home-controls-passphrase" }),
  ).toBe(false);
});
it("rejects direct access before consuming a login attempt and fails closed without config", async () => {
  const t = convexTest(schema, modules);
  await expect(t.action(api.canceldt.login.verify, { secret: "wrong", password })).rejects.toThrow(
    "access denied",
  );
  expect(await t.run((ctx) => ctx.db.query("canceldtLimits").take(1))).toEqual([]);
  vi.stubEnv("CANCELDT_PASSPHRASE_HASH", "");
  await expect(t.action(api.canceldt.login.verify, { secret, password })).rejects.toThrow(
    "not configured",
  );
});
it("limits attempts atomically and allows a new window after five minutes", async () => {
  const t = convexTest(schema, modules);
  vi.useFakeTimers();
  for (let i = 0; i < 10; i++) await t.mutation(internal.canceldt.loginLimit.reserve, {});
  await expect(t.mutation(internal.canceldt.loginLimit.reserve, {})).rejects.toThrow(
    "Too many sign-in attempts",
  );
  vi.advanceTimersByTime(300001);
  expect(await t.mutation(internal.canceldt.loginLimit.reserve, {})).toBeNull();
});
