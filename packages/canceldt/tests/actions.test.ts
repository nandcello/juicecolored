import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  query: vi.fn(),
  update: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: mocks.update }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../src/lib/convex-read", () => ({
  fetchMutation: mocks.mutation,
  fetchQuery: mocks.query,
  fetchAction: vi.fn(),
  backendFetch: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({
  requireAdmin: mocks.auth,
  AdminSessionError: class AdminSessionError extends Error {},
  issueSession: vi.fn(),
  authConfigured: vi.fn(),
  COOKIE: "test",
  cookieOptions: vi.fn(),
}));
vi.mock("../src/lib/data", () => ({
  PUBLIC_TAG: "canceldt:public",
  convexOptions: () => ({ url: "https://example.convex.cloud" }),
}));
import { saveSubject, moderateReport } from "../src/actions";
function form(intent: string) {
  const result = new FormData();
  result.set("subject", "Fictional Test");
  result.set("oneLineReason", "Fictional example.");
  result.set("intent", intent);
  result.set("confirmArchive", "yes");
  result.set("confirmPublish", "yes");
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue("verified-token");
  mocks.mutation.mockResolvedValue("saved-id");
  mocks.query.mockResolvedValue({
    subject: "Fictional Test",
    oneLineReason: "Fictional example.",
    sources: [],
    revision: 2,
    publicationState: "published",
  });
});
describe("authorized write → committed mutation → public cache expiry", () => {
  it.each(["draft", "published", "archived"])(
    "expires the shared tag after saving %s",
    async (intent) => {
      expect((await saveSubject({}, form(intent))).success).toBe(true);
      expect(mocks.update).toHaveBeenCalledWith("canceldt:public");
      expect(mocks.mutation.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.update.mock.invocationCallOrder[0],
      );
      expect(mocks.query).not.toHaveBeenCalled();
    },
  );
  it("expires the same tag after approval and rejection", async () => {
    for (const intent of ["approve", "reject"])
      expect((await moderateReport({}, form(intent))).success).toBe(true);
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });
  it("does not invalidate or write on failed authorization", async () => {
    mocks.auth.mockRejectedValue(new Error("Denied"));
    expect((await saveSubject({}, form("published"))).error).toBeTruthy();
    expect((await moderateReport({}, form("approve"))).error).toBeTruthy();
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not expire tags when the transaction fails", async () => {
    mocks.mutation.mockRejectedValue(new Error("Backend unavailable"));
    expect((await saveSubject({}, form("published"))).error).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

it("keeps the saved record and revision through validation and network failures", async () => {
  const saved = await saveSubject({}, form("published"));
  expect(saved).toMatchObject({ id: "saved-id", revision: 1, publicationState: "published" });
  const invalid = form("published");
  invalid.set("subject", "   ");
  expect(await saveSubject(saved, invalid)).toMatchObject({
    id: "saved-id",
    revision: 1,
    fields: { subject: expect.any(String) },
  });
  mocks.mutation.mockRejectedValue(new Error("Offline"));
  expect(await saveSubject(saved, form("published"))).toMatchObject({
    id: "saved-id",
    revision: 1,
  });
});
it("a committed save succeeds without a fallible follow-up read", async () => {
  mocks.query.mockRejectedValue(new Error("Read connection failed"));
  const input = form("published");
  input.set("id", "existing-id");
  input.set("revision", "7");
  expect(await saveSubject({}, input)).toMatchObject({
    success: true,
    revision: 8,
    publicationState: "published",
  });
  expect(mocks.query).not.toHaveBeenCalled();
});
