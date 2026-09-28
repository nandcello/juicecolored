import { PublicFreshness } from "../../../components/public-freshness";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { detail } from "../../../lib/data";
import { date } from "../../../components/entries";
import type { Metadata } from "next";
import { previewMetadata, subjectPreview } from "../../../lib/metadata";
import { subjectPath } from "../../../lib/share";
import { ShareButton } from "../../../components/share-button";

async function loadSubject(slug: string) {
  // Client navigation can preserve percent escapes in dynamic route parameters.
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    notFound();
  }
  return detail(decoded);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await loadSubject(slug);
  if (!entry) notFound();
  return previewMetadata(subjectPreview(entry), { slug: entry.slug });
}
export default function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p role="status">Loading the deets…</p>}>
      <Subject {...props} />
    </Suspense>
  );
}
async function Subject({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const entry = await loadSubject(slug);
  if (!entry) notFound();
  const q = typeof search.q === "string" && search.q.length <= 160 ? search.q : "";
  return (
    <article className="detail">
      <PublicFreshness />
      <Link className="backlink" href={q ? `/canceldt?q=${encodeURIComponent(q)}` : "/canceldt"}>
        ← {q ? "Back to search" : "Back to the list"}
      </Link>
      <p className="eyebrow red">CANCELLED · THE DEETS</p>
      <h1>{entry.subject}</h1>
      <p className="reason">{entry.oneLineReason}</p>
      <ShareButton path={subjectPath(entry.slug)} />
      {entry.description ? <div className="description">{entry.description}</div> : null}
      {entry.sources.length ? (
        <section className="sources">
          <h2>SOURCES</h2>
          <ul>
            {entry.sources.map((source, index) => (
              <li key={`${source.url}-${index}`}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title || new URL(source.url).hostname} ↗
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="quiet">
        Published {date(entry.publishedAt)} · Updated {date(entry.updatedAt)}
      </p>
      <Link
        prefetch={false}
        className="report-link"
        href={`/canceldt/report?subject=${encodeURIComponent(entry.subject)}`}
      >
        Something wrong? Submit a correction.
      </Link>
    </article>
  );
}
