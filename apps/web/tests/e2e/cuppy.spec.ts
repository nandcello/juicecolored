import { expect, test, type Page } from "@playwright/test";

/** The concept lives under /concepts; the old /cuppy entry redirects here. */
const CUPPY_PATH = "/concepts/cuppy";

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

/**
 * Reads the first viewport's pixels around the hero word: the pure-lavender
 * band directly above its glyphs, shadow-tinted pixels inside the word, and
 * the shadow present above the band. Pixels next to ink (glyph and label
 * edges) are ignored, so only the cast shadow counts as tint.
 */
async function heroClearance(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0);
    const W = canvas.width;
    const data = ctx.getImageData(0, 0, W, canvas.height).data;
    const dpr = W / innerWidth;
    const word = document.querySelector(".cuppy-title-word")!.getBoundingClientRect();
    const stage = document.querySelector(".cuppy-stage")!.getBoundingClientRect();
    const x0 = Math.max(0, Math.round((stage.left + stage.width * 0.15) * dpr));
    const x1 = Math.min(W, Math.round((stage.right - stage.width * 0.15) * dpr));
    const lum = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    };
    const lavender = 0.2126 * 195 + 0.7152 * 151 + 0.0722 * 196;
    const R = Math.ceil(1.5 * dpr);
    const isInk = (x: number, y: number) => lum(x, y) < 70;
    const nearInk = (x: number, y: number) => {
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= x0 && xx < x1 && yy >= 0 && yy < canvas.height && isInk(xx, yy)) return true;
        }
      return false;
    };
    const row = (y: number) => {
      let ink = 0;
      let tint = 0;
      for (let x = x0; x < x1; x++) {
        if (isInk(x, y)) ink++;
        else if (lum(x, y) < lavender - 5 && !nearInk(x, y)) tint++;
      }
      return { ink, tint };
    };
    let glyphTop = -1;
    for (let y = Math.round((word.top - 8) * dpr); y < word.bottom * dpr; y++) {
      if (row(y).ink > 4) {
        glyphTop = y;
        break;
      }
    }
    let clear = 0;
    for (let y = glyphTop - 1; y > 0; y--) {
      const r = row(y);
      if (r.ink > 4 || r.tint > 6) break;
      clear++;
    }
    let tintAbove = 0;
    for (let y = glyphTop - clear - Math.round(40 * dpr); y < glyphTop - clear; y++)
      tintAbove += row(y).tint;
    let tintInWord = 0;
    for (let y = glyphTop; y < glyphTop + word.height * 0.8 * dpr; y++) tintInWord += row(y).tint;
    return { clearPx: clear / dpr, tintAbove, tintInWord };
  }, png);
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
  const response = await page.goto(CUPPY_PATH);
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

test("serves Cuppy at /concepts/cuppy, redirects only the old /cuppy entry, keeps its assets", async ({
  page,
  request,
}) => {
  const response = await page.goto(CUPPY_PATH);
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(CUPPY_PATH);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://juicecolored.com/concepts/cuppy",
  );

  // The old entry, with or without its slash, moves permanently and exactly.
  for (const old of ["/cuppy", "/cuppy/"]) {
    const moved = await request.get(old, { maxRedirects: 0 });
    expect(moved.status(), old).toBe(308);
    expect(new URL(moved.headers().location, "http://local").pathname, old).toBe(CUPPY_PATH);
  }
  // Public assets that share the old prefix stay where they are.
  for (const asset of ["/cuppy/poster-rest.webp", "/cuppy/poster-still.webp"]) {
    const served = await request.get(asset, { maxRedirects: 0 });
    expect(served.status(), asset).toBe(200);
    expect(served.headers()["content-type"], asset).toContain("image/webp");
  }
  expect((await request.get("/cuppy/not-a-page", { maxRedirects: 0 })).status()).toBe(404);

  // Posters resolve from the deeper route (absolute paths, not relative to the page).
  const poster = page.locator(".cuppy-stage picture img");
  await expect(poster).toHaveAttribute("src", "/cuppy/poster-rest.webp");
  await expect
    .poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
});

test("Cuppy plays the scoop and stretch from native scroll, and reverses", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(CUPPY_PATH);
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
  await page.goto(CUPPY_PATH);
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
  await page.goto(`${test.info().project.use.baseURL ?? ""}${CUPPY_PATH}`);
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
  await page.goto(CUPPY_PATH);
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
  await page.goto(`${test.info().project.use.baseURL ?? ""}${CUPPY_PATH}`);
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
  await page.goto(`${test.info().project.use.baseURL ?? ""}${CUPPY_PATH}`);
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

test("Cuppy gives the phone hero cup and shadow their own room above the word", async ({
  browser,
}) => {
  // Six fresh pages, four of them with a software-rendered WebGL scene.
  test.setTimeout(240_000);
  const base = test.info().project.use.baseURL ?? "";
  const refuseWebGL = () => {
    const prototype = HTMLCanvasElement.prototype;
    // oxlint-disable-next-line typescript/unbound-method
    prototype.getContext = new Proxy(prototype.getContext, {
      apply: (target, thisArg, args: unknown[]) =>
        String(args[0]).startsWith("webgl") ? null : Reflect.apply(target, thisArg, args),
    });
  };
  for (const [width, height] of [
    [360, 740],
    [390, 844],
  ]) {
    for (const variant of ["live", "poster", "reduced"] as const) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2,
        isMobile: true,
        reducedMotion: variant === "reduced" ? "reduce" : "no-preference",
      });
      if (variant === "poster") await context.addInitScript(refuseWebGL);
      const page = await context.newPage();
      await page.goto(`${base}${CUPPY_PATH}`);
      if (variant === "live") {
        await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", {
          timeout: 30_000,
        });
      } else if (variant === "reduced") {
        await expect(page.locator(".cuppy-stage")).toHaveAttribute("data-status", "live", {
          timeout: 30_000,
        });
      } else {
        await expect(page.locator(".cuppy-poster")).toBeVisible();
      }
      await page.waitForTimeout(800);
      const label = `${width}px ${variant}`;
      const clearance = await heroClearance(page);
      // Open lavender between the shadow and the letters, no shadow on them, and a shadow above.
      expect(clearance.clearPx, label).toBeGreaterThanOrEqual(20);
      expect(clearance.tintInWord, label).toBe(0);
      expect(clearance.tintAbove, label).toBeGreaterThan(200);

      if (variant === "live") {
        // While the word scrolls up under the still cup, the shadow steps aside and comes back.
        const shadow = () =>
          page.locator(".cuppy-scene").evaluate((element: HTMLElement) => element.dataset.shadow);
        await page.evaluate(() => window.scrollTo(0, 50));
        await expect.poll(shadow).toBe("0.00");
        await page.evaluate(() => window.scrollTo(0, 160));
        await expect.poll(shadow).toBe("1.00");
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(shadow).toBe("1.00");
      }
      await context.close();
    }
  }
});

/** The face as the scene last published it, plus the drawn and pure (scroll-only) signatures. */
async function face(page: Page, selector = ".cuppy-scene") {
  return page.locator(selector).evaluate((element: HTMLElement) => ({
    expression: element.dataset.expression,
    pose: element.dataset.pose,
    drawn: element.dataset.face,
  }));
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight - window.innerHeight),
  );
}

/** Waits until the page stops asking for frames, then returns two canvas samples 1.5 s apart. */
async function heldSamples(page: Page) {
  await expect.poll(() => framesIn(page, 400), { timeout: 15_000 }).toBe(0);
  const first = { state: await face(page), shot: await page.locator(".cuppy-scene").screenshot() };
  await page.waitForTimeout(1500);
  const frames = await framesIn(page, 1000);
  const second = { state: await face(page), shot: await page.locator(".cuppy-scene").screenshot() };
  return { first, second, frames };
}

test("Cuppy's face acts out the pull and holds one final reaction at the bottom", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(CUPPY_PATH);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
  const restPose = (await face(page)).pose;

  // Contact: the spoon digs in and the face reacts.
  const height = await page.evaluate(() => innerHeight);
  await page.evaluate((y) => window.scrollTo(0, y), height * 0.32);
  await expect.poll(async () => (await face(page)).expression).toBe("contact");
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await face(page)).expression).toBe("curious");

  // The bottom: one final reaction, held completely still.
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).expression).toBe("final");
  const held = await heldSamples(page);
  expect(held.frames).toBe(0);
  expect(held.second.state).toEqual(held.first.state);
  expect(held.second.shot.equals(held.first.shot)).toBe(true);

  // A pointer moving over the page does not stir it either.
  await page.mouse.move(200, 200);
  await page.mouse.move(1200, 700, { steps: 8 });
  const stirred = await heldSamples(page);
  expect(stirred.second.state).toEqual(held.first.state);
  expect(stirred.first.shot.equals(held.first.shot)).toBe(true);

  // Scrolling back up unfreezes it and retraces the beats to the calm first pose.
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await face(page)).expression).toBe("curious");
  expect(await framesIn(page, 500)).toBeGreaterThan(0);
  await page.evaluate((y) => window.scrollTo(0, y), height * 0.32);
  await expect.poll(async () => (await face(page)).expression).toBe("contact");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
  expect((await face(page)).pose).toBe(restPose);
  expect(errors).toEqual([]);
});

test("Cuppy's face lands the same after quick jumps and a resize", async ({ page }) => {
  await page.goto(CUPPY_PATH);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  // Stepping down and jumping straight there give the same final pose.
  for (const fraction of [0.2, 0.4, 0.6, 0.8]) await scrollToFraction(page, fraction);
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).expression).toBe("final");
  const stepped = (await face(page)).pose;
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).pose).toBe(stepped);

  // A jump back up lands on the same pose as arriving there from the top: no catch-up.
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await face(page)).expression).toBe("curious");
  const fromBelow = (await face(page)).pose;
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
  await scrollToFraction(page, 0.5);
  await expect.poll(async () => (await face(page)).pose).toBe(fromBelow);

  // Resized at the bottom, it settles back on the held final reaction.
  await scrollToBottom(page);
  await page.setViewportSize({ width: 1180, height: 820 });
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).expression).toBe("final");
  const resized = await heldSamples(page);
  expect(resized.frames).toBe(0);
  expect(resized.second.shot.equals(resized.first.shot)).toBe(true);
});

test("Cuppy's face holds still at the bottom on a touch phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL ?? ""}${CUPPY_PATH}`);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).expression).toBe("final");
  const held = await heldSamples(page);
  expect(held.frames).toBe(0);
  expect(held.second.shot.equals(held.first.shot)).toBe(true);
  // A tap is a pointer too; the final pose does not react to it.
  await page.touchscreen.tap(120, 300);
  const tapped = await heldSamples(page);
  expect(tapped.first.shot.equals(held.first.shot)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
  // Nothing scrolls sideways and the page scrolled natively: no scroll hijack.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await context.close();
});

test("Cuppy's still face follows a live reduced-motion change", async ({ page }) => {
  await page.goto(CUPPY_PATH);
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await scrollToBottom(page);
  await expect.poll(async () => (await face(page)).expression).toBe("final");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cuppy-stage[data-status='live'] canvas")).toHaveCount(1, {
    timeout: 30_000,
  });
  // One composed, expressive still: the glasses tipped and the eyes on the lifting spoon.
  await expect
    .poll(async () => (await face(page, ".cuppy-canvas-host")).expression)
    .toMatch(/^(scoop|lift)$/);
  expect(await framesIn(page, 600)).toBe(0);
  const still = await face(page, ".cuppy-canvas-host");
  await page.waitForTimeout(1200);
  expect(await face(page, ".cuppy-canvas-host")).toEqual(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".cuppy")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await face(page)).expression).toBe("rest");
});
