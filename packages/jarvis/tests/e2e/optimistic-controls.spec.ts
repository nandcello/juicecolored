import { test, expect, card, type Simulation } from "./fixtures";

function holdCommand(simulation: Simulation) {
  let release!: () => void;
  simulation.commandGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return release;
}

for (const fail of [false, true]) {
  test(`oscillation changes before the response, then ${fail ? "rolls back on failure" : "keeps confirmed state"}`, async ({
    page,
    simulation,
  }) => {
    await page.goto("/jarvis");
    await expect.poll(() => simulation.reads.length).toBe(3);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const release = holdCommand(simulation);
    simulation.failNext = fail;
    const toggle = card(page, "Standing fan").getByRole("switch", { name: "Oscillate" });
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeDisabled();
    await expect(
      card(page, "Standing fan").getByRole("status", { name: "Standing fan state" }),
    ).toContainText("Waiting for device confirmation");
    expect(simulation.state.devices.find((d) => d.kind === "fan")?.state).toMatchObject({
      oscillating: true,
    });
    await expect.poll(() => simulation.commands.length).toBe(1);
    release();
    if (fail) await expect(toggle).toBeDisabled();
    else await expect(toggle).toBeEnabled();
    await expect(toggle).toBeChecked({ checked: fail });
    await expect(
      card(page, "Standing fan").getByRole("status", { name: "Standing fan state" }),
    ).not.toContainText("Waiting for device confirmation");
    if (fail)
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Refresh before trying again",
      );
    expect(simulation.commands).toHaveLength(1);
    expect(errors.filter((text) => /optimistic|transition|React/i.test(text))).toEqual([]);
    await page.reload();
    await expect(toggle).toBeChecked({ checked: fail });
  });
}

test("an off light expands immediately but remains disabled until confirmed", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const release = holdCommand(simulation);
  const light = card(page, "Bedside lamp");
  const toggle = light.getByRole("switch", { name: "Light power" });
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(light.getByRole("slider", { name: "Brightness" })).toBeVisible();
  await expect(light.getByRole("slider", { name: "Brightness" })).toBeDisabled();
  expect(simulation.state.devices.find((d) => d.id === "fixture-bedroom")?.state.power).toBe(false);
  release();
  await expect(toggle).toBeEnabled();
  await expect(toggle).toBeChecked();
});

test("accepted but unconfirmed commands settle to reported state with a warning across reloads", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  const release = holdCommand(simulation);
  simulation.unconfirmedNext = true;
  const toggle = card(page, "Standing fan").getByRole("switch", { name: "Oscillate" });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  release();
  await expect(toggle).toBeEnabled();
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "reported setting has not changed",
  );
  await expect(
    card(page, "Standing fan").getByText("Setting not confirmed", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(toggle).toBeChecked();
  expect(simulation.commands).toHaveLength(1);
});

test("a lost response recovers server state without resending the command", async ({
  page,
  simulation,
}) => {
  await page.goto("/jarvis");
  await expect.poll(() => simulation.reads.length).toBe(3);
  simulation.loseNextResponse = true;
  const toggle = card(page, "Standing fan").getByRole("switch", { name: "Oscillate" });
  await toggle.click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(toggle).toBeDisabled();
  await expect(toggle).not.toBeChecked();
  expect(simulation.commands).toHaveLength(1);
});
