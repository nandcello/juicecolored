import { expect, test, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { SignJWT, importPKCS8 } from "jose";
import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import { resolve } from "node:path";

process.loadEnvFile(resolve(import.meta.dirname, "../../../../apps/web/.env.local"));

test("report, approve, correct, reject and archive retain their complete mounted flow", async ({
  page,
  context,
  baseURL,
  request,
}, testInfo) => {
  test.setTimeout(180000);
  test.skip(
    process.env.CANCELDT_TEST_REPORTS !== "1",
    "Run with CANCELDT_TEST_REPORTS=1 only on the isolated development CAPTCHA fixture setup.",
  );
  if (!process.env.CANCELDT_AUTH_ISSUER?.includes(".local"))
    throw new Error("Report E2E fixtures require development credentials.");
  const origin = new URL(baseURL!);
  if (
    !["127.0.0.1", "localhost", "juicecolored.local", "juicecolored.localhost"].includes(
      origin.hostname,
    )
  )
    throw new Error("Report E2E fixtures require the local application server.");

  const key = await importPKCS8(
    process.env.CANCELDT_AUTH_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    "ES256",
  );
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1", typ: "JWT" })
    .setSubject("canceldt-owner")
    .setIssuer(process.env.CANCELDT_AUTH_ISSUER!)
    .setAudience("canceldt")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, { auth: token });
  const name = `Fictional Report Migration QA ${Date.now()}`;
  const rejectedName = `FictionalRejectedReportMigrationQa${Date.now()}`;
  let subjectId: Id<"canceldtSubjects"> | undefined;
  const reason = "Fictional report for migration verification. No real-world allegation.";

  async function ready(target: Page) {
    await expect
      .poll(() => target.locator('[name="cf-turnstile-response"]').inputValue(), {
        timeout: 30000,
      })
      .not.toBe("");
  }

  async function submit(subject: string, oneLineReason: string) {
    await page.goto(`/canceldt/report?subject=${encodeURIComponent(subject)}`);
    await expect(page.getByLabel(/^Subject/)).toHaveValue(subject);
    await page.getByLabel("One-line reason").fill(oneLineReason);
    await ready(page);
    await page.getByRole("button", { name: "Submit for review →" }).click();
    await expect(page.getByRole("heading", { name: "Received. Under review." })).toBeVisible();
    await expect(
      page.getByText("Your report is private. Nothing has been published or changed."),
    ).toBeVisible();
  }

  async function review(subject: string) {
    await page.goto("/canceldt/admin?section=reports");
    await page
      .locator(".admin-list a")
      .filter({ has: page.getByText(subject, { exact: true }) })
      .click();
    await expect(page.getByRole("heading", { name: "Review report" })).toBeVisible();
  }

  try {
    await page.goto(`/canceldt/report?subject=${encodeURIComponent(name)}`);
    await expect(page.getByLabel(/^Subject/)).toHaveValue(name);
    await page.getByLabel("One-line reason").fill(reason);
    await ready(page);
    await page.locator('[name="cf-turnstile-response"]').evaluate((input) => {
      (input as HTMLInputElement).value = "";
    });
    await page.getByRole("button", { name: "Submit for review →" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("spam check");
    await expect(page.getByLabel("One-line reason")).toHaveValue(reason);
    await ready(page);
    const submissionId = await page.locator('[name="submissionId"]').inputValue();
    await page.screenshot({ path: testInfo.outputPath("report-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Submit for review →" }).click();
    await expect(page.getByRole("heading", { name: "Received. Under review." })).toBeVisible();
    await page.getByRole("link", { name: "Back to the list →" }).click();
    await expect(page).toHaveURL(`${baseURL}/canceldt`);
    await page.goto(`/canceldt?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("is not cancelled");

    await client.action(api.canceldt.reports.submit, {
      subject: name,
      oneLineReason: reason,
      description: "",
      sources: [],
      website: "",
      submissionId,
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
    await context.addCookies([
      {
        name: "canceldt_session",
        value: token,
        url: `${baseURL}/canceldt`,
        httpOnly: true,
        secure: new URL(baseURL!).protocol === "https:",
        sameSite: "Strict",
      },
    ]);
    await page.goto("/canceldt/admin?section=reports");
    await expect(page.locator(".admin-list strong").filter({ hasText: name })).toHaveCount(1);
    await review(name);
    await page.getByRole("button", { name: "Approve & publish →" }).click();
    await expect(page.locator("main [role=alert]")).toContainText(
      "Confirm that you intend to publish",
    );
    await page.getByLabel("One-line reason").fill("Fictional reason edited during moderation.");
    await page.getByLabel("I reviewed this report").check();
    await page.screenshot({ path: testInfo.outputPath("moderation-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Approve & publish →" }).click();
    await expect(page.getByRole("status")).toContainText("Report reviewed.");
    await page.getByRole("link", { name: "View saved subject →" }).click();
    await expect(page.getByRole("heading", { name: "Edit subject" })).toBeVisible();
    subjectId = (await page.locator('[name="id"]').inputValue()) as Id<"canceldtSubjects">;
    await page.goto(`/canceldt?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("is cancelled");
    await expect(page.getByText("Fictional reason edited during moderation.")).toBeVisible();

    const correction = "Fictional correction applied to the existing subject.";
    await submit(name, correction);
    await review(name);
    await expect(page.locator('[name="targetId"]')).toHaveValue(subjectId);
    await page.getByText("Compare current published/editorial content").click();
    await expect(page.getByText("Fictional reason edited during moderation.")).toBeVisible();
    await page.getByLabel("I reviewed this report").check();
    await page.getByRole("button", { name: "Approve & publish →" }).click();
    await expect(page.getByRole("status")).toContainText("Report reviewed.");
    await page.goto(`/canceldt?q=${encodeURIComponent(name)}`);
    await expect(page.getByText(correction)).toBeVisible();

    const rejected = rejectedName;
    await submit(rejected, "Fictional report that must remain unpublished.");
    await review(rejected);
    await page.getByRole("button", { name: "Reject report" }).click();
    await expect(page.getByRole("status")).toContainText("Report reviewed.");
    await page.getByRole("link", { name: "Back to reports →" }).click();
    await page.getByRole("link", { name: "rejected", exact: true }).click();
    await expect(page.locator(".admin-list strong").filter({ hasText: rejected })).toBeVisible();
    await page.goto(`/canceldt?q=${encodeURIComponent(rejected)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("is not cancelled");

    await page.goto(`/canceldt/admin?edit=${subjectId}`);
    await page.getByLabel("Publication state").selectOption("archived");
    await page.getByLabel("I confirm archiving").check();
    await page.getByRole("button", { name: "Save selected state" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await page.goto(`/canceldt?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("is not cancelled");
  } finally {
    const pending = await client.query(api.canceldt.admin.reports, {
      moderationState: "pending",
      cursor: null,
    });
    for (const row of pending.page) {
      if (row.subject !== name && row.subject !== rejectedName) continue;
      const report = await client.query(api.canceldt.admin.report, { id: row._id });
      if (report)
        await client.mutation(api.canceldt.admin.moderate, {
          id: report._id,
          decision: "reject",
          subject: report.subject,
          oneLineReason: report.oneLineReason,
          description: report.description,
          sources: report.sources,
        });
    }
    // Recover a committed approval even if a later UI assertion prevented ID capture.
    if (!subjectId) {
      const published = await client.query(api.canceldt.admin.subjects, {
        publicationState: "published",
        q: name,
        cursor: null,
      });
      subjectId = published.page.find((row) => row.subject === name)?._id;
    }
    if (subjectId) {
      const row = await client.query(api.canceldt.admin.subject, { id: subjectId });
      if (row && row.subject === name && row.publicationState !== "archived")
        await client.mutation(api.canceldt.admin.save, {
          id: row._id,
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
  }
});
