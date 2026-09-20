import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Snapshot, FanDevice } from "../../src/lib/domain";

test("fan controls, hiding the selected device, restoring it and mobile layout", async ({
  page,
}) => {
  test.setTimeout(60000);
  const password = readFileSync(".env.credentials.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith("JARVIS_OWNER_PASSPHRASE="))!
    .split("=")[1];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/jarvis");
  await page.getByLabel("Welcome home").fill(password);
  await page.getByRole("button", { name: "Enter your home" }).click();
  await expect(page.getByRole("heading", { name: "Everything, just right." })).toBeVisible();
  const fan: FanDevice = {
    id: "test-fan",
    name: "Standing fan",
    room: "Living room",
    kind: "fan",
    provider: "xiaomi",
    model: "dmaker.fan.p18",
    online: true,
    updatedAt: Date.now(),
    capabilities: ["power", "speed", "oscillation", "fanMode", "timer"],
    state: {
      power: true,
      speed: 60,
      mode: "natural",
      oscillating: true,
      angle: 140,
      offInMinutes: 0,
      indicator: false,
      sound: false,
      childLock: false,
    },
  };
  const state: Snapshot = {
    connected: true,
    region: "sg",
    devices: [fan],
    scenes: [],
    activity: [],
  };
  const commands: Record<string, unknown>[] = [];
  await page.route("**/jarvis/api/jarvis", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: state });
    const op = route.request().postDataJSON();
    commands.push(op);
    if (op.type === "visibility") fan.hidden = op.hidden;
    if (op.type === "control") {
      if (op.action === "speed") fan.state.speed = op.data.speed;
      if (op.action === "fanMode") fan.state.mode = op.data.mode;
      if (op.action === "oscillation") fan.state.oscillating = op.data.on;
      if (op.action === "timer") fan.state.offInMinutes = op.data.minutes;
      fan.updatedAt++;
    }
    return route.fulfill({ json: { ok: true } });
  });
  await expect(page.getByRole("heading", { name: "Standing fan", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole("button", { name: /Unwind/ })).toHaveCount(0);
  await page.getByRole("slider", { name: "Fan speed" }).press("ArrowRight");
  await expect.poll(() => fan.state.speed).toBe(61);
  await page.getByLabel("Wind mode", { exact: true }).selectOption("straight");
  await expect.poll(() => fan.state.mode).toBe("straight");
  await page.getByRole("switch", { name: "Oscillation" }).click();
  await expect.poll(() => fan.state.oscillating).toBe(false);
  await page.getByRole("button", { name: "Set off timer", exact: true }).click();
  await expect.poll(() => fan.state.offInMinutes).toBe(60);
  await page.screenshot({
    path: "/tmp/jarvis-fan-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Device settings" }).click();
  await page.getByRole("button", { name: "Hide device", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Standing fan", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Manage hidden devices" }).click();
  await page.getByRole("button", { name: "Restore Standing fan" }).click();
  await expect(page.getByRole("button", { name: "Restore Standing fan" })).toHaveCount(0);
  await page
    .getByRole("button", { name: /Devices/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Standing fan", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("switch", { name: "Fan power" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "/tmp/jarvis-fan-mobile.png", fullPage: true });
  expect(commands.filter((c) => c.type === "control")).toHaveLength(4);
  expect(errors).toEqual([]);
});
