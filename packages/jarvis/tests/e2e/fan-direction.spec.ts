import { test, expect, card } from "./fixtures";
import type { Page } from "@playwright/test";

async function alignUsingSavedMeasurement(page: Page) {
  await page.goto("/jarvis");
  await page.evaluate(() => localStorage.setItem("jarvis:fan-travel:v1:fixture-fan", "4"));
  const fan = card(page, "Standing fan");
  await fan.getByRole("switch", { name: "Oscillate" }).click();
  await fan.getByRole("button", { name: "Calibrate direction" }).click();
  await fan.getByRole("button", { name: "At left limit" }).click();
  return fan;
}

test("measure travel, drag to aim, and keep the estimate separate from oscillation width", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  const arc = fan.getByRole("slider", { name: "Fan direction", exact: true });
  await expect(arc).toHaveAttribute("aria-disabled", "true");
  await fan.getByRole("switch", { name: "Oscillate" }).click();
  await fan.getByRole("button", { name: "Calibrate direction" }).click();
  await fan.getByRole("button", { name: "Step left", exact: true }).click();
  await fan.getByRole("button", { name: "At left limit" }).click();
  for (let i = 1; i <= 4; i++) {
    await fan.getByRole("button", { name: "Step right", exact: true }).click();
    await expect(fan.getByText(`${i} right steps counted`, { exact: true })).toBeVisible();
  }
  await fan.getByRole("button", { name: "At right limit" }).click();
  await expect(arc).toHaveAttribute("aria-valuenow", "70");
  const before = simulation.commands.length;
  const box = (await arc.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.61);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.15, { steps: 5 });
  expect(simulation.commands).toHaveLength(before);
  await expect(fan.getByText("Target · 0°")).toBeVisible();
  await page.mouse.up();
  await expect(arc).toHaveAttribute("aria-disabled", "true");
  await expect(card(page, "Ceiling light").getByRole("switch")).toBeDisabled();
  await expect(arc).toHaveAttribute("aria-disabled", "false", { timeout: 10000 });
  await expect(arc).toHaveAttribute("aria-valuenow", "0");
  expect(simulation.commands.slice(before)).toEqual([
    { type: "control", id: "fixture-fan", action: "direction", data: { direction: "left" } },
    { type: "control", id: "fixture-fan", action: "direction", data: { direction: "left" } },
  ]);
  const fanState = simulation.state.devices[0];
  expect(fanState.kind === "fan" && fanState.state.angle).toBe(90);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1080 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width !== 320) await fan.screenshot({ path: `/tmp/jarvis-direction-${width}.png` });
  }
  await fan.getByRole("switch", { name: "Oscillate" }).click();
  await expect(arc).toHaveAttribute("aria-valuetext", "Not calibrated");
});

test("keyboard movement stops on failure and requires recalibration", async ({
  page,
  simulation,
}) => {
  const fan = await alignUsingSavedMeasurement(page);
  const arc = fan.getByRole("slider", { name: "Fan direction", exact: true });
  simulation.failNext = true;
  const before = simulation.commands.length;
  await arc.press("End");
  await expect(fan.getByRole("button", { name: "Calibrate direction" })).toBeEnabled();
  await expect(arc).toHaveAttribute("aria-valuetext", "Not calibrated");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("did not confirm");
  expect(simulation.commands).toHaveLength(before + 1);
});

test("keyboard bounds and cancelled touch drags do not send stray commands", async ({
  page,
  simulation,
}) => {
  const fan = await alignUsingSavedMeasurement(page);
  const arc = fan.getByRole("slider", { name: "Fan direction", exact: true });
  const before = simulation.commands.length;
  await arc.press("Home");
  await arc.press("ArrowLeft");
  expect(simulation.commands).toHaveLength(before);
  const box = (await arc.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + 20 }],
  });
  await expect(fan.getByText("Target · 0°")).toBeVisible();
  await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await touch.detach();
  expect(simulation.commands).toHaveLength(before);
  await expect(arc).toHaveAttribute("aria-valuenow", "-70");
  await arc.press("ArrowRight");
  await expect(arc).toHaveAttribute("aria-disabled", "false");
  await expect(arc).toHaveAttribute("aria-valuenow", "-35");
  expect(simulation.commands).toHaveLength(before + 1);
});

test("stop cancels the remaining steps; a new session only remembers the travel measurement", async ({
  page,
  simulation,
}) => {
  const fan = await alignUsingSavedMeasurement(page);
  const arc = fan.getByRole("slider", { name: "Fan direction", exact: true });
  const before = simulation.commands.length;
  await arc.press("End");
  await expect.poll(() => simulation.commands.length).toBe(before + 1);
  await fan.getByRole("button", { name: "Stop after this step" }).click();
  await expect(fan.getByRole("button", { name: "Calibrate direction" })).toBeEnabled();
  expect(simulation.commands).toHaveLength(before + 1);
  await page.reload();
  await expect(arc).toHaveAttribute("aria-valuetext", "Not calibrated");
  await fan.getByRole("button", { name: "Calibrate direction" }).click();
  await expect(fan.getByText("Using your saved measurement: 4 steps across 140°.")).toBeVisible();
});

test("leaving the controls cancels the sequence and manual nudges invalidate the estimate", async ({
  page,
  simulation,
}) => {
  const fan = await alignUsingSavedMeasurement(page);
  let arc = fan.getByRole("slider", { name: "Fan direction", exact: true });
  await fan.getByText("More controls", { exact: true }).click();
  await fan.getByRole("button", { name: "Turn left", exact: true }).click();
  await expect(arc).toHaveAttribute("aria-valuetext", "Not calibrated");
  await fan.getByRole("button", { name: "Calibrate direction" }).click();
  await fan.getByRole("button", { name: "At left limit" }).click();
  const before = simulation.commands.length;
  await arc.press("End");
  await expect.poll(() => simulation.commands.length).toBe(before + 1);
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Find devices", exact: true })).toBeEnabled();
  expect(simulation.commands).toHaveLength(before + 1);
  await page.getByRole("button", { name: "Home", exact: true }).first().click();
  arc = card(page, "Standing fan").getByRole("slider", { name: "Fan direction", exact: true });
  await expect(arc).toHaveAttribute("aria-valuetext", "Not calibrated");
});
