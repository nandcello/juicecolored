import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    constructor(readonly url: string) {}
  },
}));

import { backend, configured } from "../src/lib/backend";

afterEach(() => vi.unstubAllEnvs());

describe("Jarvis backend isolation in the shared Next app", () => {
  it("uses its own backend URL while the other apps have a public Convex URL", () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://portfolio.convex.cloud");
    vi.stubEnv("JARVIS_CONVEX_URL", "https://jarvis.convex.cloud");
    vi.stubEnv("JARVIS_GATEWAY_SECRET", "jarvis-gateway-secret");
    vi.stubEnv("JARVIS_SESSION_SECRET", "jarvis-session-secret");
    expect(configured()).toBe(true);
    expect(backend()).toMatchObject({
      client: { url: "https://jarvis.convex.cloud" },
      secret: "jarvis-gateway-secret",
    });
  });

  it("cannot accidentally use another app's backend when Jarvis is unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://portfolio.convex.cloud");
    vi.stubEnv("JARVIS_CONVEX_URL", "");
    vi.stubEnv("JARVIS_GATEWAY_SECRET", "jarvis-gateway-secret");
    vi.stubEnv("JARVIS_SESSION_SECRET", "jarvis-session-secret");
    expect(configured()).toBe(false);
    expect(() => backend()).toThrow("Jarvis backend is not configured.");
  });
});
