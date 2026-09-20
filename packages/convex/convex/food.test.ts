// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("food photo offline sync", () => {
  it("reuses the same food record when an accepted upload is retried", async () => {
    const t = convexTest(schema, modules);
    const firstStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["first upload"], { type: "image/png" })),
    );
    const first = await t.mutation(internal.food.createPendingUpload, {
      clientId: "stable-local-food-id",
      clientRevision: 1,
      clientCreatedAt: 100,
      storageId: firstStorageId,
      contentType: "image/png",
    });

    const retryStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["retried upload"], { type: "image/png" })),
    );
    const retry = await t.mutation(internal.food.createPendingUpload, {
      clientId: "stable-local-food-id",
      clientRevision: 1,
      clientCreatedAt: 100,
      storageId: retryStorageId,
      contentType: "image/png",
    });

    expect(retry.foodId).toBe(first.foodId);
    expect(retry.status).toBe("pending");
    expect(await t.run((ctx) => ctx.db.query("food").take(10))).toHaveLength(1);
    expect(await t.run((ctx) => ctx.storage.get(retryStorageId))).toBeNull();
  });
});
