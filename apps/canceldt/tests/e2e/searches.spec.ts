import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { SignJWT, importPKCS8 } from "jose";
import { api } from "@personal/convex";
import { resolve } from "node:path";

process.loadEnvFile(resolve(import.meta.dirname, "../../.env.local"));
const prefix = `Fictional search QA ${Date.now()}`;
let client: ConvexHttpClient;
let token: string;
test.beforeAll(async () => {
  if (!process.env.CANCELDT_AUTH_ISSUER?.includes(".local"))
    throw new Error("Search analytics E2E tests require development credentials.");
  const key = await importPKCS8(
    process.env.CANCELDT_AUTH_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    "ES256",
  );
  token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1", typ: "JWT" })
    .setSubject("canceldt-owner")
    .setIssuer(process.env.CANCELDT_AUTH_ISSUER!)
    .setAudience("canceldt")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
  client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, { auth: token });
});
async function count(term: string) {
  const result = await client.query(api.canceldt.searches.list, { cursor: null });
  return result.page.filter((row) => row.query === term).length;
}

test("submissions are tracked once while refresh, direct URLs and clearing do not add searches", async ({
  page,
  request,
}) => {
  const term = `${prefix} Café`;
  await page.goto("/canceldt");
  await page.getByRole("searchbox").fill(`  ${term}  `);
  const recorded = page.waitForResponse(
    (response) => response.url().endsWith("/canceldt/api/searches") && response.status() === 204,
  );
  await page.getByRole("button", { name: "Check →" }).click();
  await recorded;
  await expect(page.getByRole("heading", { level: 1 })).toContainText(term);
  await expect.poll(() => count(term)).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(term);
  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: "LATEST CANCELS" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(term);
  expect(await count(term)).toBe(1);
  expect(
    (await request.post("/canceldt/api/searches", { data: { q: "x".repeat(161) } })).status(),
  ).toBe(400);
  expect((await request.post("/canceldt/api/searches", { data: { q: 123 } })).status()).toBe(400);
  // A failed analytics request cannot prevent the search result from rendering.
  await page.route("**/canceldt/api/searches", (route) => route.abort());
  await page.getByRole("searchbox").fill(`${prefix} Failure`);
  await page.getByRole("button", { name: "Check →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`${prefix} Failure`);
});

test("native search without JavaScript records a submission", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  try {
    const page = await context.newPage();
    const term = `${prefix} Native`;
    await page.goto(`${baseURL}/canceldt`);
    await page.getByRole("searchbox").fill(term);
    await page.getByRole("button", { name: "Check →" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(term);
    await expect.poll(() => count(term)).toBe(1);
  } finally {
    await context.close();
  }
});

test("admin summary links to private paginated history with a usable mobile layout", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/canceldt/admin/searches");
  await expect(page.getByRole("heading", { name: "Editors only." })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  for (let i = 0; i < 26; i++)
    await client.mutation(api.canceldt.searches.record, { q: `${prefix} Page ${i}` });
  await context.addCookies([
    {
      name: "canceldt_session",
      value: token,
      url: `${baseURL}/canceldt`,
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/canceldt/admin");
  await expect(page.getByRole("heading", { name: "Search activity" })).toBeVisible();
  await page.screenshot({ path: "/tmp/canceldt-admin-sidebar-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "View all searches" }).click();
  await expect(page.getByRole("heading", { name: "Search history." })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(25);
  await expect(page.locator("tbody tr").first()).toContainText(`${prefix} Page 25`);
  await page.getByRole("link", { name: "Older searches" }).click();
  await expect(page.locator("tbody tr").first()).toContainText(`${prefix} Page 0`);
  await page.getByRole("link", { name: "Newest searches" }).click();
  await expect(page.locator("tbody tr").first()).toContainText(`${prefix} Page 25`);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/canceldt-search-history-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Search activity" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/canceldt-search-summary-mobile.png", fullPage: true });
});
