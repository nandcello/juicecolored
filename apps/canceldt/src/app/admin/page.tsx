import { Suspense } from "react";
import Link from "next/link";
import { fetchQuery } from "@/lib/convex-read";
import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import { requireAdmin, authConfigured, AdminSessionError } from "@/lib/auth";
import { convexOptions } from "@/lib/data";
import { LoginForm, SubjectEditor, ReportEditor } from "@/components/admin-forms";
import { logout } from "@/app/actions";
import { SearchSummary } from "@/components/search-summary";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
type Params = Record<string, string | string[] | undefined>;
const value = (p: Params, key: string) => (typeof p[key] === "string" ? (p[key] as string) : "");
export default function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<p role="status">Checking administrator access…</p>}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}
async function Admin({ searchParams }: { searchParams: Promise<Params> }) {
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
  const p = await searchParams,
    section = value(p, "section") === "reports" ? "reports" : "subjects";
  const options = { ...convexOptions(), token };
  let view;
  if (value(p, "edit") === "new")
    view = (
      <>
        <h2 className="editor-title">New subject</h2>
        <SubjectEditor />
      </>
    );
  else if (value(p, "edit")) {
    const subject = await fetchQuery(
      api.canceldt.admin.subject,
      { id: value(p, "edit") as Id<"canceldtSubjects"> },
      options,
    );
    view = subject ? (
      <>
        <h2 className="editor-title">Edit subject</h2>
        <SubjectEditor key={subject._id} subject={subject} />
      </>
    ) : (
      <p>Subject not found.</p>
    );
  } else if (value(p, "report")) {
    const report = await fetchQuery(
      api.canceldt.admin.report,
      { id: value(p, "report") as Id<"canceldtReports"> },
      options,
    );
    const target = report?.subjectId
      ? await fetchQuery(api.canceldt.admin.subject, { id: report.subjectId }, options)
      : null;
    view = report ? (
      <>
        <h2 className="editor-title">Review report</h2>
        <ReportEditor report={report} target={target} />
      </>
    ) : (
      <p>Report not found.</p>
    );
  } else if (section === "reports") {
    const moderationState =
      value(p, "state") === "approved"
        ? "approved"
        : value(p, "state") === "rejected"
          ? "rejected"
          : "pending";
    const result = await fetchQuery(
      api.canceldt.admin.reports,
      { moderationState, cursor: value(p, "cursor") || null },
      options,
    );
    view = (
      <>
        <nav className="filters" aria-label="Report status">
          {["pending", "approved", "rejected"].map((state) => (
            <Link
              aria-current={state === moderationState ? "page" : undefined}
              key={state}
              href={`/admin?section=reports&state=${state}`}
            >
              {state}
            </Link>
          ))}
        </nav>
        <ul className="admin-list">
          {result.page.map((row) => (
            <li key={row._id}>
              <Link href={`/admin?section=reports&report=${row._id}`}>
                <strong>{row.subject}</strong>
                <span>{row.oneLineReason}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!result.page.length ? <p>No {moderationState} reports.</p> : null}
        {!result.isDone ? (
          <Link
            href={`/admin?section=reports&state=${moderationState}&cursor=${encodeURIComponent(result.continueCursor)}`}
          >
            Next reports →
          </Link>
        ) : null}
      </>
    );
  } else {
    const publicationState =
      value(p, "state") === "draft"
        ? "draft"
        : value(p, "state") === "archived"
          ? "archived"
          : "published";
    const q = value(p, "q").slice(0, 160);
    const result = await fetchQuery(
      api.canceldt.admin.subjects,
      { publicationState, q, cursor: value(p, "cursor") || null },
      options,
    );
    view = (
      <>
        <div className="admin-tools">
          <Link href="/admin?edit=new">+ Add subject</Link>
          <form action="/canceldt/admin">
            <label className="sr-only" htmlFor="admin-search">
              Search subjects
            </label>
            <input
              type="search"
              id="admin-search"
              name="q"
              defaultValue={q}
              maxLength={160}
              placeholder="Search subjects"
            />
            <input type="hidden" name="state" value={publicationState} />
            <button>Find →</button>
          </form>
        </div>
        <nav className="filters" aria-label="Publication status">
          {["draft", "published", "archived"].map((state) => (
            <Link
              aria-current={state === publicationState ? "page" : undefined}
              key={state}
              href={`/admin?state=${state}&q=${encodeURIComponent(q)}`}
            >
              {state}
            </Link>
          ))}
        </nav>
        <ul className="admin-list">
          {result.page.map((row) => (
            <li key={row._id}>
              <Link href={`/admin?edit=${row._id}`}>
                <strong>{row.subject}</strong>
                <span>{row.oneLineReason}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!result.page.length ? <p>No {publicationState} subjects found.</p> : null}
        {!result.isDone ? (
          <Link
            href={`/admin?state=${publicationState}&q=${encodeURIComponent(q)}&cursor=${encodeURIComponent(result.continueCursor)}`}
          >
            Next subjects →
          </Link>
        ) : null}
      </>
    );
  }
  return (
    <>
      <div className="admin-heading">
        <h1 className="page-title">The edit desk.</h1>
        <form action={logout}>
          <button className="text-button">Sign out</button>
        </form>
      </div>
      <nav className="admin-nav" aria-label="Administration">
        <Link href="/admin" aria-current={section === "subjects" ? "page" : undefined}>
          Subjects
        </Link>
        <Link
          href="/admin?section=reports"
          aria-current={section === "reports" ? "page" : undefined}
        >
          Reports
        </Link>
        <Link href="/">View public list ↗</Link>
      </nav>
      {!value(p, "edit") && !value(p, "report") ? (
        <div className="admin-workspace">
          <div className="admin-records">{view}</div>
          <aside className="admin-secondary" aria-label="Site activity">
            <Suspense
              fallback={
                <p className="quiet" role="status">
                  Loading search activity…
                </p>
              }
            >
              <SearchSummary token={token} />
            </Suspense>
          </aside>
        </div>
      ) : (
        view
      )}
    </>
  );
}
