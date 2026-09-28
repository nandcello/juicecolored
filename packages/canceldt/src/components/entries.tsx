import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@personal/convex";
import { ShareButton } from "./share-button";
import { publicPath, subjectPath } from "../lib/share";
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
  return `${publicPath(subjectPath(slug))}${query ? `?q=${encodeURIComponent(query)}` : ""}`;
}
export function Entries({ entries, query }: { entries: Entry[]; query?: string }) {
  return (
    <ol className="entries">
      {entries.map((entry, index) => (
        <li key={entry.slug}>
          <span className="entry-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Link className="entry-body entry-link" href={detailHref(entry.slug, query)}>
            <h2>{entry.subject}</h2>
            <p>{entry.oneLineReason}</p>
            <span className="deets">{entry.hasDetails ? "The deets →" : "View record →"}</span>
          </Link>
          <div className="entry-actions">
            <time dateTime={new Date(entry.publishedAt).toISOString()}>
              {date(entry.publishedAt)}
            </time>
            <ShareButton path={subjectPath(entry.slug)} />
          </div>
        </li>
      ))}
    </ol>
  );
}
