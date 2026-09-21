import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { content, normalizeSubject, validateContent } from "./model";
export const received = internalQuery({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { key }) =>
    !!(await ctx.db
      .query("canceldtReports")
      .withIndex("by_submissionKey", (q) => q.eq("submissionKey", key))
      .unique()),
});
export const reserve = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const row = await ctx.db
      .query("canceldtLimits")
      .withIndex("by_key", (q) => q.eq("key", "reports"))
      .unique();
    if (row && row.resetAt > now && row.count >= 100)
      throw new ConvexError("Reports are temporarily limited. Try again in an hour.");
    if (row)
      await ctx.db.patch("canceldtLimits", row._id, {
        count: row.resetAt > now ? row.count + 1 : 1,
        resetAt: row.resetAt > now ? row.resetAt : now + 3600000,
      });
    else
      await ctx.db.insert("canceldtLimits", { key: "reports", count: 1, resetAt: now + 3600000 });
    return null;
  },
});
export const store = internalMutation({
  args: { ...content, key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = validateContent(args);
    if (
      await ctx.db
        .query("canceldtReports")
        .withIndex("by_submissionKey", (q) => q.eq("submissionKey", args.key))
        .unique()
    )
      return null;
    const subject = await ctx.db
      .query("canceldtSubjects")
      .withIndex("by_normalizedSubject", (q) =>
        q.eq("normalizedSubject", normalizeSubject(data.subject)),
      )
      .unique();
    const now = Date.now();
    await ctx.db.insert("canceldtReports", {
      ...data,
      submissionKey: args.key,
      moderationState: "pending",
      createdAt: now,
      updatedAt: now,
      ...(subject ? { subjectId: subject._id } : {}),
    });
    return null;
  },
});
export const submit = action({
  args: { ...content, token: v.string(), website: v.string(), submissionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = validateContent(args);
    if (!/^[0-9a-f-]{36}$/i.test(args.submissionId))
      throw new ConvexError("Reload the report form and try again.");
    const secret = process.env.CANCELDT_TURNSTILE_SECRET;
    const hostnames = (process.env.CANCELDT_REPORT_HOSTNAMES ?? "").split(",").filter(Boolean);
    if (!secret || !hostnames.length)
      throw new ConvexError("Reporting is not configured yet. Please try again later.");
    if (args.website || !args.token || args.token.length > 2048)
      throw new ConvexError("Complete the spam check and try again.");
    // No IP, email, or user-agent retained. A submission/content pair stays idempotent even after its CAPTCHA token expires.
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify([args.submissionId, data])),
    );
    const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    if (await ctx.runQuery(internal.canceldt.reports.received, { key })) return null;
    await ctx.runMutation(internal.canceldt.reports.reserve, {});
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: args.token, idempotency_key: crypto.randomUUID() }),
      signal: AbortSignal.timeout(10000),
    });
    const verdict = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    if (
      !response.ok ||
      !verdict.success ||
      !hostnames.includes(verdict.hostname ?? "") ||
      (verdict.action ?? "") !== (process.env.CANCELDT_REPORT_ACTION ?? "canceldt-report")
    )
      throw new ConvexError("The spam check expired or failed. Complete it again.");
    await ctx.runMutation(internal.canceldt.reports.store, { ...data, key });
    return null;
  },
});
