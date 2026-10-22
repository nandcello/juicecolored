import { test, expect, card } from "./fixtures";

test("opening the dashboard replaces cached power with physical readings for all devices", async ({
  page,
  simulation,
}) => {
  simulation.physicalPower = {
    "fixture-fan": false,
    "fixture-light": false,
    "fixture-bedroom": true,
  };
  await page.goto("/jarvis");
  await expect(
    card(page, "Standing fan").getByRole("switch", { name: "Fan power" }),
  ).not.toBeChecked();
  await expect(
    card(page, "Ceiling light").getByRole("switch", { name: "Light power" }),
  ).not.toBeChecked();
  await expect(
    card(page, "Bedside lamp").getByRole("switch", { name: "Light power" }),
  ).toBeChecked();
  await expect.poll(() => simulation.reads.length).toBe(3);
  expect(simulation.commands).toEqual([]);
});

test("a failed physical read updates availability immediately and can recover through Check now", async ({
  page,
  simulation,
}) => {
  simulation.failedReads.add("fixture-fan");
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  await expect(fan.getByText("Current state unavailable", { exact: true })).toBeVisible();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeDisabled();
  await expect(fan.getByText("Last on", { exact: true })).toBeVisible();
  simulation.failedReads.clear();
  simulation.physicalPower["fixture-fan"] = false;
  await fan.getByRole("button", { name: "Refresh Standing fan", exact: true }).click();
  await expect(fan.getByRole("switch", { name: "Fan power" })).not.toBeChecked();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeEnabled();
  await expect(fan.getByText("Checked just now", { exact: true })).toBeVisible();
});

test("automatic checks pick up an external power change and do not send commands", async ({
  page,
  simulation,
}) => {
  await page.clock.install();
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  simulation.physicalPower["fixture-fan"] = false;
  await page.clock.fastForward(35000);
  await expect(
    card(page, "Standing fan").getByRole("switch", { name: "Fan power" }),
  ).not.toBeChecked();
  expect(simulation.commands).toEqual([]);
});

test("returning to the app checks devices again without waiting for the poll interval", async ({
  page,
  simulation,
}) => {
  await page.clock.install();
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  simulation.physicalPower["fixture-fan"] = false;
  await page.clock.fastForward(6000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    card(page, "Standing fan").getByRole("switch", { name: "Fan power" }),
  ).not.toBeChecked();
  expect(simulation.commands).toEqual([]);
});

test("an older snapshot arriving after a physical read cannot restore stale power", async ({
  page,
  simulation,
}) => {
  const old = structuredClone(simulation.state);
  let first = true;
  let release: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "GET" && first) {
      first = false;
      await delayed;
      await route.fulfill({ json: old });
    } else await route.fallback();
  });
  simulation.physicalPower["fixture-fan"] = false;
  await page.goto("/jarvis");
  const power = card(page, "Standing fan").getByRole("switch", { name: "Fan power" });
  await expect(power).not.toBeChecked();
  await expect.poll(() => simulation.reads.length).toBe(3);
  const response = page.waitForResponse(
    (r) => r.request().method() === "GET" && r.url().includes("/api/jarvis"),
  );
  release!();
  await response;
  await expect(power).not.toBeChecked();
  expect(simulation.commands).toEqual([]);
});

test("a successful database poll cannot hide a failed device read", async ({
  page,
  simulation,
}) => {
  await page.clock.install();
  await page.route("**/api/jarvis", async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON().type === "refresh" &&
      request.postDataJSON().id === "fixture-fan"
    )
      await route.abort("failed");
    else await route.fallback();
  });
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  await expect(fan.getByText("Current state unavailable", { exact: true })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.clock.fastForward(16000);
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeDisabled();
  await expect(fan.getByText("Last on", { exact: true })).toBeVisible();
  expect(simulation.state.devices[0].online).toBe(true);
  expect(simulation.commands).toEqual([]);
});

test("a device read without its resulting snapshot keeps the displayed state unverified", async ({
  page,
  simulation,
}) => {
  let reading = false;
  let dropSnapshot = true;
  await page.route("**/api/jarvis", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.postDataJSON().type === "refresh") reading = true;
    if (request.method() === "GET" && reading && dropSnapshot) await route.abort("failed");
    else await route.fallback();
  });
  simulation.physicalPower["fixture-fan"] = false;
  await page.goto("/jarvis");
  const fan = card(page, "Standing fan");
  await expect(fan.getByText("Current state unavailable", { exact: true })).toBeVisible();
  await expect(fan.getByText("Last on", { exact: true })).toBeVisible();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeDisabled();
  dropSnapshot = false;
  await fan.getByRole("button", { name: "Refresh Standing fan", exact: true }).click();
  await expect(fan.getByRole("switch", { name: "Fan power" })).not.toBeChecked();
  await expect(fan.getByRole("switch", { name: "Fan power" })).toBeEnabled();
});
