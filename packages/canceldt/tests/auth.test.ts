import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, exportPKCS8, generateKeyPair, SignJWT } from "jose";
const mocks = vi.hoisted(() => ({ token: "", query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (mocks.token ? { value: mocks.token } : undefined) }),
}));
vi.mock("../src/lib/convex-read", () => ({ fetchQuery: mocks.query }));
vi.mock("../src/lib/data", () => ({
  convexOptions: () => ({ url: "https://example.convex.cloud" }),
}));
import { AdminSessionError, requireAdmin } from "../src/lib/auth";
const pair = await generateKeyPair("ES256", { extractable: true });
const jwk = await exportJWK(pair.publicKey);
const issuer = "https://auth.example.test";
async function token(expiration = "1h") {
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setIssuer(issuer)
    .setAudience("canceldt")
    .setSubject("canceldt-owner")
    .setExpirationTime(expiration)
    .sign(pair.privateKey);
}
beforeEach(async () => {
  mocks.token = "";
  mocks.query.mockReset().mockResolvedValue(true);
  vi.stubEnv("CANCELDT_AUTH_PRIVATE_KEY", await exportPKCS8(pair.privateKey));
  vi.stubEnv("CANCELDT_AUTH_PUBLIC_JWKS", JSON.stringify({ keys: [{ ...jwk, kid: "test" }] }));
  vi.stubEnv("CANCELDT_AUTH_ISSUER", issuer);
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://owner.convex.cloud");
  vi.stubEnv("CANCELDT_LOGIN_SECRET", "fixture-secret");
});
describe("administrator session classification", () => {
  it("rejects missing, tampered and expired sessions before querying the backend", async () => {
    for (const value of ["", "tampered", await token("-1s")]) {
      mocks.token = value;
      await expect(requireAdmin()).rejects.toBeInstanceOf(AdminSessionError);
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("keeps a backend outage distinct from an expired session", async () => {
    mocks.token = await token();
    const failure = new TypeError("fetch failed", { cause: new Error("EHOSTUNREACH") });
    mocks.query.mockRejectedValue(failure);
    await expect(requireAdmin()).rejects.toBe(failure);
    mocks.query.mockResolvedValue(true);
    expect(await requireAdmin()).toBe(mocks.token);
  });
  it("does not allow a locally valid token when backend permission is denied", async () => {
    mocks.token = await token();
    mocks.query.mockRejectedValue(new Error("Administrator access required."));
    await expect(requireAdmin()).rejects.toThrow("Administrator access required");
  });
});
