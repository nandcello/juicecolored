import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("proxy sign-in, session scope, reload, origin rejection and logout", async ({
  page,
  context,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const endpoint = `${origin}/jarvis/api/jarvis`;
  expect((await context.request.get(endpoint)).status()).toBe(401);
  expect(
    (
      await context.request.post(endpoint, {
        headers: { Origin: "https://other.test" },
        data: { type: "login", password: "not-used" },
      })
    ).status(),
  ).toBe(403);

  const password = readFileSync(".env.credentials.local", "utf8")
    .split("\n")
    .find((line) => line.startsWith("JARVIS_OWNER_PASSPHRASE="))!
    .slice("JARVIS_OWNER_PASSPHRASE=".length);
  await page.goto("/jarvis");
  await page.getByLabel("Owner passphrase").fill(password);
  await page.getByRole("button", { name: "Enter your home" }).click();
  await expect(page.getByRole("heading", { name: "My home", level: 1 })).toBeVisible();

  const cookie = (await context.cookies(`${origin}/jarvis`)).find(
    (entry) => entry.name === "jarvis_session",
  );
  expect(cookie).toMatchObject({
    path: "/jarvis",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  expect((await context.cookies(origin)).some((entry) => entry.name === "jarvis_session")).toBe(
    false,
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "My home", level: 1 })).toBeVisible();

  expect(
    (
      await context.request.post(endpoint, {
        headers: { Origin: origin },
        data: { type: "logout" },
      })
    ).status(),
  ).toBe(200);
  expect((await context.cookies()).some((entry) => entry.name === "jarvis_session")).toBe(false);
  expect((await context.request.get(endpoint)).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole("button", { name: "Enter your home" })).toBeVisible();
});
