import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { handleSpamRequest } from "./handler.server";

afterEach(() => vi.unstubAllEnvs());

test("HTTP adapter fails closed when either secret is missing or blank", async () => {
  for (const [key, token] of [
    [undefined, "test"],
    ["test", undefined],
    ["test", " "],
  ]) {
    vi.stubEnv("AI_GATEWAY_API_KEY", key);
    vi.stubEnv("API_AUTH_TOKEN", token);
    const response = await handleSpamRequest(
      new Request("http://localhost/api/spam", {
        method: "POST",
      }),
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      error: { code: "CONFIGURATION_ERROR", message: "The service is not configured correctly." },
    });
  }
});

test("HTTP adapter reads current configuration and protects both classification routes", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  vi.stubEnv("API_AUTH_TOKEN", "test-token");
  vi.stubEnv("JEV_TIMEOUT_MS", "10000");
  const health = await handleSpamRequest(new Request("http://localhost/api/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  for (const path of ["/api/spam", "/api/spam/batch"]) {
    const response = await handleSpamRequest(
      new Request(`http://localhost${path}`, { method: "POST" }),
    );
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHORIZED");
  }
});
