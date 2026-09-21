import { PublicFreshness } from "@/components/public-freshness";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { detail } from "@/lib/data";
import { date } from "@/components/entries";
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
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    notFound();
  }
  const entry = await detail(decodedSlug);
  if (!entry) notFound();
  const q = typeof search.q === "string" && search.q.length <= 160 ? search.q : "";
  return (
    <article className="detail">
      <PublicFreshness />
      <Link className="backlink" href={q ? `/?q=${encodeURIComponent(q)}` : "/"}>
        ← {q ? "Back to search" : "Back to the list"}
      </Link>
      <p className="eyebrow red">CANCELLED · THE DEETS</p>
      <h1>{entry.subject}</h1>
      <p className="reason">{entry.oneLineReason}</p>
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
        href={`/report?subject=${encodeURIComponent(entry.subject)}`}
      >
        Something wrong? Submit a correction.
      </Link>
    </article>
  );
}
