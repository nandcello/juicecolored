import { test, expect, card } from "./fixtures";

test("fan airflow, oscillation, advanced controls, hiding and restoring", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  await fan.getByRole("button", { name: "Natural", exact: true }).click();
  await expect(fan.getByRole("button", { name: "Natural", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-fan",
      action: "fanMode",
      data: { mode: "natural" },
    });
  await fan.getByRole("switch", { name: "Oscillate" }).click();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).not.toBeChecked();
  await fan.getByText("More controls", { exact: true }).click();
  await fan.getByLabel("Oscillation angle").selectOption("120");
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ action: "angle", data: { angle: 120 } });
  await fan.getByRole("button", { name: "Turn left" }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ action: "direction", data: { direction: "left" } });
  await fan.getByRole("button", { name: "Set off timer", exact: true }).click();
  await expect(fan.getByText("60 minutes remaining")).toBeVisible();
  await fan.getByRole("switch", { name: "Child lock" }).click();
  await expect(fan.getByRole("switch", { name: "Child lock" })).toBeChecked();
  await fan.getByRole("button", { name: "Device settings" }).click();
  await page.getByRole("button", { name: "Hide device", exact: true }).click();
  await expect(fan).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Restore Standing fan" }).click();
  await expect(page.getByRole("button", { name: "Restore Standing fan" })).toHaveCount(0);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(fan).toBeVisible();
  expect(simulation.commands.filter((op) => op.type === "control")).toHaveLength(6);
});

test("offline and unverified devices retain honest state and disabled controls", async ({
  page,
  simulation,
}) => {
  simulation.state.devices[0].online = false;
  simulation.state.devices[0].error = "Fan is not responding.";
  simulation.state.devices[1].updatedAt = 0;
  await page.goto("/jarvis");
  await card(page, "Standing fan").getByText("More controls", { exact: true }).click();
  await card(page, "Standing fan").getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(card(page, "Standing fan").getByText("Offline · last known state")).toBeVisible();
  await expect(
    card(page, "Standing fan").getByRole("switch", { name: "Fan power" }),
  ).toBeDisabled();
  await expect(card(page, "Standing fan").getByRole("switch", { name: "Fan power" })).toBeChecked();
  await expect(card(page, "Ceiling light").getByText("State not read yet")).toBeVisible();
  await expect(
    card(page, "Ceiling light").getByRole("slider", { name: "Brightness" }),
  ).toBeDisabled();
});

test("empty dashboard offers discovery and connection management", async ({ page, simulation }) => {
  simulation.state.devices = [];
  await page.goto("/jarvis");
  await card(page, "Standing fan").getByText("More controls", { exact: true }).click();
  await card(page, "Standing fan").getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bring your devices together" })).toBeVisible();
  await page.getByRole("button", { name: "Find my devices" }).click();
  await expect.poll(() => simulation.commands.at(-1)).toMatchObject({ type: "discover" });
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Account region" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
