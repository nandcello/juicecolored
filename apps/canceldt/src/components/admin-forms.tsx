"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login, saveSubject, moderateReport } from "@/app/actions";
import { ContentFields } from "./content-fields";
import type { FormState } from "@/lib/forms";
import type { Doc } from "@personal/convex/dataModel";
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="editor">
      <p>Sign in with your CANCELDT admin passphrase.</p>
      {!configured ? (
        <p role="status">
          Owner sign-in is awaiting configuration. Access is denied until setup is complete.
        </p>
      ) : null}
      <label htmlFor="password">Admin passphrase</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={256}
      />
      {state.error ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending || !configured}>{pending ? "Signing in…" : "Sign in →"}</button>
    </form>
  );
}
export function SubjectEditor({ subject }: { subject?: Doc<"canceldtSubjects"> }) {
  const [publicationState, setPublicationState] = useState(subject?.publicationState ?? "draft");
  const [state, action, pending] = useActionState(async (previous: FormState, form: FormData) => {
    const result = await saveSubject(previous, form);
    if (result.success && result.publicationState) setPublicationState(result.publicationState);
    return result;
  }, {});
  return (
    <form action={action} className="editor" onReset={(event) => event.preventDefault()}>
      <input type="hidden" name="id" value={state.id ?? subject?._id ?? ""} />
      <input type="hidden" name="revision" value={state.revision ?? subject?.revision ?? ""} />
      <ContentFields initial={subject} errors={state.fields} />
      <label htmlFor="publicationState">Publication state</label>
      <select
        id="publicationState"
        name="publicationState"
        value={publicationState}
        onChange={(event) => setPublicationState(event.target.value as typeof publicationState)}
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <label className="check">
        <input type="checkbox" name="confirmArchive" value="yes" /> I confirm archiving removes this
        entry from the published list.
      </label>
      {state.error ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
      {state.sessionExpired ? (
        <Link href="/admin" target="_blank" rel="noopener">
          Sign in in a separate tab →
        </Link>
      ) : null}
      <div className="save-status" role="status" aria-atomic="true">
        {state.success && !pending ? (
          <div className="save-confirmation">
            <p>
              Saved. <Link href={`/admin?edit=${state.id}`}>Open saved entry →</Link>
            </p>
            {/* Reload even on edit=new so the saved record ID and all form state are cleared. */}
            <a href="/canceldt/admin?edit=new">Create another subject →</a>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <button type="submit" name="intent" value="draft" disabled={pending} className="secondary">
          Save draft
        </button>
        <button type="submit" name="intent" value="published" disabled={pending}>
          Publish →
        </button>
        <button type="submit" disabled={pending} className="secondary">
          Save selected state
        </button>
      </div>
      <p className="quiet">
        Publishing restores archived entries. The original publication date stays unchanged.
      </p>
    </form>
  );
}
export function ReportEditor({
  report,
  target,
}: {
  report: Doc<"canceldtReports">;
  target?: Doc<"canceldtSubjects"> | null;
}) {
  const [state, action, pending] = useActionState(moderateReport, {});
  if (state.success)
    return (
      <p role="status">
        Report reviewed.{" "}
        {state.id ? (
          <Link href={`/admin?edit=${state.id}`}>View saved subject →</Link>
        ) : (
          <Link href="/admin?section=reports">Back to reports →</Link>
        )}
      </p>
    );
  return (
    <form action={action} className="editor">
      <input type="hidden" name="reportId" value={report._id} />
      <input type="hidden" name="targetId" value={target?._id ?? ""} />
      <input type="hidden" name="targetRevision" value={target?.revision ?? ""} />
      <p className="quiet">
        Status: {report.moderationState}.{" "}
        {target ? `Approval updates “${target.subject}”.` : "Approval creates a published subject."}
      </p>
      <ContentFields initial={report} errors={state.fields} />
      {target ? (
        <details>
          <summary>Compare current published/editorial content</summary>
          <p>{target.oneLineReason}</p>
          <p className="description">{target.description}</p>
          <ul>
            {target.sources.map((source, i) => (
              <li key={i}>{source.title ?? source.url}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <label className="check">
        <input type="checkbox" name="confirmPublish" value="yes" /> I reviewed this report and
        intend to publish these edited details.
      </label>
      {state.error ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
      <div className="actions">
        <button
          name="intent"
          value="approve"
          disabled={pending || report.moderationState !== "pending"}
        >
          Approve & publish →
        </button>
        <button
          name="intent"
          value="reject"
          className="secondary"
          formNoValidate
          disabled={pending || report.moderationState !== "pending"}
        >
          Reject report
        </button>
      </div>
    </form>
  );
}
