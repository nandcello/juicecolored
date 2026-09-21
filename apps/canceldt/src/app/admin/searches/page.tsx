import { Suspense } from "react";
import Link from "next/link";
import { api } from "@personal/convex";
import { fetchQuery } from "@/lib/convex-read";
import { convexOptions } from "@/lib/data";
import { requireAdmin, authConfigured, AdminSessionError } from "@/lib/auth";
import { LoginForm } from "@/components/admin-forms";

export const metadata = { title: "Search history", robots: { index: false, follow: false } };
type Params = Promise<{ cursor?: string | string[] }>;
const dateFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export default function Page({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<p role="status">Loading search history…</p>}>
      <SearchHistory searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchHistory({ searchParams }: { searchParams: Params }) {
  let token: string;
  try {
    token = await requireAdmin();
  } catch (error) {
    if (!(error instanceof AdminSessionError)) throw error;
    return (
      <>
        <h1 className="page-title">Editors only.</h1>
        <LoginForm configured={authConfigured()} />
      </>
    );
  }
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor || null : null;
  const result = await fetchQuery(
    api.canceldt.searches.list,
    { cursor },
    { ...convexOptions(), token },
  );
  return (
    <>
      <Link href="/admin">← Back to dashboard</Link>
      <h1 className="page-title">Search history.</h1>
      <p className="intro">
        Every recorded search, newest first. Up to 25 per page. Times are in Manila (UTC+8).
      </p>
      {result.page.length ? (
        <table className="search-history">
          <caption className="sr-only">Submitted search terms and times</caption>
          <thead>
            <tr>
              <th scope="col">Search term</th>
              <th scope="col">Searched at</th>
            </tr>
          </thead>
          <tbody>
            {result.page.map((row) => (
              <tr key={row._id}>
                <td>{row.query}</td>
                <td>
                  <time dateTime={new Date(row._creationTime).toISOString()}>
                    {dateFormat.format(row._creationTime)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          {cursor
            ? "No more searches."
            : "No searches recorded yet. Submitted searches will appear here."}
        </p>
      )}
      <nav className="search-pagination" aria-label="Search history pages">
        {cursor ? (
          <Link href="/admin/searches">← Newest searches</Link>
        ) : (
          <span className="quiet">Newest searches</span>
        )}
        {!result.isDone ? (
          <Link href={`/admin/searches?cursor=${encodeURIComponent(result.continueCursor)}`}>
            Older searches →
          </Link>
        ) : (
          <span className="quiet">End of history</span>
        )}
      </nav>
    </>
  );
}
