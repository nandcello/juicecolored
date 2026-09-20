import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptsWrite, sessionCookieOptions } from "../src/lib/http";

afterEach(() => vi.unstubAllEnvs());

function request(origin: string, contentType = "application/json") {
  return new Request("http://127.0.0.1:3001/jarvis/api/jarvis", {
    method: "POST",
    headers: { origin, "content-type": contentType },
  });
}

describe("Jarvis behind the portfolio proxy", () => {
  it("accepts the configured browser origin even when the upstream is HTTP", () => {
    vi.stubEnv("JARVIS_PUBLIC_ORIGIN", "https://juicecolored.local:1355");
    expect(acceptsWrite(request("https://juicecolored.local:1355"))).toBe(true);
    expect(acceptsWrite(request("https://other.test"))).toBe(false);
    expect(acceptsWrite(request("http://127.0.0.1:3001"))).toBe(false);
  });

  it("does not trust a spoofed forwarded host or accept a non-JSON request", () => {
    vi.stubEnv("JARVIS_PUBLIC_ORIGIN", "https://juicecolored.com");
    const spoofed = request("https://other.test");
    spoofed.headers.set("x-forwarded-host", "other.test");
    spoofed.headers.set("x-forwarded-proto", "https");
    expect(acceptsWrite(spoofed)).toBe(false);
    expect(acceptsWrite(request("https://juicecolored.com", "text/plain"))).toBe(false);
    expect(acceptsWrite(request("https://juicecolored.com", "application/json-evil"))).toBe(false);
    expect(
      acceptsWrite(request("https://juicecolored.com", "application/json; charset=utf-8")),
    ).toBe(true);
  });

  it("keeps the session cookie secure and scoped to Jarvis behind an HTTPS proxy", () => {
    vi.stubEnv("JARVIS_PUBLIC_ORIGIN", "https://juicecolored.com");
    expect(sessionCookieOptions(request("https://juicecolored.com"))).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/jarvis",
    });
  });

  it("supports direct local requests when no browser origin is configured", () => {
    vi.stubEnv("JARVIS_PUBLIC_ORIGIN", "");
    expect(acceptsWrite(request("http://127.0.0.1:3001"))).toBe(true);
    expect(sessionCookieOptions(request("http://127.0.0.1:3001")).secure).toBe(false);
  });
});
