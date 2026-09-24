import { expect, test } from "@playwright/test";

// Requires JARVIS_ORIGIN and CANCELDT_ORIGIN to point at tests/upstream-stub.mjs.
for (const app of ["jarvis", "canceldt"]) {
  test(`forwards /${app} to its upstream`, async ({ request }) => {
    for (const path of [`/${app}`, `/${app}/`, `/${app}/a/b?x=1&y=two`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(response.headers()["x-upstream-stub"], path).toBe("1");
      const echo = await response.json();
      expect(echo.method).toBe("GET");
      expect(echo.url.replace(/\/$/, "")).toBe(path.replace(/\/$/, ""));
    }
    const post = await request.post(`/${app}/api/thing`, {
      data: { hello: "world" },
      maxRedirects: 0,
    });
    const echo = await post.json();
    expect(echo).toMatchObject({ method: "POST", url: `/${app}/api/thing` });
    expect(JSON.parse(echo.body)).toEqual({ hello: "world" });
  });
}

test("redirects the misspelled CANCELDT admin path", async ({ request }) => {
  const response = await request.get("/calceldt/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, "http://x").pathname).toBe("/canceldt/admin");
});

test("does not proxy lookalike paths", async ({ request }) => {
  const response = await request.get("/jarvisx", { maxRedirects: 0 });
  expect(response.headers()["x-upstream-stub"]).toBeUndefined();
});
