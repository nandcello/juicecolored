import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAdmin } from "./access";
import {
  content,
  state,
  subjectDoc,
  reportDoc,
  moderationState,
  validateContent,
  normalizeSubject,
  slugFor,
  validateQuery,
} from "./model";
import type { Content } from "./model";
export const permission = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});
export const subjects = query({
  args: { q: v.string(), publicationState: state, cursor: v.union(v.string(), v.null()) },
  returns: v.object({ page: v.array(subjectDoc), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const key = normalizeSubject(validateQuery(args.q));
    const query = key
      ? ctx.db
          .query("canceldtSubjects")
          .withSearchIndex("search_subject", (q) =>
            q.search("normalizedSubject", key).eq("publicationState", args.publicationState),
          )
      : ctx.db
          .query("canceldtSubjects")
          .withIndex("by_publicationState_and_publishedAt", (q) =>
            q.eq("publicationState", args.publicationState),
          )
          .order("desc");
    const result = await query.paginate({ numItems: 20, cursor: args.cursor });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const subject = query({
  args: { id: v.id("canceldtSubjects") },
  returns: v.union(subjectDoc, v.null()),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return ctx.db.get("canceldtSubjects", id);
  },
});
export const reports = query({
  args: { moderationState, cursor: v.union(v.string(), v.null()) },
  returns: v.object({ page: v.array(reportDoc), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("canceldtReports")
      .withIndex("by_moderationState", (q) => q.eq("moderationState", args.moderationState))
      .order("asc")
      .paginate({ numItems: 20, cursor: args.cursor });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const report = query({
  args: { id: v.id("canceldtReports") },
  returns: v.union(reportDoc, v.null()),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return ctx.db.get("canceldtReports", id);
  },
});
async function saveContent(
  ctx: MutationCtx,
  input: Content,
  publicationState: "draft" | "published" | "archived",
  id?: Id<"canceldtSubjects">,
  revision?: number,
) {
  const data = validateContent(input),
    normalizedSubject = normalizeSubject(data.subject);
  const old = id ? await ctx.db.get("canceldtSubjects", id) : null;
  if (id && !old) throw new ConvexError("Subject no longer exists.");
  if (old && old.revision !== revision)
    throw new ConvexError("Another edit was saved. Reload before overwriting it.");
  const duplicate = await ctx.db
    .query("canceldtSubjects")
    .withIndex("by_normalizedSubject", (q) => q.eq("normalizedSubject", normalizedSubject))
    .unique();
  if (duplicate && duplicate._id !== id)
    throw new ConvexError(
      "This subject already exists. Edit it, or qualify the name for a distinct subject.",
    );
  // Keep published URLs stable when correcting display spelling.
  const slug = old?.slug ?? slugFor(data.subject);
  const collision = await ctx.db
    .query("canceldtSubjects")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (collision && collision._id !== id)
    throw new ConvexError(
      "This address already exists. Add a clear qualifier to the subject name.",
    );
  const now = Date.now();
  const values = {
    ...data,
    description: data.description,
    normalizedSubject,
    slug,
    publicationState,
    updatedAt: now,
    revision: (old?.revision ?? 0) + 1,
    ...(old?.publishedAt !== undefined
      ? { publishedAt: old.publishedAt }
      : publicationState === "published"
        ? { publishedAt: now }
        : {}),
  };
  if (old) {
    await ctx.db.patch("canceldtSubjects", old._id, values);
    return old._id;
  }
  return ctx.db.insert("canceldtSubjects", { ...values, createdAt: now });
}
export const save = mutation({
  args: {
    ...content,
    publicationState: state,
    id: v.optional(v.id("canceldtSubjects")),
    revision: v.optional(v.number()),
  },
  returns: v.id("canceldtSubjects"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return saveContent(ctx, args, args.publicationState, args.id, args.revision);
  },
});
export const moderate = mutation({
  args: {
    id: v.id("canceldtReports"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    ...content,
    targetId: v.optional(v.id("canceldtSubjects")),
    targetRevision: v.optional(v.number()),
  },
  returns: v.union(v.id("canceldtSubjects"), v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const report = await ctx.db.get("canceldtReports", args.id);
    if (!report) throw new ConvexError("Report no longer exists.");
    if (report.moderationState !== "pending") {
      if (args.decision === "approve" && report.moderationState === "approved")
        return report.approvedSubjectId ?? null;
      if (args.decision === "reject" && report.moderationState === "rejected") return null;
      throw new ConvexError("This report has already been moderated.");
    }
    if (args.decision === "reject") {
      await ctx.db.patch("canceldtReports", report._id, {
        moderationState: "rejected",
        updatedAt: Date.now(),
      });
      return null;
    }
    if (report.subjectId && args.targetId !== report.subjectId)
      throw new ConvexError("A correction must explicitly update its existing subject.");
    const subjectId = await saveContent(ctx, args, "published", args.targetId, args.targetRevision);
    await ctx.db.patch("canceldtReports", report._id, {
      moderationState: "approved",
      approvedSubjectId: subjectId,
      updatedAt: Date.now(),
    });
    return subjectId;
  },
});
