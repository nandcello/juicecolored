import { expect, test, type APIResponse } from "@playwright/test";

// Servers under test must run with this token (see playwright.config.ts).
const token = process.env.API_AUTH_TOKEN ?? "e2e-test-token";

const expectError = async (response: APIResponse, status: number, code: string) => {
  expect(response.status()).toBe(status);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["content-type"]).toContain("application/json");
  expect((await response.json()).error.code).toBe(code);
};

test("health check", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

test("unknown API routes and methods return JSON 404", async ({ request }) => {
  await expectError(await request.get("/api/nope"), 404, "NOT_FOUND");
  await expectError(await request.get("/api/spam"), 404, "NOT_FOUND");
  await expectError(await request.delete("/api/health"), 404, "NOT_FOUND");
  await expectError(await request.put("/api/spam/batch", { data: {} }), 404, "NOT_FOUND");
});

test("classification routes require a bearer token", async ({ request }) => {
  for (const path of ["/api/spam", "/api/spam/batch"]) {
    await expectError(await request.post(path), 401, "UNAUTHORIZED");
    await expectError(
      await request.post(path, { headers: { authorization: "Bearer wrong" }, data: {} }),
      401,
      "UNAUTHORIZED",
    );
  }
});

test.describe("with credentials", () => {
  const auth = () => ({ authorization: `Bearer ${token}` });

  test("rejects non-JSON content types", async ({ request }) => {
    await expectError(
      await request.post("/api/spam", {
        headers: { ...auth(), "content-type": "text/plain" },
        data: "{}",
      }),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  });

  test("rejects malformed and oversized bodies", async ({ request }) => {
    const headers = { ...auth(), "content-type": "application/json" };
    await expectError(
      await request.post("/api/spam", { headers, data: Buffer.from("{not json") }),
      400,
      "INVALID_JSON",
    );
    await expectError(
      await request.post("/api/spam", {
        headers,
        data: Buffer.from(
          JSON.stringify({ subject: "x", sender: "a", body: "x".repeat(600 * 1024) }),
        ),
      }),
      413,
      "PAYLOAD_TOO_LARGE",
    );
  });

  test("validates emails before calling the provider", async ({ request }) => {
    const headers = { ...auth(), "content-type": "application/json" };
    await expectError(
      await request.post("/api/spam", { headers, data: { subject: "x" } }),
      400,
      "INVALID_EMAIL",
    );
    await expectError(
      await request.post("/api/spam/batch", { headers, data: { emails: [] } }),
      400,
      "INVALID_BATCH",
    );
  });
});
