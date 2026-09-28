import { test, expect, card } from "./fixtures";

test("Jarvis links and missing routes stay inside the feature root", async ({ page }) => {
  await page.goto("/jarvis/sign-in");
  await expect(page.getByRole("link", { name: "jarvis", exact: true })).toHaveAttribute(
    "href",
    "/jarvis",
  );
  await page.getByRole("link", { name: "jarvis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My home", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jarvis home", exact: true })).toHaveAttribute(
    "href",
    "/jarvis",
  );
  const response = await page.goto("/jarvis/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Jarvis · Home control");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  // The original app used Next's default missing-page UI, which supplies a white body.
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("activity, help, discovery, connection approval and disconnect cover every dashboard view", async ({
  page,
  simulation,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jarvis");
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
  await expect(page.getByText("No activity yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Help" })).toContainText("Connect your devices");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hidden devices" })).toBeVisible();
  simulation.state.activity.push({
    id: "fixture-activity",
    deviceName: "Standing fan",
    label: "Fan speed changed",
    status: "success",
    createdAt: 1789898400000,
  });
  await page.getByRole("button", { name: "Find devices", exact: true }).click();
  await expect.poll(() => simulation.commands.at(-1)).toMatchObject({ type: "discover" });
  await expect(page.getByRole("main")).toContainText("Device search complete.");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.getByRole("main")).not.toContainText("Device search complete.");
  await page.getByRole("main").getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByText("Fan speed changed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Success", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();

  await page.getByRole("button", { name: "Reconnect account", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Account region" }).selectOption("de");
  await dialog.getByRole("button", { name: "Connect with Xiaomi Home" }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ type: "startLogin", region: "de" });
  await expect(dialog.getByAltText("Scan this sign-in code using Xiaomi Home")).toBeVisible();
  await dialog.getByRole("button", { name: "I’ve scanned the code" }).click();
  await expect(dialog).toContainText("Waiting for approval.");
  await dialog.getByRole("button", { name: "Create a new code" }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ type: "startLogin", region: "de" });
  simulation.loginPending = false;
  await dialog.getByRole("button", { name: "I’ve scanned the code" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText("Xiaomi Home is connected.");

  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.keyboard.press("Escape");
  expect(simulation.commands.some((command) => command.type === "disconnect")).toBe(false);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await dialog.getByRole("button", { name: "Disconnect account", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Connect account", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find devices", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bring your devices together" })).toBeVisible();
  await page.getByRole("button", { name: "Connect Xiaomi Home", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(errors).toEqual([]);
});

test("remaining light and fan controls preserve their exact commands", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  const light = card(page, "Ceiling light");
  await light.getByRole("slider", { name: "Color temperature" }).press("ArrowRight");
  await expect.poll(() => simulation.commands.at(-1)).toMatchObject({ action: "temperature" });
  await light.getByRole("button", { name: "Color", exact: true }).click();
  await light.getByLabel("Custom color", { exact: true }).fill("#123456");
  await light.getByRole("button", { name: "Apply color", exact: true }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ action: "color", data: { color: "#123456" } });
  await light.getByText("More controls", { exact: true }).click();
  await light.getByRole("button", { name: "Sunset", exact: true }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ action: "flow", data: { count: 2, end: 2 } });
  await light.getByRole("button", { name: "Stop effect", exact: true }).click();
  await expect.poll(() => simulation.commands.at(-1)).toMatchObject({ action: "stopFlow" });
  await light.getByLabel("Off timer duration").selectOption("15");
  await light.getByRole("button", { name: "Set off timer", exact: true }).click();
  await expect(light).toContainText("Last reported timer: 15 minutes");
  await light.getByRole("button", { name: "Cancel timer", exact: true }).click();
  await expect(light).toContainText("No off timer set");
  await light.getByRole("button", { name: "Save power-on default", exact: true }).click();
  await expect.poll(() => simulation.commands.at(-1)).toMatchObject({ action: "default" });

  const fan = card(page, "Standing fan");
  await fan.getByRole("button", { name: "Steady", exact: true }).click();
  await fan.getByText("More controls", { exact: true }).click();
  await fan.getByRole("button", { name: "Turn right", exact: true }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ action: "direction", data: { direction: "right" } });
  await fan.getByLabel("Turn off after (minutes)").fill("481");
  await expect(fan.getByRole("button", { name: "Set off timer", exact: true })).toBeDisabled();
  await fan.getByLabel("Turn off after (minutes)").fill("15");
  await fan.getByRole("button", { name: "Set off timer", exact: true }).click();
  await expect(fan).toContainText("15 minutes remaining");
  await fan.getByRole("button", { name: "Cancel timer", exact: true }).click();
  await expect(fan).toContainText("No off timer set");
  for (const label of ["Indicator light", "Button sounds"]) {
    const control = fan.getByRole("switch", { name: label, exact: true });
    const checked = await control.isChecked();
    await control.click();
    await expect(control).toBeChecked({ checked: !checked });
  }
  await fan.getByRole("switch", { name: "Fan power", exact: true }).click();
  await expect(fan.getByRole("slider", { name: "Fan speed" })).toHaveCount(0);
  await fan.getByRole("switch", { name: "Fan power", exact: true }).click();
  await expect(fan.getByRole("slider", { name: "Fan speed" })).toBeVisible();
});
