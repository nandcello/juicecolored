// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("restaurant review offline sync", () => {
  it("is idempotent and only accepts newer client revisions", async () => {
    const t = convexTest(schema, modules);
    const base = {
      clientId: "review-client-id",
      clientCreatedAt: 100,
      restaurantName: "First name",
      review: "recommend" as const,
    };

    const first = await t.mutation(api.restaurantReviews.syncUpsert, {
      ...base,
      clientRevision: 1,
    });
    const duplicate = await t.mutation(api.restaurantReviews.syncUpsert, {
      ...base,
      clientRevision: 1,
      restaurantName: "Ignored duplicate",
    });
    expect(duplicate.id).toBe(first.id);

    await t.mutation(api.restaurantReviews.syncUpsert, {
      ...base,
      clientRevision: 2,
      restaurantName: "Latest name",
    });
    const active = await t.query(api.restaurantReviews.list, {});
    expect(active).toHaveLength(1);
    expect(active[0]?.restaurantName).toBe("Latest name");
  }, 30_000);

  it("keeps a tombstone so a replay cannot resurrect a deleted review", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.restaurantReviews.syncUpsert, {
      clientId: "deleted-review",
      clientRevision: 1,
      clientCreatedAt: 100,
      restaurantName: "Deleted place",
      review: "can visit again",
    });
    await t.mutation(api.restaurantReviews.syncRemove, {
      clientId: "deleted-review",
      clientRevision: 2,
    });
    await t.mutation(api.restaurantReviews.syncUpsert, {
      clientId: "deleted-review",
      clientRevision: 1,
      clientCreatedAt: 100,
      restaurantName: "Stale replay",
      review: "recommend",
    });

    expect(await t.query(api.restaurantReviews.list, {})).toEqual([]);
    const page = await t.query(api.restaurantReviews.syncPage, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page[0]?.deletedAt).toEqual(expect.any(Number));
    expect(page.page[0]?.clientRevision).toBe(2);
  }, 30_000);
});
