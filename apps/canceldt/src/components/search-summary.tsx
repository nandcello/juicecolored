import Link from "next/link";
import { api } from "@personal/convex";
import { fetchQuery } from "@/lib/convex-read";
import { convexOptions } from "@/lib/data";

export async function SearchSummary({ token }: { token: string }) {
  const summary = await fetchQuery(
    api.canceldt.searches.summary,
    {},
    { ...convexOptions(), token },
  );
  return (
    <section className="search-summary" aria-labelledby="search-summary-title">
      <h2 id="search-summary-title">Search activity</h2>
      <p className="quiet">Latest {summary.limit} submissions</p>
      {summary.searches ? (
        <>
          <dl className="search-stats">
            <div>
              <dt>Searches</dt>
              <dd>{summary.searches.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Unique terms</dt>
              <dd>{summary.uniqueTerms.toLocaleString("en-US")}</dd>
            </div>
          </dl>
          <h3 className="eyebrow">TOP TERMS</h3>
          <ol className="search-terms">
            {summary.topTerms.slice(0, 3).map((term) => (
              <li key={term.query}>
                <span title={term.query}>{term.query}</span>
                <strong aria-label={`${term.count} ${term.count === 1 ? "search" : "searches"}`}>
                  {term.count}
                </strong>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="quiet">No searches recorded yet.</p>
      )}
      <Link className="search-summary-link" href="/admin/searches">
        View all searches →
      </Link>
    </section>
  );
}
