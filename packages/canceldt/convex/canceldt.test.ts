// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "@personal/convex/api";
import schema from "../../convex/convex/schema";
import { cleanSubject, normalizeSubject, validateContent } from "./model";
const modules = import.meta.glob("../../convex/convex/**/*.ts");
const issuer = "https://canceldt.test";
const owner = { issuer, subject: "owner", tokenIdentifier: `${issuer}|owner` };
const content = (subject = "Fictional Moon Bureau") => ({
  subject,
  oneLineReason: "Fictional test: misplaced the moon.",
  sources: [],
});
function setup() {
  const t = convexTest(schema, modules);
  return { t, admin: t.withIdentity(owner) };
}
beforeEach(() => {
  vi.stubEnv("CANCELDT_AUTH_ISSUER", issuer);
  vi.stubEnv("CANCELDT_ADMIN_IDENTITIES", owner.tokenIdentifier);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("CANCELDT publication and identity", () => {
  it("returns empty/fewer/five ordered by publication, never edits", async () => {
    const { t, admin } = setup();
    expect(await t.query(api.canceldt.public.latest, {})).toEqual([]);
    const id = await admin.mutation(api.canceldt.admin.save, {
      ...content(),
      publicationState: "published",
    });
    expect(await t.query(api.canceldt.public.latest, {})).toHaveLength(1);
    for (let i = 0; i < 7; i++)
      await t.run((ctx) =>
        ctx.db.insert("canceldtSubjects", {
          ...content(`Fictional Bureau ${i}`),
          normalizedSubject: `fictional bureau ${i}`,
          slug: `fictional-${i}`,
          publicationState: "published",
          publishedAt: 100 + i,
          createdAt: 100,
          updatedAt: 100,
          revision: 1,
        }),
      );
    await t.run((ctx) => ctx.db.patch("canceldtSubjects", id, { publishedAt: 1 }));
    await admin.mutation(api.canceldt.admin.save, {
      ...content(),
      id,
      revision: 1,
      publicationState: "published",
      oneLineReason: "Corrected fictional typo.",
    });
    const latest = await t.query(api.canceldt.public.latest, {});
    expect(latest).toHaveLength(5);
    expect(latest.map((row) => row.subject)).toEqual(
      [6, 5, 4, 3, 2].map((i) => `Fictional Bureau ${i}`),
    );
    expect(await admin.query(api.canceldt.admin.subject, { id })).toMatchObject({ publishedAt: 1 });
  });
  it("normalizes case, whitespace and Unicode while preserving accents/punctuation", async () => {
    expect(cleanSubject("  Café   & Sons  ")).toBe("Café & Sons");
    expect(normalizeSubject("Cafe\u0301")).toBe(normalizeSubject("CAFÉ"));
    expect(normalizeSubject("Café")).not.toBe(normalizeSubject("Cafe"));
    const { t, admin } = setup();
    await admin.mutation(api.canceldt.admin.save, {
      ...content("Fictional Café & Sons"),
      publicationState: "published",
    });
    expect(
      (await t.query(api.canceldt.public.search, { q: "  FICTIONAL  Cafe\u0301 & SONS " })).exact
        ?.subject,
    ).toBe("Fictional Café & Sons");
    expect((await t.query(api.canceldt.public.search, { q: "Fictional Caf" })).exact).toBeNull();
    expect(
      (await t.query(api.canceldt.public.search, { q: "Fictional Caf" })).matches,
    ).toHaveLength(1);
    expect((await t.query(api.canceldt.public.search, { q: "misplaced" })).matches).toEqual([]);
    expect((await t.query(api.canceldt.public.search, { q: "  " })).exact).toBeNull();
    await expect(t.query(api.canceldt.public.search, { q: "x".repeat(161) })).rejects.toThrow(
      "160",
    );
  });
  it("excludes drafts and archives and reports details accurately", async () => {
    const { t, admin } = setup();
    for (const publicationState of ["draft", "archived"] as const) {
      await admin.mutation(api.canceldt.admin.save, {
        ...content(`Fictional ${publicationState}`),
        publicationState,
      });
      expect(
        await t.query(api.canceldt.public.detail, { slug: `fictional-${publicationState}` }),
      ).toBeNull();
      expect(
        (await t.query(api.canceldt.public.search, { q: `Fictional ${publicationState}` })).exact,
      ).toBeNull();
    }
    for (const [name, extras] of [
      ["Reason", {}],
      ["Description", { description: "Only fictional context." }],
      ["Source", { sources: [{ url: "https://example.com" }] }],
    ] as const)
      await admin.mutation(api.canceldt.admin.save, {
        ...content(`Fictional ${name}`),
        ...extras,
        sources: "sources" in extras ? [...extras.sources] : [],
        publicationState: "published",
      });
    const rows = await t.query(api.canceldt.public.latest, {});
    expect(rows.find((r) => r.subject === "Fictional Reason")?.hasDetails).toBe(false);
    expect(rows.find((r) => r.subject === "Fictional Description")?.hasDetails).toBe(true);
    expect(rows.find((r) => r.subject === "Fictional Source")?.hasDetails).toBe(true);
    expect(rows.some((r) => "description" in r || "sources" in r || "_id" in r)).toBe(false);
  });
  it("rejects duplicate identities, slug collisions, unsafe sources and stale edits", async () => {
    const { admin } = setup();
    const id = await admin.mutation(api.canceldt.admin.save, {
      ...content("Fictional A+B"),
      publicationState: "draft",
    });
    await expect(
      admin.mutation(api.canceldt.admin.save, {
        ...content(" fictional a+b "),
        publicationState: "draft",
      }),
    ).rejects.toThrow("already exists");
    await expect(
      admin.mutation(api.canceldt.admin.save, {
        ...content("Fictional A B"),
        publicationState: "draft",
      }),
    ).rejects.toThrow("address already exists");
    await expect(
      admin.mutation(api.canceldt.admin.save, {
        ...content(),
        id,
        revision: 0,
        publicationState: "draft",
      }),
    ).rejects.toThrow("Another edit");
    for (const url of [
      "javascript:alert(1)",
      "data:text/plain,test",
      "https://user:password@example.com",
    ])
      expect(() => validateContent({ ...content(), sources: [{ url }] })).toThrow();
  });
  it("archives/restores without changing publication date, preserves slugs, removes description", async () => {
    const { t, admin } = setup();
    const id = await admin.mutation(api.canceldt.admin.save, {
      ...content(),
      description: "Context",
      publicationState: "published",
    });
    const original = await admin.query(api.canceldt.admin.subject, { id });
    await admin.mutation(api.canceldt.admin.save, {
      ...content(),
      id,
      revision: 1,
      publicationState: "archived",
    });
    expect(await t.query(api.canceldt.public.latest, {})).toEqual([]);
    await admin.mutation(api.canceldt.admin.save, {
      ...content("Fictional Renamed Bureau"),
      id,
      revision: 2,
      publicationState: "published",
    });
    const restored = await admin.query(api.canceldt.admin.subject, { id });
    expect(restored?.publishedAt).toBe(original?.publishedAt);
    expect(restored?.slug).toBe(original?.slug);
    expect(restored?.description).toBeUndefined();
  });
});
describe("CANCELDT permissions and moderation", () => {
  it("denies anonymous and non-admin reads and writes; missing allowlist denies owner", async () => {
    const { t, admin } = setup();
    for (const caller of [
      t,
      t.withIdentity({ issuer, subject: "visitor", tokenIdentifier: `${issuer}|visitor` }),
    ]) {
      await expect(caller.query(api.canceldt.admin.permission, {})).rejects.toThrow(
        "Administrator",
      );
      await expect(
        caller.query(api.canceldt.admin.reports, { moderationState: "pending", cursor: null }),
      ).rejects.toThrow("Administrator");
      await expect(
        caller.mutation(api.canceldt.admin.save, { ...content(), publicationState: "published" }),
      ).rejects.toThrow("Administrator");
    }
    vi.stubEnv("CANCELDT_ADMIN_IDENTITIES", "");
    await expect(admin.query(api.canceldt.admin.permission, {})).rejects.toThrow("Administrator");
  });
  it("keeps reports private, stores once, approves once, rejects without publishing", async () => {
    const { t, admin } = setup();
    const args = { ...content(), key: "test-key" };
    await t.mutation(internal.canceldt.reports.store, args);
    await t.mutation(internal.canceldt.reports.store, args);
    expect(await t.query(api.canceldt.public.latest, {})).toEqual([]);
    const reports = await admin.query(api.canceldt.admin.reports, {
      moderationState: "pending",
      cursor: null,
    });
    expect(reports.page).toHaveLength(1);
    const approval = { ...content(), id: reports.page[0]._id, decision: "approve" as const };
    const first = await admin.mutation(api.canceldt.admin.moderate, approval);
    expect(await admin.mutation(api.canceldt.admin.moderate, approval)).toBe(first);
    expect(await t.query(api.canceldt.public.latest, {})).toHaveLength(1);
    await t.mutation(internal.canceldt.reports.store, {
      ...content("Fictional Rejected"),
      key: "reject-key",
    });
    const queue = await admin.query(api.canceldt.admin.reports, {
      moderationState: "pending",
      cursor: null,
    });
    await admin.mutation(api.canceldt.admin.moderate, {
      ...content(),
      id: queue.page[0]._id,
      decision: "reject",
    });
    expect(await t.query(api.canceldt.public.latest, {})).toHaveLength(1);
  });
  it("requires an explicit versioned correction target", async () => {
    const { t, admin } = setup();
    const id = await admin.mutation(api.canceldt.admin.save, {
      ...content(),
      publicationState: "published",
    });
    await t.mutation(internal.canceldt.reports.store, { ...content(), key: "correction" });
    const queue = await admin.query(api.canceldt.admin.reports, {
      moderationState: "pending",
      cursor: null,
    });
    const approval = { ...content(), id: queue.page[0]._id, decision: "approve" as const };
    await expect(admin.mutation(api.canceldt.admin.moderate, approval)).rejects.toThrow(
      "explicitly",
    );
    expect(
      await admin.mutation(api.canceldt.admin.moderate, {
        ...approval,
        targetId: id,
        targetRevision: 1,
      }),
    ).toBe(id);
  });
  it("enforces spam checks and rate limits even on direct Convex calls", async () => {
    const { t } = setup();
    vi.stubEnv("CANCELDT_TURNSTILE_SECRET", "test-secret");
    vi.stubEnv("CANCELDT_REPORT_HOSTNAMES", "canceldt.test");
    await expect(
      t.action(api.canceldt.reports.submit, {
        ...content(),
        submissionId: "00000000-0000-4000-8000-000000000001",
        token: "",
        website: "",
      }),
    ).rejects.toThrow("spam");
    await expect(
      t.action(api.canceldt.reports.submit, {
        ...content(),
        submissionId: "00000000-0000-4000-8000-000000000001",
        token: "token",
        website: "bot",
      }),
    ).rejects.toThrow("spam");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false }))),
    );
    await expect(
      t.action(api.canceldt.reports.submit, {
        ...content(),
        submissionId: "00000000-0000-4000-8000-000000000001",
        token: "invalid",
        website: "",
      }),
    ).rejects.toThrow("spam");
    await t.run((ctx) => ctx.db.insert("canceldtLimits", { key: "other", count: 0, resetAt: 0 }));
    for (let i = 1; i < 100; i++) await t.mutation(internal.canceldt.reports.reserve, {});
    await expect(t.mutation(internal.canceldt.reports.reserve, {})).rejects.toThrow("limited");
  });
  it("validates hostname/action and accepts a verified report only once", async () => {
    const { t, admin } = setup();
    vi.stubEnv("CANCELDT_TURNSTILE_SECRET", "test-secret");
    vi.stubEnv("CANCELDT_REPORT_HOSTNAMES", "canceldt.test");
    const verify = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ success: true, hostname: "canceldt.test", action: "canceldt-report" }),
        ),
    );
    vi.stubGlobal("fetch", verify);
    const args = {
      ...content(),
      submissionId: "00000000-0000-4000-8000-000000000001",
      token: "valid-test-token",
      website: "",
    };
    await t.action(api.canceldt.reports.submit, args);
    await t.action(api.canceldt.reports.submit, {
      ...args,
      token: "replacement-after-lost-response",
    });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(
      (await admin.query(api.canceldt.admin.reports, { moderationState: "pending", cursor: null }))
        .page,
    ).toHaveLength(1);
    expect(await t.query(api.canceldt.public.latest, {})).toEqual([]);
  });
});
