import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { SignJWT, importPKCS8 } from "jose";
import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
process.loadEnvFile(resolve(import.meta.dirname, "../../../../apps/web/.env.local"));
const ids: Id<"canceldtSubjects">[] = [];
const prefix = `Fictional QA ${Date.now()}`;
let token: string;
let client: ConvexHttpClient;
const fixture = (name: string) => ({
  subject: `${prefix} ${name}`,
  oneLineReason: "Fictional test entry. No real-world allegation.",
  sources: [],
});
test.beforeAll(async ({ request }) => {
  const key = await importPKCS8(
    process.env.CANCELDT_AUTH_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    "ES256",
  );
  // Tests deliberately refuse production credentials / issuers.
  if (!process.env.CANCELDT_AUTH_ISSUER?.includes(".local"))
    throw new Error("Use development credentials only for E2E fixtures.");
  token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1", typ: "JWT" })
    .setSubject("canceldt-owner")
    .setIssuer(process.env.CANCELDT_AUTH_ISSUER!)
    .setAudience("canceldt")
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(key);
  client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(token);
  for (const [name, extra] of [
    ["Café", { description: "Fictional first paragraph.\n\nFictional second paragraph." }],
    [
      "Sources",
      { sources: [{ url: "https://example.com/", title: "Example domain — test fixture" }] },
    ],
    ["Reason", {}],
    ["Fourth", {}],
    ["Fifth", {}],
    ["Sixth", {}],
  ] as const)
    ids.push(
      await client.mutation(api.canceldt.admin.save, {
        ...fixture(name),
        ...extra,
        sources: "sources" in extra ? [...extra.sources] : [],
        publicationState: "published",
      }),
    );
  ids.push(
    await client.mutation(api.canceldt.admin.save, {
      ...fixture("Private"),
      publicationState: "draft",
    }),
  );
  expect(
    (
      await request.post("/canceldt/api/revalidate", {
        headers: { Authorization: `Bearer ${process.env.CANCELDT_REVALIDATE_SECRET}` },
      })
    ).ok(),
  ).toBe(true);
});
test.afterAll(async ({ request }) => {
  if (client)
    for (const id of ids) {
      const row = await client.query(api.canceldt.admin.subject, { id });
      if (row)
        await client.mutation(api.canceldt.admin.save, {
          id,
          revision: row.revision,
          subject: row.subject,
          oneLineReason: row.oneLineReason,
          description: row.description,
          sources: row.sources,
          publicationState: "archived",
        });
    }
  await request.post("/canceldt/api/revalidate", {
    headers: { Authorization: `Bearer ${process.env.CANCELDT_REVALIDATE_SECRET}` },
  });
});
test("latest five, search links, refresh, partial/exact, back/forward and clearing", async ({
  page,
}) => {
  await page.goto("/canceldt");
  await expect(page.locator(".entries > li")).toHaveCount(5);
  await expect(page.locator(".entries > li").first()).toContainText("Sixth");
  await page.goto(`/canceldt?q=${encodeURIComponent(`${prefix} Café`)}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} Caféis cancelled.`);
  await expect(page.getByRole("link", { name: "The deets" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue(`${prefix} Café`);
  await page.getByRole("searchbox").fill(prefix);
  await page.getByRole("button", { name: "Check →" }).click();
  await expect(page.getByRole("heading", { name: "Matching subjects" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue(`${prefix} Café`);
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Matching subjects" })).toBeVisible();
  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page).toHaveURL(/\/canceldt$/);
  await expect(page.getByRole("heading", { name: "LATEST CANCELS" })).toBeVisible();
});
test("safe no-match, repeated q, whitespace, long query, report prefill and keyboard", async ({
  page,
}) => {
  await page.goto("/canceldt?q=%20%20%20");
  await expect(page.getByRole("heading", { name: "LATEST CANCELS" })).toBeVisible();
  const input = "UnlistedZyx <script> & Nobody";
  await page.goto(`/canceldt?q=${encodeURIComponent(input)}&q=ignored`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(input);
  await expect(page.getByText("No entry in CANCELDT’s published list.")).toBeVisible();
  await page.getByRole("link", { name: "Should be cancelled? Report it." }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Subject", { exact: false }).first()).toHaveValue(input);
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByRole("button", { name: "Add source" }).click();
  await expect(page.getByLabel("Source 2 address")).toBeVisible();
  await page.getByRole("button", { name: "Remove source 1" }).click();
  await expect(page.getByLabel("Source 1 address")).toBeVisible();
  await expect(page.getByLabel("Source 2 address")).toHaveCount(0);
  await page.goto(`/canceldt?q=${"x".repeat(161)}`);
  await expect(page.locator("main [role=alert]")).toContainText("check was not run");
  await expect(page.getByText("is not cancelled.", { exact: false })).toHaveCount(0);
});
test("detail affordances and private detail exclusion", async ({ page }) => {
  for (const name of ["Café", "Sources"]) {
    await page.goto(`/canceldt?q=${encodeURIComponent(`${prefix} ${name}`)}`);
    await page.getByRole("link", { name: "The deets" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} ${name}`);
    await expect(page.getByRole("link", { name: "Back to search" })).toBeVisible();
    if (name === "Café")
      await expect(page.locator(".description")).toContainText("second paragraph");
    else
      await expect(page.getByRole("link", { name: /Example domain/ })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
  }
  await page.goto(`/canceldt?q=${encodeURIComponent(`${prefix} Reason`)}`);
  await expect(page.getByRole("link", { name: "The deets" })).toHaveCount(0);
  await page.getByRole("link", { name: "View record" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} Reason`);
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
  const row = await client.query(api.canceldt.admin.subject, { id: ids[6] });
  await page.goto(`/canceldt/subject/${row!.slug}`);
  await expect(page.getByRole("heading", { name: "Nothing published here." })).toBeVisible();
});
test("sharing opens native share with only a record permalink or search URL", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        sessionStorage.setItem("shared", JSON.stringify(data));
      },
    });
  });
  await page.goto(`/canceldt?q=${encodeURIComponent(`${prefix} Reason`)}`);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shared = JSON.parse(await page.evaluate(() => sessionStorage.getItem("shared")!));
  expect(shared).toEqual({ url: expect.any(String) });
  expect(shared.url).toContain("/canceldt/subject/");
  expect(shared.url).not.toContain("?q=");
  await page.goto(shared.url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} Reason`);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  expect(JSON.parse(await page.evaluate(() => sessionStorage.getItem("shared")!))).toEqual({
    url: shared.url,
  });
  await page.goto("/canceldt");
  await page.getByRole("button", { name: "Share", exact: true }).first().click();
  expect(JSON.parse(await page.evaluate(() => sessionStorage.getItem("shared")!))).toEqual({
    url: expect.stringContaining("/canceldt/subject/"),
  });
  await page.goto(`/canceldt?q=${encodeURIComponent(prefix)}`);
  await page.getByRole("button", { name: "Share", exact: true }).last().click();
  const matches = JSON.parse(await page.evaluate(() => sessionStorage.getItem("shared")!));
  expect(matches).toEqual({ url: expect.any(String) });
  expect(new URL(matches.url).searchParams.get("q")).toBe(prefix);
  const query = "UnlistedZyxÉ & NobodyZyx? #987654321%";
  await page.goto(`/canceldt?q=${encodeURIComponent(query)}`);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const unlisted = JSON.parse(await page.evaluate(() => sessionStorage.getItem("shared")!));
  expect(unlisted).toEqual({ url: expect.any(String) });
  expect(new URL(unlisted.url).searchParams.get("q")).toBe(query);
  await page.goto(unlisted.url);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(query);
});

test("sharing cancellation, clipboard fallback and denied clipboard remain usable", async ({
  page,
}) => {
  await page.goto("/canceldt?q=UnlistedZyxShareFallback");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (url: string) => {
          sessionStorage.setItem("copied", url);
        },
      },
    });
  });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem("copied"))).toBeNull();
  await expect(page.getByText("Sharing is unavailable.", { exact: false })).toHaveCount(0);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined }),
  );
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Link copied.")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("copied"))).toContain(
    "/canceldt?q=UnlistedZyxShareFallback",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByLabel("Share link")).toHaveValue(
    /\/canceldt\?q=UnlistedZyxShareFallback$/,
  );
});

test("sharing previews are crawler-readable PNGs and exclude private records", async ({
  request,
}, testInfo) => {
  for (const query of [`${prefix} Café`, "UnlistedZyxPreview", prefix]) {
    const response = await request.get(`/canceldt?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Twitterbot/1.0" },
    });
    expect(response.ok()).toBe(true);
    const html = await response.text();
    const head = html.split("</head>")[0];
    expect(head).toContain('property="og:title"');
    const imageUrl = head.match(/property="og:image" content="([^"]+)"/)?.[1];
    expect(imageUrl).toContain("/canceldt/api/og?");
    const url = new URL(imageUrl!.replaceAll("&amp;", "&"));
    const image = await request.get(url.pathname + url.search);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    const png = await image.body();
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }
  const row = await client.query(api.canceldt.admin.subject, { id: ids[0] });
  const response = await request.get(`/canceldt/subject/${encodeURIComponent(row!.slug)}`, {
    headers: { "User-Agent": "Twitterbot/1.0" },
  });
  const head = (await response.text()).split("</head>")[0];
  expect(head).toContain(`content="${prefix} Café is cancelled."`);
  expect(head).toContain("Fictional test entry. No real-world allegation.");
  expect(
    (await request.get(`/canceldt/api/og?slug=${encodeURIComponent(row!.slug)}`)).status(),
  ).toBe(200);
  const draft = await client.query(api.canceldt.admin.subject, { id: ids[6] });
  expect((await request.get(`/canceldt/api/og?slug=${draft!.slug}`)).status()).toBe(404);
  expect((await request.get("/canceldt/api/og?q=" + "x".repeat(161))).status()).toBe(400);
  expect((await request.get("/canceldt/api/og?q=%20%20")).status()).toBe(400);
  const id = await client.mutation(api.canceldt.admin.save, {
    subject: `${prefix} ${"W".repeat(160 - prefix.length - 1)}`,
    oneLineReason: "W".repeat(240),
    sources: [],
    publicationState: "published",
  });
  ids.push(id);
  const long = await client.query(api.canceldt.admin.subject, { id });
  const longImage = await request.get(`/canceldt/api/og?slug=${long!.slug}`);
  expect(longImage.status()).toBe(200);
  await writeFile(testInfo.outputPath("long-preview.png"), await longImage.body());
});
test("pending search hides the previous verdict", async ({ page }) => {
  await page.goto("/canceldt?q=NoSuchFictionalSubject");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is not cancelled");
  await page.route("**/canceldt?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.getByRole("searchbox").fill(`${prefix} Café`);
  await page.getByRole("button", { name: "Check →" }).click();
  await expect(page.getByRole("button", { name: "Checking…" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /is not cancelled/ })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: /is cancelled/ })).toBeVisible();
});
test("unauthorized admin, mount alias and revalidation endpoint", async ({ page, request }) => {
  await page.goto("/canceldt/admin");
  await expect(page.getByRole("heading", { name: "Editors only." })).toBeVisible();
  await expect(page.getByRole("link", { name: "+ Add subject" })).toHaveCount(0);
  const alias = await request.get("/calceldt/admin", { maxRedirects: 0 });
  expect(alias.status()).toBe(308);
  expect(alias.headers().location).toBe("/canceldt/admin");
  expect((await request.post("/canceldt/api/revalidate")).status()).toBe(401);
});
test("admin edits persist, validation keeps values, publish/archive/restore invalidate cached data", async ({
  page,
  context,
  baseURL,
}) => {
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
  const row = await client.query(api.canceldt.admin.subject, { id: ids[6] });
  const detailUrl = `/canceldt/subject/${row!.slug}`;
  await page.goto(detailUrl);
  await expect(page.getByText("Nothing published here.")).toBeVisible();
  await page.goto(`/canceldt/admin?edit=${ids[6]}`);
  await expect(page.getByRole("heading", { name: "Edit subject" })).toBeVisible();
  await page.getByLabel("One-line reason").fill("Fictional QA reason saved through the editor.");
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Source 1 address").fill("ftp://example.com");
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Check the marked fields");
  await expect(page.getByLabel("One-line reason")).toHaveValue(
    "Fictional QA reason saved through the editor.",
  );
  await expect(page.getByLabel("Source 1 address")).toHaveValue("ftp://example.com");
  await page.getByLabel("Source 1 address").fill("https://example.com/");
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.goto(detailUrl);
  await expect(page.locator(".reason")).toHaveText("Fictional QA reason saved through the editor.");
  await page.goto(`/canceldt/admin?edit=${ids[6]}`);
  await page.getByLabel("Publication state").selectOption("archived");
  await page.getByLabel("I confirm archiving").check();
  await page.getByRole("button", { name: "Save selected state" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.goto(detailUrl);
  await expect(page.getByText("Nothing published here.")).toBeVisible();
  await page.goto(`/canceldt/admin?edit=${ids[6]}`);
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.goto(detailUrl);
  await expect(page.locator(".reason")).toHaveText("Fictional QA reason saved through the editor.");
});
test("narrow layout and long subjects do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(`/canceldt?q=${"Fictional".repeat(17)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is not cancelled");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "/tmp/canceldt-mobile.png", fullPage: true });
  await page.goto("/canceldt/report");
  await page.getByRole("button", { name: "Add source" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test("GET search works without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/canceldt`);
  await page.getByRole("searchbox").fill(`${prefix} Café`);
  await page.getByRole("button", { name: "Check →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is cancelled");
  await context.close();
});

test("new subjects retain identity across saves, rejected edits and expired sessions", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  const name = `${prefix} Browser-created`;
  const cookie = {
    name: "canceldt_session",
    value: token,
    url: `${baseURL}/canceldt`,
    httpOnly: true,
    secure: new URL(baseURL!).protocol === "https:",
    sameSite: "Strict" as const,
  };
  await context.addCookies([cookie]);
  await page.goto("/canceldt/admin");
  await page.getByRole("link", { name: "+ Add subject" }).click();
  await expect(page).toHaveURL(`${baseURL}/canceldt/admin?edit=new`);
  await page.getByLabel(/^Subject/).fill("   ");
  await page.getByLabel("One-line reason").fill("Fictional browser-created fixture.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Check the marked fields.");
  await expect(page.getByLabel("One-line reason")).toHaveValue(
    "Fictional browser-created fixture.",
  );
  await page.getByLabel(/^Subject/).fill(name);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  const id = (await page.locator('[name="id"]').inputValue()) as Id<"canceldtSubjects">;
  ids.push(id);
  await expect(page.locator('[name="revision"]')).toHaveValue("1");
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Source 1 address").fill("ftp://example.com");
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Check the marked fields.");
  await expect(page.locator('[name="id"]')).toHaveValue(id);
  await expect(page.locator('[name="revision"]')).toHaveValue("1");
  await page.getByLabel("Source 1 address").fill("https://example.com/");
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await expect(page.locator('[name="revision"]')).toHaveValue("2");
  await page.getByLabel("One-line reason").fill("Fictional second edit preserves the same record.");
  await page.getByRole("button", { name: "Save selected state" }).click();
  await expect(page.locator('[name="revision"]')).toHaveValue("3");
  await expect(page.locator('[name="id"]')).toHaveValue(id);
  await page.getByRole("link", { name: "Open saved entry →" }).click();
  await expect(page).toHaveURL(`${baseURL}/canceldt/admin?edit=${id}`);
  await page.screenshot({
    path: testInfo.outputPath("subject-editor-desktop.png"),
    fullPage: true,
  });

  await context.addCookies([{ ...cookie, value: "tampered-session" }]);
  await page.getByLabel("One-line reason").fill("Fictional unsaved edit after session expiry.");
  await page.getByRole("button", { name: "Save selected state" }).click();
  await expect(page.locator("main [role=alert]")).toContainText("Your session has expired");
  await expect(page.getByLabel("One-line reason")).toHaveValue(
    "Fictional unsaved edit after session expiry.",
  );
  await expect(page.locator('[name="id"]')).toHaveValue(id);
  await expect(page.getByRole("link", { name: "Sign in in a separate tab →" })).toHaveAttribute(
    "href",
    "/canceldt/admin",
  );
  await context.addCookies([cookie]);
  await page.getByRole("button", { name: "Save selected state" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await expect(page.locator('[name="revision"]')).toHaveValue("4");

  const competing = await context.newPage();
  try {
    await competing.goto(`/canceldt/admin?edit=${id}`);
    await competing.getByLabel("One-line reason").fill("Fictional winning concurrent edit.");
    await competing.getByRole("button", { name: "Save selected state" }).click();
    await expect(competing.getByRole("status")).toContainText("Saved.");
    await page
      .getByLabel("One-line reason")
      .fill("Fictional stale edit must be retained, not saved.");
    await page.getByRole("button", { name: "Save selected state" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("Another edit was saved.");
    await expect(page.getByLabel("One-line reason")).toHaveValue(
      "Fictional stale edit must be retained, not saved.",
    );
  } finally {
    await competing.close();
  }
  await page.reload();
  await expect(page.getByLabel("One-line reason")).toHaveValue(
    "Fictional winning concurrent edit.",
  );
  await page.getByRole("link", { name: "View public list ↗" }).click();
  await expect(page).toHaveURL(`${baseURL}/canceldt`);
  await page.goto("/canceldt/admin?edit=new");
  await page.getByLabel(/^Subject/).fill(name);
  await page.getByLabel("One-line reason").fill("Fictional duplicate must fail.");
  await page.getByRole("button", { name: "Publish →", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("This subject already exists");
});

test("unmatched mounted routes retain the CANCELDT not-found page and navigation", async ({
  page,
}) => {
  const response = await page.goto("/canceldt/missing/fictional-path");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "CANCELDT home" })).toBeVisible();
  await expect(page.getByText("Nothing published here.")).toBeVisible();
  await page.getByRole("link", { name: "Back to the list →" }).click();
  await expect(page).toHaveURL(/\/canceldt$/);
});
