import { test, expect, card } from "./fixtures";

test("all common controls are exposed and route to the correct device", async ({
  page,
  simulation,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  const light = card(page, "Ceiling light");
  const bedroom = card(page, "Bedside lamp");
  await expect(fan.getByRole("slider", { name: "Fan speed" })).toBeVisible();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).toBeVisible();
  await expect(light.getByRole("slider", { name: "Brightness" })).toBeVisible();
  await expect(bedroom.getByRole("switch", { name: "Light power" })).toBeVisible();
  await expect(bedroom.getByRole("slider")).toHaveCount(0);
  await expect(fan.getByRole("button", { name: "Set off timer", exact: true })).not.toBeVisible();
  await fan.getByRole("slider", { name: "Fan speed" }).press("ArrowRight");
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ id: "fixture-fan", action: "speed", data: { speed: 46 } });
  await expect(fan.getByRole("slider", { name: "Fan speed" })).toHaveValue("46");
  await light.getByRole("slider", { name: "Brightness" }).press("ArrowRight");
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-light",
      action: "brightness",
      data: { brightness: 76 },
    });
  await bedroom.getByRole("switch", { name: "Light power" }).click();
  await expect(bedroom.getByRole("slider", { name: "Brightness" })).toBeVisible();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-bedroom",
      action: "power",
      data: { on: true },
    });
  await bedroom.getByRole("slider", { name: "Brightness" }).press("End");
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-bedroom",
      action: "brightness",
      data: { brightness: 100 },
    });
  const ids = await page
    .locator("input[id]")
    .evaluateAll((inputs) => inputs.map((input) => input.id));
  expect(new Set(ids).size).toBe(ids.length);
  await page
    .getByRole("navigation", { name: "Filter by room" })
    .getByRole("button", { name: "Bedroom", exact: true })
    .click();
  await expect(fan).toHaveCount(0);
  await expect(bedroom).toBeVisible();
  expect(errors).toEqual([]);
});

test("light color, extras, scenes and device metadata remain available", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  const light = card(page, "Ceiling light");
  await light.getByRole("button", { name: "Color", exact: true }).click();
  await expect(light.getByRole("button", { name: "Color", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await light.getByRole("button", { name: "Set color #b871ff" }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-light",
      action: "color",
      data: { color: "#b871ff" },
    });
  await light.getByRole("button", { name: "White", exact: true }).click();
  await expect(light.getByRole("slider", { name: "Color temperature" })).toBeVisible();
  await light.getByText("More controls", { exact: true }).click();
  await light.getByRole("combobox", { name: "Transition", exact: true }).selectOption("2000");
  await light.getByRole("button", { name: "Breathe", exact: true }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({
      id: "fixture-light",
      action: "flow",
      data: { duration: 2000, count: 0 },
    });
  await light.getByRole("button", { name: "Save this light as a scene" }).click();
  await page.getByLabel("Scene name").fill("Reading");
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Scenes", exact: true })
    .click();
  await page.getByLabel("Apply scenes to").selectOption("fixture-bedroom");
  await page.getByRole("button", { name: /Unwind/ }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ id: "fixture-bedroom", action: "scene" });
  await expect(page.getByRole("button", { name: /Reading Saved light/ })).toBeVisible();
  await page.getByRole("button", { name: "Delete Reading" }).click();
  await expect(page.getByRole("button", { name: "Delete Reading" })).toHaveCount(0);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await card(page, "Ceiling light").getByText("More controls", { exact: true }).click();
  await card(page, "Ceiling light").getByRole("button", { name: "Device settings" }).click();
  await page.getByLabel("Device name").fill("Reading light");
  await page.getByLabel("Room", { exact: true }).fill("Study");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(card(page, "Reading light")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Filter by room" }).getByRole("button", { name: "Study" }),
  ).toBeVisible();
});

test("failed and pending commands stay honest and are never retried", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  simulation.failNext = true;
  await fan.getByRole("slider", { name: "Fan speed" }).press("ArrowRight");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Refresh before trying again",
  );
  await expect(fan.getByRole("slider", { name: "Fan speed" })).toHaveValue("45");
  expect(simulation.commands).toHaveLength(1);
  simulation.delay = 600;
  await fan.getByRole("switch", { name: "Oscillate" }).click();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).toBeDisabled();
  await expect(card(page, "Ceiling light").getByRole("switch")).toBeDisabled();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).not.toBeChecked();
  await expect(fan.getByRole("switch", { name: "Oscillate" })).toBeEnabled();
  expect(simulation.commands).toHaveLength(2);
});

test("responsive layout keeps controls readable from 320px to large desktop", async ({
  page,
  simulation,
}) => {
  void simulation;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/jarvis");
  for (const width of [320, 390, 760, 800, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 761 ? 844 : 1080 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(
      card(page, "Standing fan").getByRole("switch", { name: "Oscillate" }),
    ).toBeVisible();
    const navigation = page
      .getByRole("navigation", { name: "Main navigation" })
      .filter({ visible: true });
    await expect(navigation.getByRole("button", { name: "Home", exact: true })).toBeVisible();
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `/tmp/jarvis-redesign-${width}.png`,
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
});

test("sign-in displays server errors without navigating into a fixture session", async ({
  page,
}) => {
  let submitted = false;
  await page.route("**/api/jarvis", async (route) => {
    submitted = route.request().postDataJSON().type === "login";
    await route.fulfill({
      status: 401,
      json: { error: "Incorrect passphrase." },
    });
  });
  await page.goto("/jarvis/sign-in");
  await page.getByLabel("Owner passphrase").fill("not-a-real-passphrase");
  await page.getByRole("button", { name: "Enter your home" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect passphrase.");
  await expect(page.getByRole("button", { name: "Enter your home" })).toBeEnabled();
  expect(submitted).toBe(true);
});
