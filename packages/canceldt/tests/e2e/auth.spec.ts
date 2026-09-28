import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
let password = process.env.CANCELDT_TEST_OWNER_PASSWORD;
if (!password) {
  try {
    password = parseEnv(
      readFileSync(
        resolve(import.meta.dirname, "../../../../apps/web/.env.credentials.local"),
        "utf8",
      ),
    ).CANCELDT_ADMIN_PASSPHRASE;
  } catch {
    /* CI supplies its own development credential. */
  }
}
// Never put real credentials into a recorded Playwright trace.
test.use({ trace: "off" });
test("independent admin credential signs in and out at the canonical mounted URL", async ({
  page,
  baseURL,
}) => {
  test.skip(!password, "Set CANCELDT_TEST_OWNER_PASSWORD to verify the independent admin login.");
  if (
    !["juicecolored.local", "juicecolored.localhost", "127.0.0.1", "localhost"].includes(
      new URL(baseURL!).hostname,
    )
  )
    throw new Error("Run owner credential verification on the local development origin only.");
  await page.goto("/canceldt/admin");
  await page.getByLabel("Admin passphrase").fill(password!);
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(page.getByRole("heading", { name: "The edit desk." })).toBeVisible({
    timeout: 20000,
  });
  await expect(page).toHaveURL(`${baseURL}/canceldt/admin`);
  const cookie = (await page.context().cookies()).find(
    (value) => value.name === "canceldt_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.path).toBe("/canceldt");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Editors only." })).toBeVisible();
  await expect(page).toHaveURL(`${baseURL}/canceldt/admin`);
  expect((await page.context().cookies()).some((value) => value.name === "canceldt_session")).toBe(
    false,
  );
});
