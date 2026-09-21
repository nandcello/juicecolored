// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { FunctionReturnType } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const issuer = "https://canceldt.test";
const owner = { issuer, subject: "owner", tokenIdentifier: `${issuer}|owner` };
function setup() {
  const t = convexTest(schema, modules);
  return { t, admin: t.withIdentity(owner) };
}
beforeEach(() => {
  vi.stubEnv("CANCELDT_AUTH_ISSUER", issuer);
  vi.stubEnv("CANCELDT_ADMIN_IDENTITIES", owner.tokenIdentifier);
});
afterEach(() => vi.unstubAllEnvs());

describe("CANCELDT search analytics", () => {
  it("records submissions, skips blanks, rejects oversized terms and groups variants", async () => {
    const { t, admin } = setup();
    await t.mutation(api.canceldt.searches.record, { q: "  " });
    await expect(t.mutation(api.canceldt.searches.record, { q: "x".repeat(161) })).rejects.toThrow(
      "160",
    );
    expect(await admin.query(api.canceldt.searches.summary, {})).toMatchObject({
      searches: 0,
      uniqueTerms: 0,
      topTerms: [],
    });
    for (const q of ["  Cafe\u0301   Society ", "CAFÉ SOCIETY", "Nobody"])
      await t.mutation(api.canceldt.searches.record, { q });
    const summary = await admin.query(api.canceldt.searches.summary, {});
    expect(summary).toMatchObject({ searches: 3, uniqueTerms: 2 });
    expect(summary.topTerms[0]).toEqual({ query: "CAFÉ SOCIETY", count: 2 });
    const history = await admin.query(api.canceldt.searches.list, { cursor: null });
    expect(history.page.map((row) => row.query)).toEqual([
      "Nobody",
      "CAFÉ SOCIETY",
      "Café Society",
    ]);
    await t.query(api.canceldt.public.search, { q: "Nobody" });
    expect((await admin.query(api.canceldt.searches.summary, {})).searches).toBe(3);
  });

  it("denies anonymous/non-admin reads and fails closed without an allowlist", async () => {
    const { t, admin } = setup();
    for (const caller of [
      t,
      t.withIdentity({ issuer, subject: "visitor", tokenIdentifier: `${issuer}|visitor` }),
    ]) {
      await expect(caller.query(api.canceldt.searches.summary, {})).rejects.toThrow(
        "Administrator",
      );
      await expect(caller.query(api.canceldt.searches.list, { cursor: null })).rejects.toThrow(
        "Administrator",
      );
    }
    vi.stubEnv("CANCELDT_ADMIN_IDENTITIES", "");
    await expect(admin.query(api.canceldt.searches.summary, {})).rejects.toThrow("Administrator");
  });

  it("paginates all history without overlaps and summarizes only the latest 500", async () => {
    const { t, admin } = setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 506; i++)
        await ctx.db.insert("canceldtSearches", { query: i < 6 ? "Old search" : `Term ${i % 6}` });
    });
    const summary = await admin.query(api.canceldt.searches.summary, {});
    expect(summary).toMatchObject({ searches: 500, uniqueTerms: 6, limit: 500 });
    expect(summary.topTerms).toHaveLength(5);
    expect(summary.topTerms.some((term) => term.query === "Old search")).toBe(false);
    const ids = new Set<string>();
    let cursor: string | null = null;
    for (;;) {
      const result: FunctionReturnType<typeof api.canceldt.searches.list> = await admin.query(
        api.canceldt.searches.list,
        { cursor },
      );
      expect(result.page.length).toBeLessThanOrEqual(25);
      for (const row of result.page) {
        expect(ids.has(row._id)).toBe(false);
        ids.add(row._id);
      }
      if (result.isDone) break;
      cursor = result.continueCursor;
    }
    expect(ids.size).toBe(506);
  });
});
