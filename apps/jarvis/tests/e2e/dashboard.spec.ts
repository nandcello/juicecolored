import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Snapshot, LightDevice } from "../../src/lib/domain";
const password = readFileSync(".env.credentials.local", "utf8")
  .split("\n")
  .find((l) => l.startsWith("JARVIS_OWNER_PASSPHRASE="))!
  .split("=")[1];
test("owner sign-in, empty-state navigation, simulated bulb controls and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/jarvis");
  await expect(page.getByRole("heading", { name: "Your home. In harmony." })).toBeVisible();
  await page.getByLabel("Welcome home").fill(password);
  await page.getByRole("button", { name: "Enter your home" }).click();
  await expect(page.getByRole("heading", { name: "Everything, just right." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect a device" })).toBeVisible();
  await page.getByRole("button", { name: "Scenes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A mood for every moment." })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Xiaomi Home", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Devices", exact: false }).first().click();
  await page.screenshot({
    path: "/tmp/jarvis-dashboard-empty.png",
    fullPage: true,
  });
  // Fixture exists only in intercepted test responses, never in Convex or production code.
  const state: Snapshot & { devices: LightDevice[] } = {
    connected: true,
    region: "sg",
    scenes: [],
    activity: [],
    devices: [
      {
        id: "test-bulb",
        name: "Living room light",
        room: "Living room",
        kind: "light",
        provider: "xiaomi",
        model: "Yeelight 1S Color",
        online: true,
        capabilities: ["power", "brightness", "temperature", "color", "scenes", "effects", "timer"],
        updatedAt: Date.now(),
        state: {
          power: true,
          brightness: 65,
          kelvin: 2700,
          color: "#edba77",
          mode: "white",
          flowing: false,
          offInMinutes: 0,
        },
      },
    ],
  };
  const commands: Record<string, unknown>[] = [];
  await page.route("**/jarvis/api/jarvis", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: state });
    const op = route.request().postDataJSON();
    commands.push(op);
    if (op.type === "control") {
      if (op.action === "power") state.devices[0].state.power = op.data.on;
      if (op.action === "brightness") state.devices[0].state.brightness = op.data.brightness;
      if (op.action === "color") {
        state.devices[0].state.color = op.data.color;
        state.devices[0].state.mode = "color";
      }
      if (op.action === "scene") {
        state.devices[0].state = {
          ...state.devices[0].state,
          ...op.data,
          power: true,
        };
      }
      state.devices[0].updatedAt++;
    }
    return route.fulfill({ json: { ok: true } });
  });
  // The first normal snapshot poll installs the fixture.
  await expect(page.getByRole("heading", { name: "Living room light", exact: true })).toBeVisible({
    timeout: 20000,
  });
  const toggle = page.getByRole("switch", { name: "Light power" });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByLabel("Brightness", { exact: true })).toBeDisabled();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.getByLabel("Brightness", { exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => state.devices[0].state.brightness).toBe(66);
  await page.getByRole("button", { name: "Color", exact: true }).click();
  await page.getByRole("button", { name: "Set color #b871ff" }).click();
  await expect.poll(() => state.devices[0].state.color).toBe("#b871ff");
  await page.getByRole("button", { name: /Unwind/ }).click();
  await expect.poll(() => state.devices[0].state.brightness).toBe(35);
  await page.getByRole("button", { name: "Device settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "/tmp/jarvis-dashboard-fixture.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("switch", { name: "Light power" })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: "/tmp/jarvis-mobile-fixture.png",
    fullPage: true,
  });
  expect(commands.filter((c) => c.type === "control")).toHaveLength(5);
  expect(errors).toEqual([]);
});
