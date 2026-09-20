import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.JARVIS_TEST_URL ?? "https://juicecolored.localhost",
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1080 },
  },
  reporter: "list",
});
