import type { Page } from "@playwright/test";
import { test, expect, card } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("Jarvis can launch as an installed iOS web app", async ({ page, simulation }) => {
  void simulation;
  await page.goto("/jarvis");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Jarvis",
  );
});

async function installed(page: Page, mode: "ios" | "standard" = "ios") {
  await page.addInitScript((mode) => {
    if (mode === "ios") {
      Object.defineProperty(navigator, "standalone", { value: true });
    } else {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const result = original(query);
        if (query === "(display-mode: standalone)")
          Object.defineProperty(result, "matches", { value: true });
        return result;
      };
    }
  }, mode);
}

async function touch(
  page: Page,
  type: string,
  y: number,
  options: { x?: number; selector?: string; count?: number } = {},
) {
  return page.evaluate(
    ({ type, y, options }) => {
      const target = document.querySelector(options.selector ?? "h1")!;
      const touches =
        type === "touchend" || type === "touchcancel"
          ? []
          : Array.from(
              { length: options.count ?? 1 },
              (_, identifier) =>
                new Touch({ identifier, target, clientX: options.x ?? 100, clientY: y }),
            );
      return target.dispatchEvent(
        new TouchEvent(type, { bubbles: true, cancelable: true, touches }),
      );
    },
    { type, y, options },
  );
}

for (const mode of ["ios", "standard"] as const) {
  test(`installed ${mode} app reloads once after a native pull and release`, async ({
    page,
    simulation,
  }) => {
    void simulation;
    await installed(page, mode);
    await page.goto("/jarvis");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overscrollBehaviorY))
      .toBe("none");
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations++;
    });
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 150, y: 95 }],
    });
    for (const y of [105, 140, 190, 245])
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 150, y }],
      });
    await expect(page.getByText("Release to refresh", { exact: true })).toBeVisible();
    expect(navigations).toBe(0);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => navigations).toBe(1);
    await expect(page.getByRole("heading", { name: "My home" })).toBeVisible();
    expect(simulation.commands).toHaveLength(0);
  });
}

test("browser tabs keep their normal touch behavior", async ({ page, simulation }) => {
  void simulation;
  await page.goto("/jarvis");
  await touch(page, "touchstart", 100);
  expect(await touch(page, "touchmove", 260)).toBe(true);
  await expect(page.getByText("Release to refresh")).toHaveCount(0);
  await touch(page, "touchend", 260);
  expect(await page.evaluate(() => document.documentElement.style.overscrollBehaviorY)).toBe("");
});

test("short, cancelled, reversed, horizontal and multi-touch gestures do not reload", async ({
  page,
  simulation,
}) => {
  void simulation;
  await installed(page);
  await page.goto("/jarvis");
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  await touch(page, "touchstart", 100);
  expect(await touch(page, "touchmove", 150)).toBe(false);
  await expect(page.getByText("Pull to refresh", { exact: true })).toBeVisible();
  await touch(page, "touchend", 150);
  for (const cancel of ["touchcancel", "reverse", "horizontal", "multi"] as const) {
    await touch(page, "touchstart", 100);
    await touch(page, "touchmove", 260);
    await expect(page.getByText("Release to refresh")).toBeVisible();
    if (cancel === "touchcancel") await touch(page, "touchcancel", 260);
    if (cancel === "reverse") await touch(page, "touchmove", 140);
    if (cancel === "horizontal") await touch(page, "touchmove", 260, { x: 320 });
    if (cancel === "multi") await touch(page, "touchmove", 260, { count: 2 });
    await touch(page, "touchend", 260);
    await expect(page.getByText("Release to refresh")).toHaveCount(0);
  }
  expect(navigations).toBe(0);
});

test("scrolling, controls, dialogs and pending commands cannot trigger refresh", async ({
  page,
  simulation,
}) => {
  await installed(page);
  await page.goto("/jarvis");
  async function ignored(selector?: string) {
    await touch(page, "touchstart", 100, { selector });
    expect(await touch(page, "touchmove", 260, { selector })).toBe(true);
    await touch(page, "touchend", 260, { selector });
    await expect(page.getByText("Release to refresh")).toHaveCount(0);
  }
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await ignored();
  await page.evaluate(() => window.scrollTo(0, 0));
  await ignored('input[type="range"]');
  await ignored("button");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await ignored("dialog h2");
  await page.getByRole("button", { name: "Close dialog" }).click();
  simulation.delay = 800;
  await card(page, "Standing fan").getByRole("switch", { name: "Fan power" }).click();
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await ignored();
});
