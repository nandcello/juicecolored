import { Suspense } from "react";
import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { cleanSubject } from "@personal/convex/canceldt-model";
export const metadata = { title: "Report or correct an entry" };
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string | string[] }>;
}) {
  return (
    <>
      <Link className="backlink" href="/">
        ← Back to the list
      </Link>
      <h1 className="page-title">Make your case.</h1>
      <p className="intro">
        Suggest an entry. Challenge an entry. Give us the reason and the sources.
      </p>
      <Suspense fallback={<p role="status">Loading form…</p>}>
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}
async function Report({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.subject) ? params.subject[0] : params.subject;
  return (
    <ReportForm
      submissionId={crypto.randomUUID()}
      subject={cleanSubject(raw ?? "").slice(0, 160)}
      siteKey={
        process.env.CANCELDT_TURNSTILE_SITE_KEY ??
        process.env.NEXT_PUBLIC_CANCELDT_TURNSTILE_SITE_KEY
      }
    />
  );
}
