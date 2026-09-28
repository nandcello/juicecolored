import type { Metadata } from "next";
import { publicPath, searchPath, subjectPath } from "./share";

export const metadataBase = new URL(
  process.env.CANCELDT_PUBLIC_ORIGIN || "https://juicecolored.com",
);

type SubjectSummary = { subject: string; slug: string; oneLineReason: string };
export type Preview = {
  subject: string;
  headline: string;
  status: "cancelled" | "unlisted" | "matches";
};

export function subjectPreview(entry: SubjectSummary): Preview {
  return { subject: entry.subject, headline: entry.oneLineReason, status: "cancelled" };
}

export function searchPreview(
  query: string,
  result: { exact: SubjectSummary | null; matches: SubjectSummary[] },
): Preview {
  if (result.exact) return subjectPreview(result.exact);
  return {
    subject: query,
    headline: result.matches.length
      ? "Select the subject you mean."
      : "No entry in CANCELDT’s published list.",
    status: result.matches.length ? "matches" : "unlisted",
  };
}

export function previewTitle(preview: Preview) {
  if (preview.status === "matches") return `Matching subjects for ${preview.subject}`;
  return `${preview.subject} is ${preview.status === "unlisted" ? "not " : ""}cancelled.`;
}

export function previewMetadata(
  preview: Preview,
  target: { slug: string } | { query: string },
): Metadata {
  const path = "slug" in target ? subjectPath(target.slug) : searchPath(target.query);
  const imageQuery = new URLSearchParams(
    "slug" in target ? { slug: target.slug } : { q: target.query },
  );
  const title = previewTitle(preview);
  const image = {
    url: new URL(`/canceldt/api/og?${imageQuery}`, metadataBase).href,
    width: 1200,
    height: 630,
    alt: `${title} ${preview.headline}`,
  };
  const url = new URL(publicPath(path), metadataBase).href;
  return {
    title,
    description: preview.headline,
    alternates: { canonical: url },
    ...("query" in target ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: "CANCELDT.",
      title,
      description: preview.headline,
      url,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description: preview.headline, images: [image] },
  };
}

export const socialImage = {
  url: "https://y7kkt57ty2.ufs.sh/f/3pZynuxERv0OtcWQynfEBHSFZiuXUv0IfOr3lkgGPYtCJA84",
  width: 1200,
  height: 630,
  alt: "CANCELDT.",
};
