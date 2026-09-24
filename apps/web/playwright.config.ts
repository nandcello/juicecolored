import { defineConfig } from "@playwright/test";

const stubPort = 4390;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.WEB_TEST_ORIGIN ?? "http://127.0.0.1:4380",
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  // Both proxied apps point at this echo server so path forwarding is observable.
  webServer: [
    {
      command: `node tests/upstream-stub.mjs ${stubPort}`,
      url: `http://127.0.0.1:${stubPort}/health`,
      reuseExistingServer: true,
    },
  ],
  reporter: "list",
});
