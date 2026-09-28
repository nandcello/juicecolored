import { defineTable } from "convex/server";
import { v } from "convex/values";
import { subjectFields, reportFields } from "./model";

export const canceldtTables = {
  canceldtSearches: defineTable({ query: v.string() }),
  canceldtSubjects: defineTable(subjectFields)
    .index("by_publicationState_and_publishedAt", ["publicationState", "publishedAt"])
    .index("by_normalizedSubject", ["normalizedSubject"])
    .index("by_slug", ["slug"])
    .searchIndex("search_subject", {
      searchField: "normalizedSubject",
      filterFields: ["publicationState"],
    }),
  canceldtReports: defineTable(reportFields)
    .index("by_moderationState", ["moderationState"])
    .index("by_submissionKey", ["submissionKey"]),
  canceldtLimits: defineTable({ key: v.string(), count: v.number(), resetAt: v.number() }).index(
    "by_key",
    ["key"],
  ),
};
