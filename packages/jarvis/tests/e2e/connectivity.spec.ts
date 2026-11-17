import { test, expect, card } from "./fixtures";

test("local controls and refresh remain available after Xiaomi cloud sign-in expires", async ({
  page,
  simulation,
}) => {
  simulation.state.requiresReconnect = true;
  for (const device of simulation.state.devices) device.transport = "local";
  await page.clock.install();
  await page.goto("/jarvis");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Local device controls continue to work",
  );
  await expect(card(page, "Standing fan").getByRole("switch", { name: "Fan power" })).toBeEnabled();
  await page.clock.fastForward(61000);
  await expect.poll(() => simulation.reads.length).toBeGreaterThan(0);
});

test("expired Xiaomi sessions lead to reconnect and stop automatic device reads", async ({
  page,
  simulation,
}) => {
  simulation.state.requiresReconnect = true;
  simulation.state.region = "de";
  for (const device of simulation.state.devices) {
    device.online = false;
    device.error = "Xiaomi sign-in is required. Reconnect your account in Settings.";
    simulation.failedReads.add(device.id);
  }
  await page.clock.install();
  await page.goto("/jarvis");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Refreshing cannot renew this session",
  );
  await expect(
    card(page, "Standing fan").getByRole("switch", { name: "Fan power" }),
  ).toBeDisabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  // The fixture's server-rendered snapshot predates expiry. Any startup read
  // fails; once the account snapshot arrives, no further cloud reads are sent.
  const attemptedReads = simulation.reads.length;
  await page.clock.fastForward(61000);
  expect(simulation.commands).toEqual([]);
  expect(simulation.reads).toHaveLength(attemptedReads);
  await page.getByRole("button", { name: "Reconnect Xiaomi Home", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Your Xiaomi connection" });
  await expect(dialog.getByLabel("Account region")).toHaveValue("de");
  await dialog.getByRole("button", { name: "Connect with Xiaomi Home" }).click();
  await expect
    .poll(() => simulation.commands.at(-1))
    .toMatchObject({ type: "startLogin", region: "de" });
});

test("a failed refresh immediately retrieves the account recovery state", async ({
  page,
  simulation,
}) => {
  await page.route("**/api/jarvis", async (route) => {
    const op = route.request().method() === "POST" ? route.request().postDataJSON() : null;
    if (op?.type !== "refresh") return route.fallback();
    simulation.state.requiresReconnect = true;
    for (const device of simulation.state.devices) device.online = false;
    return route.fulfill({
      status: 400,
      json: { error: "Xiaomi authorization expired. Reconnect your account." },
    });
  });
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  await fan.getByText("More controls", { exact: true }).click();
  await fan.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reconnect Xiaomi Home", exact: true }),
  ).toBeVisible();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeDisabled();
});
