import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@personal/convex";

const convexUrl = readFileSync(new URL("../../.env.local", import.meta.url), "utf8").match(
  /^(?:NEXT_PUBLIC|VITE)_CONVEX_URL=(.+)$/m,
)?.[1];

const title = "Niño Mollaneda | JuiceColored";
const description = "Thoughtful web apps, product systems, and useful tools by Niño Mollaneda.";
const ogImage = "https://u87gtvu295.ufs.sh/f/mqA1Bp30wBSQORFFqRGdzqpZveMfBuro8yLwXgIcQ9YsF2PU";

const chapters = [
  "Cover",
  "An introduction",
  "Independent builds",
  "The studio",
  "Mithi & Kamit",
  "Small pleasures",
  "The next chapter",
];

test("server-renders the portfolio with its metadata", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toContain("Switched to client rendering");
  expect(html).toContain('<html lang="en"');
  expect(html).toContain("THE COLLECTED WORK OF NIÑO MOLLANEDA");
  expect(html).toContain("Good food.");
  expect(html).toContain('aria-label="Portfolio book"');
});

test("server-renders live Convex data", async ({ request }) => {
  test.skip(!convexUrl, "No Convex URL configured");
  const convex = new ConvexHttpClient(convexUrl!);
  const [listening, food] = await Promise.all([
    convex.query(api.listening.get, {}),
    convex.query(api.food.recent, {}),
  ]);
  const html = await (await request.get("/")).text();
  if (listening) {
    expect(html).toContain(listening.trackName.replaceAll("&", "&amp;"));
    expect(html).toContain(listening.isPlaying ? "LISTENING NOW" : "ON THE PLAYLIST");
  }
  for (const index of food.slice(0, 5).keys()) expect(html).toContain(`Recent meal ${index + 1}`);
});

test("exposes head metadata and icons", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(title);
  const meta = (selector: string) => page.locator(selector).getAttribute("content");
  expect(await meta('meta[name="description"]')).toBe(description);
  expect(await meta('meta[name="viewport"]')).toBe("width=device-width, initial-scale=1");
  expect(await meta('meta[property="og:type"]')).toBe("website");
  expect(await meta('meta[property="og:url"]')).toBe("https://juicecolored.com");
  expect(await meta('meta[property="og:title"]')).toBe(title);
  expect(await meta('meta[property="og:description"]')).toBe(description);
  expect(await meta('meta[property="og:image"]')).toBe(ogImage);
  expect(await meta('meta[property="og:image:width"]')).toBe("1200");
  expect(await meta('meta[property="og:image:height"]')).toBe("630");
  expect(await meta('meta[property="og:image:alt"]')).toBe(
    "Niño Mollaneda portfolio preview for JuiceColored",
  );
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  expect(await meta('meta[name="twitter:title"]')).toBe(title);
  expect(await meta('meta[name="twitter:description"]')).toBe(description);
  expect(await meta('meta[name="twitter:image"]')).toBe(ogImage);
  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveAttribute(
    "sizes",
    "any",
  );
  await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveAttribute(
    "type",
    "image/svg+xml",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.json");
});

test("serves public assets", async ({ request }) => {
  for (const path of [
    "/favicon.ico",
    "/favicon.svg",
    "/apple-touch-icon.png",
    "/logo192.png",
    "/logo512.png",
    "/manifest.json",
    "/robots.txt",
    "/portfolio/aiyos.jpg",
    "/portfolio/mithi.jpg",
    "/portfolio/kamit.jpg",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
  expect((await (await request.get("/manifest.json")).json()).short_name).toBe("JuiceColored");
});

test("hydrates without errors and loads Vercel Analytics", async ({ page }) => {
  const errors: string[] = [];
  // Development builds load the debug script from Vercel's CDN.
  const analytics = page.waitForRequest((request) =>
    /\/_vercel\/insights\/script\.js|va\.vercel-scripts\.com\//.test(request.url()),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // Analytics only resolves on Vercel.
    if (
      message.type() === "error" &&
      !/\/_vercel\/|va\.vercel-scripts\.com/.test(message.location().url)
    )
      errors.push(`${message.text()} ${message.location().url}`);
  });
  // Interactions need hydration.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(page.locator("#chapter-label")).toHaveText("AN INTRODUCTION");
  await analytics;
  expect(errors).toEqual([]);
});

test("applies site fonts and page colors", async ({ page }) => {
  await page.goto("/");
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { background: style.backgroundColor, color: style.color, font: style.fontFamily };
  });
  expect(body).toEqual({
    background: "rgb(250, 250, 247)",
    color: "rgb(16, 16, 16)",
    font: expect.stringContaining("DM Sans"),
  });
});

test("turns spreads with buttons, keys and the contents menu", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const label = page.locator("#chapter-label");
  const counter = page.locator(".reader-controls [aria-live]");
  await expect(label).toHaveText("COVER");
  await expect(counter).toHaveText("01 / 07");
  await expect(page.getByRole("button", { name: "Previous spread" })).toBeDisabled();

  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(label).toHaveText("AN INTRODUCTION");
  await expect(counter).toHaveText("02 / 07");

  await page.keyboard.press("ArrowRight");
  await expect(label).toHaveText("INDEPENDENT BUILDS");
  await page.keyboard.press("End");
  await expect(label).toHaveText("THE NEXT CHAPTER");
  await expect(page.getByRole("button", { name: "Next spread" })).toBeDisabled();
  await page.keyboard.press("Home");
  await expect(label).toHaveText("COVER");

  const contents = page.getByRole("button", { name: /Contents/ });
  await contents.click();
  await expect(contents).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation", { name: "Book contents" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button")).toHaveText(
    chapters.map((name, index) => `${name}${String(index + 1).padStart(2, "0")}`),
  );
  await nav.getByRole("button", { name: /Small pleasures/ }).click();
  await expect(label).toHaveText("SMALL PLEASURES");
  await expect(nav).toBeHidden();
  await expect(page.locator("#small-pleasures")).not.toHaveAttribute("inert");

  await contents.click();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(contents).toBeFocused();

  await page
    .getByRole("link", { name: /JuiceColored/ })
    .first()
    .click();
  await expect(label).toHaveText("COVER");
});

test("renders each spread identically", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (const [index, name] of chapters.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Next spread" }).click();
    await expect(page.locator("#chapter-label")).toHaveText(name.toUpperCase());
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`spread-${index + 1}.png`, {
      // Live Convex data changes between runs.
      mask: [page.locator(".music-note"), page.locator(".food-gallery")],
      animations: "disabled",
    });
  }
});
