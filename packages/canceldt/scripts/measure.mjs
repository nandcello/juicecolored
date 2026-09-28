import { chromium } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@personal/convex";
import { SignJWT, importPKCS8 } from "jose";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
process.loadEnvFile(resolve(import.meta.dirname, "../../../apps/web/.env.local"));
if (!process.env.CANCELDT_AUTH_ISSUER?.includes(".local"))
  throw new Error("Development credentials required.");
const origin = process.env.CANCELDT_MEASURE_ORIGIN ?? "http://127.0.0.1:4385";
const key = await importPKCS8(
  process.env.CANCELDT_AUTH_PRIVATE_KEY.replaceAll("\\n", "\n"),
  "ES256",
);
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1", typ: "JWT" })
  .setSubject("canceldt-owner")
  .setIssuer(process.env.CANCELDT_AUTH_ISSUER)
  .setAudience("canceldt")
  .setIssuedAt()
  .setExpirationTime("10m")
  .sign(key);
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
client.setAuth(token);
const subject = `Fictional Performance Bureau ${Date.now()}`;
const id = await client.mutation(api.canceldt.admin.save, {
  subject,
  oneLineReason: "Fictional performance fixture only.",
  description: "A test paragraph. This is not an allegation about a real subject.",
  sources: [],
  publicationState: "published",
});
const invalidate = () =>
  fetch(`${origin}/canceldt/api/revalidate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CANCELDT_REVALIDATE_SECRET}` },
  });
await invalidate();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const before = performance.now();
  await page.goto(`${origin}/canceldt`);
  await page.waitForFunction(() => {
    const heading = document.querySelector("#latest-title");
    return heading && heading.getBoundingClientRect().height > 0;
  });
  const ready = performance.now() - before;
  await page.waitForLoadState("networkidle");
  const cold = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const scripts = performance
      .getEntriesByType("resource")
      .filter((r) => new URL(r.name).pathname.endsWith(".js"));
    return {
      ttfbMs: nav.responseStart - nav.requestStart,
      fcpMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
      lcpMs: window.__lcp,
      jsEncodedBytes: scripts.reduce((sum, r) => sum + r.encodedBodySize, 0),
      jsDecodedBytes: scripts.reduce((sum, r) => sum + r.decodedBodySize, 0),
      scriptCount: scripts.length,
    };
  });
  const warmLoads = [],
    searches = [],
    navigations = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await page.goto(`${origin}/canceldt`);
    await page.waitForFunction(() => {
      const heading = document.querySelector("#latest-title");
      return heading && heading.getBoundingClientRect().height > 0;
    });
    warmLoads.push(performance.now() - start);
    await page.getByRole("searchbox").fill(subject);
    const searchStart = performance.now();
    await page.getByRole("button", { name: "Check →" }).click();
    await page.getByRole("heading", { name: /is cancelled/ }).waitFor();
    searches.push(performance.now() - searchStart);
    const navigationStart = performance.now();
    await page.getByRole("link", { name: "The deets" }).click();
    await page.getByRole("heading", { name: subject, exact: true }).waitFor();
    navigations.push(performance.now() - navigationStart);
  }
  const result = {
    measuredAt: new Date().toISOString(),
    environment:
      "Next 16.3.5 optimized webpack production build, Node 22, local macOS host, Chromium desktop 1440x1000, no CPU/network throttling, live remote development Convex; direct loopback (not Vite), cold browser then warm browser/process",
    cold: { ...cold, resultsReadyMs: ready },
    warmLoadsMs: warmLoads,
    committedSearchMs: searches,
    detailNavigationMs: navigations,
  };
  await writeFile(
    resolve(import.meta.dirname, "../docs/canceldt-performance.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  const row = await client.query(api.canceldt.admin.subject, { id });
  await client.mutation(api.canceldt.admin.save, {
    id,
    revision: row.revision,
    subject: row.subject,
    oneLineReason: row.oneLineReason,
    description: row.description,
    sources: row.sources,
    publicationState: "archived",
  });
  await invalidate();
}
