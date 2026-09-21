import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.CANCELDT_TEST_ORIGIN ?? "https://juicecolored.localhost",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
