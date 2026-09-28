import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "auth.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.JARVIS_TEST_URL ?? "https://juicecolored.local",
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1080 },
    // This suite uses the real development passphrase and session cookie.
    trace: "off",
  },
  reporter: "list",
});
