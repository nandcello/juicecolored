import { ConvexError, v } from "convex/values";
export const LIMITS = {
  subject: 160,
  reason: 240,
  description: 12000,
  sources: 12,
  url: 2048,
  title: 160,
};
export const state = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"));
export const moderationState = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const source = v.object({ url: v.string(), title: v.optional(v.string()) });
export const content = {
  subject: v.string(),
  oneLineReason: v.string(),
  description: v.optional(v.string()),
  sources: v.array(source),
};
export const subjectFields = {
  ...content,
  normalizedSubject: v.string(),
  slug: v.string(),
  publicationState: state,
  createdAt: v.number(),
  updatedAt: v.number(),
  publishedAt: v.optional(v.number()),
  revision: v.number(),
};
export const reportFields = {
  ...content,
  moderationState,
  createdAt: v.number(),
  updatedAt: v.number(),
  submissionKey: v.string(),
  subjectId: v.optional(v.id("canceldtSubjects")),
  approvedSubjectId: v.optional(v.id("canceldtSubjects")),
};
export const subjectDoc = v.object({
  ...subjectFields,
  _id: v.id("canceldtSubjects"),
  _creationTime: v.number(),
});
export const reportDoc = v.object({
  ...reportFields,
  _id: v.id("canceldtReports"),
  _creationTime: v.number(),
});
export const summary = v.object({
  subject: v.string(),
  slug: v.string(),
  oneLineReason: v.string(),
  publishedAt: v.number(),
  hasDetails: v.boolean(),
});
export type Content = {
  subject: string;
  oneLineReason: string;
  description?: string;
  sources: { url: string; title?: string }[];
};
export function cleanSubject(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}
export function normalizeSubject(value: string) {
  return cleanSubject(value).toLowerCase().normalize("NFC");
}
export function validateQuery(value: string) {
  if (value.length > LIMITS.subject)
    throw new ConvexError("Use 160 characters or fewer for the subject.");
  return cleanSubject(value);
}
export function validateContent(input: Content): Content {
  const subject = validateQuery(input.subject);
  const oneLineReason = cleanSubject(input.oneLineReason);
  const description = input.description?.normalize("NFC").trim();
  if (!subject) throw new ConvexError("Subject is required.");
  if (!oneLineReason || input.oneLineReason.length > LIMITS.reason)
    throw new ConvexError("Reason is required and must be 240 characters or fewer.");
  if ((input.description?.length ?? 0) > LIMITS.description)
    throw new ConvexError("Description must be 12,000 characters or fewer.");
  if (input.sources.length > LIMITS.sources) throw new ConvexError("Use at most 12 sources.");
  const sources = input.sources.map(({ url, title }) => {
    if (url.length > LIMITS.url || (title?.length ?? 0) > LIMITS.title)
      throw new ConvexError("Source address or title is too long.");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ConvexError("Enter a valid web address for each source.");
    }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new ConvexError("Sources must use http or https without embedded credentials.");
    return { url: parsed.href, ...(title?.trim() ? { title: title.trim() } : {}) };
  });
  return { subject, oneLineReason, ...(description ? { description } : {}), sources };
}
export function slugFor(subject: string) {
  return (
    normalizeSubject(subject)
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "subject"
  );
}
export function toSummary(row: {
  subject: string;
  slug: string;
  oneLineReason: string;
  publishedAt?: number;
  description?: string;
  sources: unknown[];
}) {
  return {
    subject: row.subject,
    slug: row.slug,
    oneLineReason: row.oneLineReason,
    publishedAt: row.publishedAt ?? 0,
    hasDetails: !!row.description?.trim() || row.sources.length > 0,
  };
}
