import { test, expect, card } from "./fixtures";

function gate() {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { waiting, release };
}

test("power changes immediately and stays pending through the confirmation snapshot", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const fan = card(page, "Standing fan");
  const power = fan.getByRole("switch", { name: "Fan power" });
  await expect(power).toBeEnabled();
  const command = gate(),
    snapshot = gate();
  let confirming = false;
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "POST") {
      await command.waiting;
      confirming = true;
    } else if (confirming) await snapshot.waiting;
    await route.fallback();
  });
  await power.click();
  await expect(power).not.toBeChecked();
  await expect(power).toHaveText("Off");
  await expect(power).toBeDisabled();
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Waiting for device confirmation",
  );
  expect(simulation.state.devices[0].state.power).toBe(true);
  command.release();
  await expect.poll(() => simulation.state.devices[0].state.power).toBe(false);
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Waiting for device confirmation",
  );
  snapshot.release();
  await expect(power).toBeEnabled();
  await expect(power).not.toBeChecked();
  await expect(fan.getByRole("status", { name: "Standing fan state" })).toContainText(
    "Checked just now",
  );
  expect(simulation.commands).toHaveLength(1);
});

test("a failed write rolls back optimistic power and marks the previous reading unverified", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const fan = card(page, "Standing fan");
  const power = fan.getByRole("switch", { name: "Fan power" });
  await expect(power).toBeEnabled();
  const command = gate();
  simulation.failNext = true;
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "POST") await command.waiting;
    await route.fallback();
  });
  await power.click();
  await expect(power).not.toBeChecked();
  command.release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Device did not confirm");
  await expect(power).toBeChecked();
  await expect(power).toHaveText("Last on");
  await expect(fan.getByRole("status", { name: "Standing fan state" })).not.toContainText(
    "Waiting for device confirmation",
  );
  expect(simulation.commands).toHaveLength(1);
});

test("a mode change is optimistic but an acknowledged mismatch restores the reported mode", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const light = card(page, "Ceiling light");
  const color = light.getByRole("button", { name: "Color", exact: true });
  await expect(color).toBeEnabled();
  const command = gate();
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "POST") {
      await command.waiting;
      // Delivery was acknowledged, but the bulb did not change its mode.
      await route.fulfill({ json: { ok: true } });
    } else await route.fallback();
  });
  await color.click();
  await expect(color).toHaveAttribute("aria-pressed", "true");
  await expect(light.getByRole("status", { name: "Ceiling light state" })).toContainText(
    "Waiting for device confirmation",
  );
  command.release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "requested change was not confirmed",
  );
  await expect(color).toHaveAttribute("aria-pressed", "false");
  await expect(light.getByRole("button", { name: "White", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("losing the confirmation snapshot clears optimistic state without repeating the write", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const power = card(page, "Standing fan").getByRole("switch", { name: "Fan power" });
  await expect(power).toBeEnabled();
  const command = gate();
  await page.route("**/api/jarvis", async (route) => {
    if (route.request().method() === "GET") await route.abort("failed");
    else {
      await command.waiting;
      await route.fallback();
    }
  });
  await power.click();
  await expect(power).not.toBeChecked();
  command.release();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(power).toBeChecked();
  await expect(power).toHaveText("Last on");
  expect(simulation.state.devices[0].state.power).toBe(false);
  expect(simulation.commands).toHaveLength(1);
});
