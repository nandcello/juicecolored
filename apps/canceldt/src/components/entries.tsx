import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@personal/convex";
type Entry = FunctionReturnType<typeof api.canceldt.public.latest>[number];
export function date(value: number) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
export function detailHref(slug: string, query?: string) {
  return `/subject/${encodeURIComponent(slug)}${query ? `?q=${encodeURIComponent(query)}` : ""}`;
}
export function Entries({ entries, query }: { entries: Entry[]; query?: string }) {
  return (
    <ol className="entries">
      {entries.map((entry, index) => (
        <li key={entry.slug}>
          <span className="entry-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {entry.hasDetails ? (
            <Link className="entry-body entry-link" href={detailHref(entry.slug, query)}>
              <h2>{entry.subject}</h2>
              <p>{entry.oneLineReason}</p>
              <span className="deets">The deets →</span>
            </Link>
          ) : (
            <div className="entry-body">
              <h2>{entry.subject}</h2>
              <p>{entry.oneLineReason}</p>
            </div>
          )}
          <time dateTime={new Date(entry.publishedAt).toISOString()}>
            {date(entry.publishedAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
