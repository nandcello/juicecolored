import { expect, test, type Page } from "@playwright/test";

async function scene(page: Page) {
  return page.locator(".cuppy-scene").evaluate((element: HTMLElement) => ({
    phase: element.dataset.phase,
    stretch: Number(element.dataset.stretch),
    drawn: Number(element.dataset.drawn),
    cupTop: Number(element.dataset.cupTop),
    cupBottom: Number(element.dataset.cupBottom),
    visible: window.innerHeight,
  }));
}

/** Counts animation frames the page asks for over `ms`, by wrapping requestAnimationFrame. */
async function framesIn(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    let count = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      count += 1;
      return original.call(window, callback);
    };
    await new Promise((resolve) => setTimeout(resolve, duration));
    window.requestAnimationFrame = original;
    return count;
  }, ms);
}

async function scrollToFraction(page: Page, fraction: number) {
  await page.evaluate((f) => {
    window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f);
  }, fraction);
}

test("serves the Cuppy concept with one art-directed cream and no in-page controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/cuppy");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Cuppy — The scoop that stretches (concept)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The scoop that\s+stretches\./i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("img", { name: /vanilla soft-serve swirl/ })).toBeVisible();

  // No flavor choice and no motion switch anywhere: the page follows the OS setting.
  const cuppy = page.locator(".cuppy");
  await expect(cuppy.getByRole("radio")).toHaveCount(0);
  await expect(cuppy.getByRole("group")).toHaveCount(0);
  await expect(cuppy.getByRole("button")).toHaveCount(0);
  await expect(cuppy.getByText(/flavor|chocolate|caramel/i)).toHaveCount(0);

  // Keyboard order is just the two Instagram links.
  const links = page.getByRole("link", { name: /Follow @cuppyicecream/ });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", "https://www.instagram.com/cuppyicecream/");
  }
  await page.keyboard.press("Tab");
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(links.last()).toBeFocused();
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
  // The cream left in the cup has been drawn out into the strand...
  expect((await scene(page)).drawn).toBe(1);

  // Scrolling back reassembles it.
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await scene(page)).drawn).toBeLessThan(1);
  expect((await scene(page)).drawn).toBeGreaterThan(0.4);
  await scrollToFraction(page, 0);
  await expect.poll(async () => (await scene(page)).phase).toBe("rest");
  // ...and fills back up on the way back.
  expect((await scene(page)).drawn).toBe(0);
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
  await expect(page.getByText("Still going.")).toBeHidden();
  await expect(page.getByText("As long as the spoon keeps going.")).toBeVisible();
});

test("Cuppy honors reduced motion from the first paint with a composed still", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  // Records any canvas ever mounted in the scroll layer, however briefly.
  await context.addInitScript(() => {
    const flags = window as unknown as { cuppyScrollCanvas?: boolean };
    new MutationObserver(() => {
      if (document.querySelector(".cuppy-scene canvas")) flags.cuppyScrollCanvas = true;
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".cuppy").getByRole("button")).toHaveCount(0);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-motion", "still");
  await expect(page.locator(".cuppy-stage canvas")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(".cuppy-scene")).toBeHidden();
  await expect(page.locator(".cuppy-scene canvas")).toHaveCount(0);
  // Copy and layout for a read, not a pull: no empty animation-only scroll.
  await expect(page.getByText("Still going.")).toBeHidden();
  await expect(page.getByText("Keep scrolling. It keeps up.")).toBeHidden();
  await expect(page.getByText("As long as the spoon keeps going.")).toBeVisible();
  const height = await page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
  expect(height).toBeLessThan(4);
  await expect(page.locator(".cuppy-sparkle").first()).toHaveCSS("animation-name", "none");
  // The scroll scene never started, not even for a frame before hydration.
  expect(
    await page.evaluate(
      () => (window as unknown as { cuppyScrollCanvas?: boolean }).cuppyScrollCanvas ?? false,
    ),
  ).toBe(false);
  await context.close();
});

test("Cuppy follows a motion preference change while open, both ways, with one scene", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cuppy");
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await scene(page)).phase).toBe("stretch");

  for (let round = 0; round < 2; round++) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".cuppy")).toHaveAttribute("data-motion", "still");
    await expect(page.locator(".cuppy-scene")).toBeHidden();
    await expect(page.locator(".cuppy-stage[data-status='live'] canvas")).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByText("Still going.")).toBeHidden();
    // The still draws on demand only: no frame loop keeps running.
    expect(await framesIn(page, 600)).toBe(0);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", {
      timeout: 30_000,
    });
    await expect(page.locator(".cuppy-scene canvas")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByText("Still going.")).toBeVisible();
  }
  // One idle loop, not one per preference change (about 60 frames a second, not a multiple).
  expect(await framesIn(page, 1000)).toBeLessThan(90);
  expect(errors).toEqual([]);
});

test("Cuppy without script shows the still poster and a readable page", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  await expect(page.locator(".cuppy-poster")).toBeVisible();
  await expect(page.locator(".cuppy-scene")).toBeHidden();
  await expect(page.getByText("Still going.")).toBeHidden();
  await expect(page.getByText("As long as the spoon keeps going.")).toBeVisible();
  await context.close();
});

test("Cuppy keeps the phone layout clear of leftover controls", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}/cuppy`);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect(page.locator(".cuppy").locator("fieldset, input, button")).toHaveCount(0);
  const cta = page.getByRole("link", { name: /Follow @cuppyicecream/ }).first();
  await cta.scrollIntoViewIfNeeded();
  const box = await cta.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(
    0,
  );
  await context.close();
});
