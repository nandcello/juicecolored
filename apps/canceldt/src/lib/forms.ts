import { LIMITS, validateContent } from "@personal/convex/canceldt-model";
import type { Content } from "@personal/convex/canceldt-model";
export type FormState = {
  error?: string;
  sessionExpired?: boolean;
  fields?: Record<string, string>;
  saved?: Content;
  success?: boolean;
  id?: string;
  revision?: number;
  publicationState?: "draft" | "published" | "archived";
};
export function formText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
export function readContent(form: FormData): Content {
  const urls = form.getAll("sourceUrl"),
    titles = form.getAll("sourceTitle");
  if (urls.length > LIMITS.sources) throw new Error("Use at most 12 sources.");
  return {
    subject: formText(form, "subject"),
    oneLineReason: formText(form, "oneLineReason"),
    description: formText(form, "description"),
    sources: urls
      .map((url, i) => ({
        url: (typeof url === "string" ? url : "").trim(),
        title: (typeof titles[i] === "string" ? titles[i] : "").trim(),
      }))
      .filter((s) => s.url || s.title),
  };
}
export function fieldErrors(input: Content): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.subject.trim() || input.subject.length > LIMITS.subject)
    errors.subject = "Enter a subject, up to 160 characters.";
  if (!input.oneLineReason.trim() || input.oneLineReason.length > LIMITS.reason)
    errors.oneLineReason = "Enter a reason, up to 240 characters.";
  if ((input.description?.length ?? 0) > LIMITS.description)
    errors.description = "Use 12,000 characters or fewer.";
  try {
    validateContent({ ...input, subject: "Subject", oneLineReason: "Reason", description: "" });
  } catch {
    errors.sources = "Use up to 12 valid http/https links, with titles up to 160 characters.";
  }
  return errors;
}
