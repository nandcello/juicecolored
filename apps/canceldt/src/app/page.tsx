import { PublicFreshness } from "@/components/public-freshness";
import { Suspense } from "react";
import Link from "next/link";
import { latest, search } from "@/lib/data";
import { cleanSubject } from "@personal/convex/canceldt-model";
import { Entries, detailHref } from "@/components/entries";
import { SearchForm } from "@/components/search-form";
type Params = Promise<{ q?: string | string[] }>;
export default function Page({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <>
          <SearchForm query="" />
          <p role="status" className="pending">
            Checking the list…
          </p>
        </>
      }
    >
      <Results searchParams={searchParams} />
    </Suspense>
  );
}
async function Results({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  // First occurrence wins, matching a normal GET search form.
  const raw = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const query = cleanSubject(raw);
  if (raw.length > 160)
    return (
      <>
        <SearchForm query={query.slice(0, 160)} />
        <p role="alert">Use 160 characters or fewer for the subject. The check was not run.</p>
      </>
    );
  let content;
  try {
    if (!query) {
      const rows = await latest();
      content = (
        <section aria-labelledby="latest-title">
          <div className="section-label">
            <h1 id="latest-title">LATEST CANCELS</h1>
            <span>The published list</span>
          </div>
          {rows.length ? (
            <Entries entries={rows} />
          ) : (
            <div className="empty">
              <h2>No cancels. Yet.</h2>
              <p>There are no published entries in the list.</p>
              <Link prefetch={false} href="/report">
                Have something to submit? Report it →
              </Link>
            </div>
          )}
        </section>
      );
    } else {
      const result = await search(query);
      if (result.exact)
        content = (
          <section className="verdict">
            <p className="eyebrow">ON THE PUBLISHED LIST</p>
            <h1>
              {result.exact.subject}
              <br />
              <span className="red">is cancelled.</span>
            </h1>
            <p className="reason">{result.exact.oneLineReason}</p>
            {result.exact.hasDetails ? (
              <Link className="deets" href={detailHref(result.exact.slug, query)}>
                The deets →
              </Link>
            ) : null}
            <p className="quiet context">An entry in CANCELDT’s curated published list.</p>
          </section>
        );
      else if (result.matches.length)
        content = (
          <section>
            <div className="section-label">
              <h1>Matching subjects</h1>
              <span>Select the subject you mean</span>
            </div>
            <Entries entries={result.matches} query={query} />
            {result.matches.length === 20 ? (
              <p className="quiet">
                Showing the first 20 matches. Refine the name to narrow the list.
              </p>
            ) : null}
          </section>
        );
      else
        content = (
          <section className="verdict">
            <p className="eyebrow">NOT ON THE PUBLISHED LIST</p>
            <h1>
              {query}
              <br />
              is not cancelled.
            </h1>
            <p className="quiet">No entry in CANCELDT’s published list.</p>
            <Link
              prefetch={false}
              className="report-link"
              href={`/report?subject=${encodeURIComponent(query)}`}
            >
              Should be cancelled? Report it.
            </Link>
          </section>
        );
    }
  } catch {
    content = (
      <section className="lookup-error" role="alert">
        <h1>Couldn’t check the list.</h1>
        <p>The check could not be completed. Please try again.</p>
        <a href={query ? `/canceldt?q=${encodeURIComponent(query)}` : "/canceldt"}>Retry →</a>
      </section>
    );
  }
  return (
    <>
      <PublicFreshness />
      <SearchForm query={query} />
      <div id="results" aria-live="polite">
        {content}
      </div>
    </>
  );
}
