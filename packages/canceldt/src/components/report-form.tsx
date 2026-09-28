"use client";
import { useActionState } from "react";
import Link from "next/link";
import { submitReport } from "../actions";
import { ContentFields } from "./content-fields";
import { TurnstileCheck } from "./turnstile";
export function ReportForm({
  subject,
  siteKey,
  submissionId,
}: {
  subject: string;
  siteKey?: string;
  submissionId: string;
}) {
  const [state, action, pending] = useActionState(
    async (
      previous: {
        attempt: number;
        error?: string;
        fields?: Record<string, string>;
        success?: boolean;
      },
      form: FormData,
    ) => ({ ...(await submitReport(previous, form)), attempt: previous.attempt + 1 }),
    { attempt: 0 },
  );
  if (state.success)
    return (
      <div
        role="status"
        className="empty report-confirmation"
        tabIndex={-1}
        ref={(element) => element?.focus()}
      >
        <h2>Received. Under review.</h2>
        <p>Your report is private. Nothing has been published or changed.</p>
        <Link href="/canceldt">Back to the list →</Link>
      </div>
    );
  return (
    <form action={action} className="editor">
      <input type="hidden" name="submissionId" value={submissionId} />
      <ContentFields initial={{ subject }} errors={state.fields} />
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {siteKey ? (
        <TurnstileCheck siteKey={siteKey} attempt={state.attempt} />
      ) : (
        <p role="status">Reporting is awaiting spam-protection setup. Please check back later.</p>
      )}
      {state.error ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending || !siteKey} type="submit">
        {pending ? "Submitting…" : "Submit for review →"}
      </button>
      <p className="quiet">An editor reviews every report. No account or contact details needed.</p>
    </form>
  );
}
