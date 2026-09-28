import { v } from "convex/values";
import { mutation, query } from "@personal/convex/server";
import { requireAdmin } from "./access";
import { normalizeSubject, validateQuery } from "./model";

// Searches are anonymous submissions. Store only the term and Convex's timestamp.
export const record = mutation({
  args: { q: v.string() },
  returns: v.null(),
  handler: async (ctx, { q }) => {
    const term = validateQuery(q);
    if (term) await ctx.db.insert("canceldtSearches", { query: term });
    return null;
  },
});

export const summary = query({
  args: {},
  returns: v.object({
    searches: v.number(),
    uniqueTerms: v.number(),
    limit: v.number(),
    topTerms: v.array(v.object({ query: v.string(), count: v.number() })),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const limit = 500;
    const rows = await ctx.db
      .query("canceldtSearches")
      .withIndex("by_creation_time")
      .order("desc")
      .take(limit);
    const terms = new Map<string, { query: string; count: number }>();
    for (const row of rows) {
      const key = normalizeSubject(row.query);
      const term = terms.get(key);
      if (term) term.count++;
      else terms.set(key, { query: row.query, count: 1 });
    }
    return {
      searches: rows.length,
      uniqueTerms: terms.size,
      limit,
      topTerms: [...terms.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    };
  },
});

export const list = query({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    page: v.array(
      v.object({ _id: v.id("canceldtSearches"), _creationTime: v.number(), query: v.string() }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("canceldtSearches")
      .withIndex("by_creation_time")
      .order("desc")
      .paginate({ numItems: 25, cursor });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
