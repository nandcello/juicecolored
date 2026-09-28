import { expect, test } from "@playwright/test";

for (const [path, title] of [
  ["/jarvis", "Jarvis · Home control"],
  ["/canceldt", "CANCELDT. — Check the list."],
] as const) {
  test(`serves ${path} in the shared Next app`, async ({ page, request }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    expect(response?.headers()["x-upstream-stub"]).toBeUndefined();
    const slash = await request.get(`${path}/`, { maxRedirects: 0 });
    expect(slash.status()).toBe(200);
    expect(slash.headers().location).toBeUndefined();
  });
}

test("redirects the misspelled CANCELDT admin path", async ({ request }) => {
  const response = await request.get("/calceldt/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, "http://local").pathname).toBe("/canceldt/admin");
});

test("preserves trailing-slash URLs without adding redirects", async ({ request }) => {
  const health = await request.get("/api/health/", { maxRedirects: 0 });
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  for (const [path, status] of [
    ["/api/spam/", 404],
    ["/unknown/", 404],
    ["/favicon.ico/", 200],
    ["/jarvis/not-a-real-page/", 404],
    ["/canceldt/admin/", 200],
  ] as const) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(status);
    expect(response.headers().location, path).toBeUndefined();
  }
  const unauthenticated = await request.post("/api/spam/", { maxRedirects: 0 });
  expect(unauthenticated.status()).toBe(401);
  expect((await unauthenticated.json()).error.code).toBe("UNAUTHORIZED");
});

test("keeps route scopes and API authorization separate", async ({ request }) => {
  expect((await request.get("/jarvisx")).status()).toBe(404);
  expect((await request.get("/canceldtx")).status()).toBe(404);
  expect((await request.get("/jarvis/api/jarvis")).status()).toBe(401);
  expect((await request.post("/canceldt/api/revalidate")).status()).toBe(401);
  expect((await request.get("/api/health")).status()).toBe(200);
});

test("unknown portfolio routes retain their document metadata", async ({ page }) => {
  const response = await page.goto("/unknown");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("404: This page could not be found.");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Niño Mollaneda | JuiceColored",
  );
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const [path, title, heading] of [
    ["/unknown", "404: This page could not be found.", "404"],
    ["/jarvis/missing", "Jarvis · Home control", "404"],
    ["/canceldt/missing", "CANCELDT. — Check the list.", "Nothing published here."],
  ]) {
    test(`server-renders the full error document for ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    });
  }
});

test("preserves each area's document styles through cross-area navigation", async ({ page }) => {
  const areas = [
    { path: "/", background: "rgb(250, 250, 247)", font: "DM Sans" },
    { path: "/jarvis", background: "rgb(246, 247, 245)", font: "-apple-system" },
    { path: "/canceldt", background: "rgb(247, 246, 242)", font: "Arial" },
    { path: "/", background: "rgb(250, 250, 247)", font: "DM Sans" },
  ];
  for (const area of areas) {
    await page.goto(area.path);
    const style = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      font: getComputedStyle(document.body).fontFamily,
    }));
    expect(style.background, area.path).toBe(area.background);
    expect(style.font, area.path).toContain(area.font);
  }
});
