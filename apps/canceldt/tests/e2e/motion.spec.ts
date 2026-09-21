import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/canceldt/report");
  await expect(page.getByRole("button", { name: "+ Add source" })).toBeVisible();
});

test("exiting sources immediately leave FormData and restore focus", async ({ page }) => {
  const add = page.getByRole("button", { name: "+ Add source" });
  await add.click();
  await page.getByLabel("Source 1 address").fill("https://example.com/removed");
  await add.click();
  await page.getByLabel("Source 2 address").fill("https://example.com/kept");
  // Freeze the cleanup timer so we inspect the actual exit, not just its result.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole("button", { name: "Remove source 1 ×" }).click();
  await expect(add).toBeFocused();
  await expect(page.locator(".source-row[data-exiting]")).toHaveAttribute("inert", "");
  expect(
    await page
      .locator("form.editor")
      .evaluate((form) => new FormData(form as HTMLFormElement).getAll("sourceUrl")),
  ).toEqual(["https://example.com/kept"]);
  // Adding while a row exits must not reuse its key or discard surviving values.
  await add.click();
  await page.clock.runFor(400);
  await expect(page.locator(".source-row")).toHaveCount(2);
  await expect(page.getByLabel("Source 1 address")).toHaveValue("https://example.com/kept");
  await expect(page.getByLabel("Source 2 address")).toHaveValue("");
});

test("keyboard source changes are immediate, including removal at the limit", async ({ page }) => {
  const add = page.getByRole("button", { name: "+ Add source" });
  for (let i = 0; i < 12; i++) await add.press("Enter");
  await expect(add).toBeDisabled();
  await expect(page.locator(".source-row")).toHaveCount(12);
  await expect(page.locator(".source-row").last()).toHaveCSS("transition-duration", "0s");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole("button", { name: "Remove source 12 ×" }).press("Enter");
  await expect(page.locator(".source-row")).toHaveCount(11);
  await expect(page.locator(".source-row[data-exiting]")).toHaveCount(0);
  await expect(add).toBeFocused();
  await expect(add).toBeEnabled();
});

test("reduced motion keeps gentle feedback without moving fields or buttons", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const add = page.getByRole("button", { name: "+ Add source" });
  await add.click();
  const row = page.locator(".source-row");
  await expect(row).toHaveCSS("transform", "none");
  await expect(row).toHaveCSS("transition-property", "opacity");
  await expect(row).toHaveCSS("transition-duration", "0.08s");
  await add.hover();
  await page.mouse.down();
  await expect(add).toHaveCSS("transform", "none");
  await expect(add).toHaveCSS("opacity", "0.8");
  await page.mouse.up();
  await expect(page.locator(".source-row")).toHaveCount(2);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
