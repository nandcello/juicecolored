import { expect, test, type Page } from "@playwright/test";

function heroPicker(page: Page) {
  return page.getByRole("group", { name: "Choose a flavor" });
}

async function scene(page: Page) {
  return page.locator(".cuppy-scene").evaluate((element: HTMLElement) => ({
    phase: element.dataset.phase,
    stretch: Number(element.dataset.stretch),
    cupTop: Number(element.dataset.cupTop),
    cupBottom: Number(element.dataset.cupBottom),
    visible: window.innerHeight,
  }));
}

async function scrollToFraction(page: Page, fraction: number) {
  await page.evaluate((f) => {
    window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f);
  }, fraction);
}

test("serves the Cuppy concept with a keyboard flavor picker", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/cuppy");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Cuppy — The scoop that stretches (concept)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The scoop that\s+stretches\./i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("img", { name: /3D render of a Cuppy paper cup/ })).toBeVisible();

  const vanilla = heroPicker(page).getByRole("radio", { name: "Vanilla" });
  await expect(vanilla).toBeChecked();
  await vanilla.focus();
  await page.keyboard.press("ArrowDown");
  await expect(heroPicker(page).getByRole("radio", { name: "Chocolate" })).toBeChecked();
  await expect(page.getByRole("heading", { level: 2, name: "Chocolate" })).toBeVisible();
  // The picker inside the pull follows, and drives the same flavor.
  const pull = page.getByRole("group", { name: "Pull another flavor" });
  await expect(pull.getByRole("radio", { name: "Chocolate" })).toBeChecked();
  await pull.getByRole("radio", { name: "Salted Caramel" }).check();
  await expect(heroPicker(page).getByRole("radio", { name: "Salted Caramel" })).toBeChecked();
  await expect(page.getByRole("link", { name: /Follow @cuppyicecream/ }).first()).toHaveAttribute(
    "href",
    "https://www.instagram.com/cuppyicecream/",
  );
  expect(errors).toEqual([]);
});

test("Cuppy plays the scoop and stretch from native scroll, and reverses", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cuppy");
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect.poll(async () => (await scene(page)).phase).toBe("rest");

  let previous = -1;
  for (const fraction of [0.08, 0.3, 0.6, 0.9, 1]) {
    await scrollToFraction(page, fraction);
    await expect.poll(async () => (await scene(page)).stretch).toBeGreaterThan(previous);
    const state = await scene(page);
    // The cup stays whole and on screen the entire way down.
    expect(state.cupTop).toBeGreaterThanOrEqual(0);
    expect(state.cupBottom).toBeLessThanOrEqual(state.visible);
    previous = state.stretch;
  }
  expect((await scene(page)).phase).toBe("stretch");
  expect(previous).toBe(1);

  // Scrolling back reassembles it.
  await scrollToFraction(page, 0);
  await expect.poll(async () => (await scene(page)).phase).toBe("rest");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(
    0,
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
  await expect(page.locator(".cuppy-scene")).toBeHidden();
  await expect(page.getByText("Still going.")).toHaveCount(0);
});

test("Cuppy honors reduced motion with a still pose and no scroll scene", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /motion/i })).toHaveCount(0);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-motion", "still");
  await expect(page.locator(".cuppy-stage canvas")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(".cuppy-scene")).toBeHidden();
  await expect(page.getByText("Still going.")).toHaveCount(0);
  await context.close();
});

test("Cuppy keeps both flavor pickers usable on a phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  for (const name of ["Choose a flavor", "Pull another flavor"]) {
    const chip = page.getByRole("group", { name }).locator(".cuppy-chip").nth(1);
    await chip.scrollIntoViewIfNeeded();
    const box = await chip.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(100);
    expect(box?.height ?? 0).toBeGreaterThan(60);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(
    0,
  );
  await context.close();
});
