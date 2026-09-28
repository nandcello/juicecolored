import { v } from "convex/values";
import { query } from "@personal/convex/server";
import { normalizeSubject, validateQuery, summary, toSummary } from "./model";
export const latest = query({
  args: {},
  returns: v.array(summary),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("canceldtSubjects")
      .withIndex("by_publicationState_and_publishedAt", (q) =>
        q.eq("publicationState", "published"),
      )
      .order("desc")
      .take(5);
    return rows.map(toSummary);
  },
});
export const search = query({
  args: { q: v.string() },
  returns: v.object({ exact: v.union(summary, v.null()), matches: v.array(summary) }),
  handler: async (ctx, { q }) => {
    const cleaned = validateQuery(q);
    if (!cleaned) return { exact: null, matches: [] };
    const key = normalizeSubject(cleaned);
    const exact = await ctx.db
      .query("canceldtSubjects")
      .withIndex("by_normalizedSubject", (q) => q.eq("normalizedSubject", key))
      .unique();
    if (exact?.publicationState === "published") return { exact: toSummary(exact), matches: [] };
    const matches = await ctx.db
      .query("canceldtSubjects")
      .withSearchIndex("search_subject", (q) =>
        q.search("normalizedSubject", key).eq("publicationState", "published"),
      )
      .take(20);
    return { exact: null, matches: matches.map(toSummary) };
  },
});
export const detail = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      ...summary.fields,
      description: v.optional(v.string()),
      sources: v.array(v.object({ url: v.string(), title: v.optional(v.string()) })),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { slug }) => {
    if (slug.length > 200) return null;
    const row = await ctx.db
      .query("canceldtSubjects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!row || row.publicationState !== "published") return null;
    return {
      ...toSummary(row),
      ...(row.description ? { description: row.description } : {}),
      sources: row.sources,
      updatedAt: row.updatedAt,
    };
  },
});
