import { test, expect, card, gate, writes, type Simulation } from "./fixtures";
import type { Page } from "@playwright/test";
import type { FanState, LightState } from "../../domain";

async function ready(page: Page, simulation: Simulation) {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
const fanState = (simulation: Simulation) => simulation.state.devices[0].state as FanState;
const lightState = (simulation: Simulation) => simulation.state.devices[1].state as LightState;

test("a delayed fan save never freezes the light, the app, or the fan's own controls", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  const hold = gate();
  simulation.deviceGates["fixture-fan"] = hold.waiting;
  const fan = card(page, "Standing fan");
  const light = card(page, "Ceiling light");
  const speed = fan.getByRole("slider", { name: "Fan speed" });
  await speed.press("ArrowRight");
  // Reflected immediately, before anything is sent.
  await expect(speed).toHaveValue("46");
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Saving changes",
  );
  await expect.poll(() => writes(simulation, "fixture-fan").length).toBe(1);
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Waiting for device confirmation",
  );
  // The app is not in a loading state and the other device is untouched.
  await expect(fan).toHaveAttribute("aria-busy", "true");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
  await expect(light).toHaveAttribute("aria-busy", "false");
  const lightPower = light.getByRole("switch", { name: "Light power" });
  await expect(lightPower).toBeEnabled();
  await lightPower.click();
  await expect(lightPower).not.toBeChecked();
  await expect.poll(() => lightState(simulation).power).toBe(false);
  await expect(light.getByRole("status", { name: "Ceiling light state" })).toContainText(
    "Checked just now",
  );
  await expect(light).toHaveAttribute("aria-busy", "false");
  // The fan is still saving but remains editable.
  await expect(speed).toBeEnabled();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).toBeEnabled();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeEnabled();
  expect(fanState(simulation).speed).toBe(45);
  hold.release();
  await expect.poll(() => fanState(simulation).speed).toBe(46);
  await expect(fan).toHaveAttribute("aria-busy", "false");
  expect(writes(simulation)).toEqual([
    { type: "apply", id: "fixture-fan", settings: { speed: 46 } },
    { type: "apply", id: "fixture-light", settings: { power: false }, duration: 500 },
  ]);
});

test("a burst of partially overlapping adjustments becomes one change with the latest values", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  const fan = card(page, "Standing fan");
  const speed = fan.getByRole("slider", { name: "Fan speed" });
  const oscillate = fan.getByRole("switch", { name: "Oscillate" });
  for (const key of ["ArrowRight", "ArrowRight", "ArrowRight"]) await speed.press(key);
  await oscillate.click();
  await fan.getByRole("button", { name: "Natural", exact: true }).click();
  await speed.press("ArrowLeft");
  await oscillate.click();
  await oscillate.click();
  await fan.getByRole("button", { name: "Steady", exact: true }).click();
  await fan.getByRole("button", { name: "Natural", exact: true }).click();
  // Every tweak shows at once.
  await expect(speed).toHaveValue("47");
  await expect(oscillate).not.toBeChecked();
  await expect(fan.getByRole("button", { name: "Natural", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(writes(simulation)).toEqual([]);
  await expect.poll(() => writes(simulation).length).toBe(1);
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Checked just now",
  );
  expect(writes(simulation)).toEqual([
    {
      type: "apply",
      id: "fixture-fan",
      settings: { speed: 47, oscillating: false, mode: "natural" },
    },
  ]);
  expect(fanState(simulation)).toMatchObject({ speed: 47, oscillating: false, mode: "natural" });
  await page.waitForTimeout(1200);
  expect(writes(simulation)).toHaveLength(1);
});

test("edits made during an in-flight save are kept and sent as the next combined change", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  const hold = gate();
  simulation.deviceGates["fixture-fan"] = hold.waiting;
  const fan = card(page, "Standing fan");
  const speed = fan.getByRole("slider", { name: "Fan speed" });
  const oscillate = fan.getByRole("switch", { name: "Oscillate" });
  await speed.press("ArrowRight");
  await expect.poll(() => writes(simulation).length).toBe(1);
  // While the first save is in flight: more adjustments, including the same field.
  await speed.press("ArrowRight");
  await speed.press("ArrowRight");
  await oscillate.click();
  await page.waitForTimeout(900);
  await fan.getByRole("button", { name: "Natural", exact: true }).click();
  await page.waitForTimeout(900);
  expect(writes(simulation)).toHaveLength(1);
  await expect(speed).toHaveValue("48");
  delete simulation.deviceGates["fixture-fan"];
  hold.release();
  // The first acknowledgement must not pull the display back to its older value.
  await expect.poll(() => writes(simulation).length).toBe(2);
  await expect(speed).toHaveValue("48");
  await expect(oscillate).not.toBeChecked();
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Checked just now",
  );
  expect(writes(simulation).map((op) => op.settings)).toEqual([
    { speed: 46 },
    { speed: 48, oscillating: false, mode: "natural" },
  ]);
  await expect(speed).toHaveValue("48");
});

test("a stale snapshot and a late read cannot overwrite a newer confirmed change", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  const fan = card(page, "Standing fan");
  const speed = fan.getByRole("slider", { name: "Fan speed" });
  const stale = gate();
  let holdNext = true;
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "GET" && holdNext) {
      holdNext = false;
      // Captured before the change below, delivered after its confirmation.
      const old = structuredClone(simulation.state);
      await stale.waiting;
      return route.fulfill({ json: old });
    }
    await route.fallback();
  });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => holdNext).toBe(false);
  await speed.press("ArrowRight");
  await speed.press("ArrowRight");
  await expect.poll(() => fanState(simulation).speed).toBe(47);
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Checked just now",
  );
  stale.release();
  await page.waitForTimeout(300);
  await expect(speed).toHaveValue("47");
  // A device read that was queued behind the save reports the new state too.
  await fan.getByRole("button", { name: "Refresh Standing fan", exact: true }).click();
  await expect(
    fan.getByRole("status").filter({ hasText: "Standing fan refreshed." }),
  ).toBeVisible();
  await expect(speed).toHaveValue("47");
  expect(writes(simulation)).toHaveLength(1);
});

test("a failed save reconciles only that device, with device-local feedback, and is never resent", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  simulation.failDevices.add("fixture-fan");
  const fan = card(page, "Standing fan");
  const light = card(page, "Ceiling light");
  const power = fan.getByRole("switch", { name: "Fan power" });
  await power.click();
  await expect(power).not.toBeChecked();
  await expect(fan.getByRole("alert")).toContainText("Device did not confirm");
  // Rolled back to the confirmed state and marked as unverified.
  await expect(power).toBeChecked();
  await expect(power).toHaveText("Last on");
  await expect(power).toBeDisabled();
  // The other device shows no error and keeps working.
  await expect(light.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(1);
  const brightness = light.getByRole("slider", { name: "Brightness" });
  await expect(brightness).toBeEnabled();
  await brightness.press("ArrowRight");
  await expect.poll(() => lightState(simulation).brightness).toBe(76);
  // Recovery is an explicit read; the failed command is not repeated.
  await fan.getByRole("button", { name: "Refresh Standing fan", exact: true }).click();
  await expect(power).toBeEnabled();
  await expect(power).toBeChecked();
  await expect(fan.getByRole("alert")).toHaveCount(0);
  expect(writes(simulation, "fixture-fan")).toEqual([
    { type: "apply", id: "fixture-fan", settings: { power: false } },
  ]);
  await fan.getByRole("button", { name: "Dismiss Standing fan message" }).click();
  await expect(fan.getByRole("status").filter({ hasText: "refreshed" })).toHaveCount(0);
});

test("a failure during newer edits keeps the newer intent and sends it once", async ({
  page,
  simulation,
}) => {
  await ready(page, simulation);
  const hold = gate();
  simulation.deviceGates["fixture-fan"] = hold.waiting;
  simulation.failDevices.add("fixture-fan");
  const fan = card(page, "Standing fan");
  const speed = fan.getByRole("slider", { name: "Fan speed" });
  await speed.press("ArrowRight");
  await expect.poll(() => writes(simulation).length).toBe(1);
  await fan.getByRole("button", { name: "Natural", exact: true }).click();
  delete simulation.deviceGates["fixture-fan"];
  hold.release();
  await expect(fan.getByRole("alert")).toContainText("Device did not confirm");
  // The failed speed change rolls back; the newer airflow choice is still shown and sent.
  await expect.poll(() => writes(simulation).length).toBe(2);
  expect(writes(simulation).map((op) => op.settings)).toEqual([{ speed: 46 }, { mode: "natural" }]);
  await expect.poll(() => fanState(simulation).mode).toBe("natural");
  await expect(speed).toHaveValue("45");
  await expect(fan.getByRole("button", { name: "Natural", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("direction nudges stay one-off commands after earlier adjustments", async ({
  page,
  simulation,
}) => {
  fanState(simulation).oscillating = false;
  await ready(page, simulation);
  const fan = card(page, "Standing fan");
  await fan.getByText("More controls").click();
  await fan.getByLabel("Oscillation angle").selectOption("120");
  await fan.getByRole("button", { name: "Turn left" }).click();
  await expect(fan.getByRole("button", { name: "Turn left" })).toBeDisabled();
  await expect.poll(() => writes(simulation).length).toBe(2);
  expect(writes(simulation)).toEqual([
    { type: "apply", id: "fixture-fan", settings: { angle: 120 } },
    { type: "control", id: "fixture-fan", action: "direction", data: { direction: "left" } },
  ]);
  await expect(fan.getByRole("button", { name: "Turn left" })).toBeEnabled();
});
