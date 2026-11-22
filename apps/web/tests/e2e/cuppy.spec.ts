import { expect, test } from "@playwright/test";

test("serves the Cuppy concept with a keyboard flavor picker", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/cuppy");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Cuppy — The scoop that stretches (concept)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The scoop that\s+stretches\./i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("img", { name: /3D render of a Cuppy paper cup/ })).toBeVisible();

  const vanilla = page.getByRole("radio", { name: "Vanilla" });
  await expect(vanilla).toBeChecked();
  await vanilla.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Chocolate" })).toBeChecked();
  await expect(page.getByRole("heading", { level: 2, name: "Chocolate" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Follow @cuppyicecream/ }).first()).toHaveAttribute(
    "href",
    "https://www.instagram.com/cuppyicecream/",
  );
  expect(errors).toEqual([]);
});

test("Cuppy keeps a still product image without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype;
    // A test double that refuses every WebGL context, as a browser without WebGL would.
    // oxlint-disable-next-line typescript/unbound-method
    prototype.getContext = new Proxy(prototype.getContext, {
      apply: (target, thisArg, args: unknown[]) =>
        String(args[0]).startsWith("webgl") ? null : Reflect.apply(target, thisArg, args),
    });
  });
  await page.goto("/cuppy");
  await expect(page.locator(".cuppy-stage")).toHaveAttribute("data-status", "fallback");
  await expect(page.locator(".cuppy-poster")).toBeVisible();
});

test("Cuppy honors reduced motion without a pause control", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /motion/i })).toHaveCount(0);
  await context.close();
});
