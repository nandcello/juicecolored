"use client";
import { useState } from "react";
import { LIMITS } from "@personal/convex/canceldt-model";
import type { Content } from "@personal/convex/canceldt-model";
export function ContentFields({
  initial,
  errors = {},
}: {
  initial?: Partial<Content>;
  errors?: Record<string, string>;
}) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sources, setSources] = useState(() =>
    (initial?.sources ?? []).map((s, i) => ({ ...s, key: i })),
  );
  const [nextKey, setNextKey] = useState(sources.length);
  const [reason, setReason] = useState(initial?.oneLineReason ?? "");
  return (
    <>
      <label htmlFor="subject">
        Subject <span>Required · 160 characters max</span>
      </label>
      <input
        id="subject"
        name="subject"
        required
        maxLength={LIMITS.subject}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        aria-invalid={!!errors.subject}
        aria-describedby={errors.subject ? "subject-error" : undefined}
      />
      {errors.subject ? (
        <p id="subject-error" className="field-error">
          {errors.subject}
        </p>
      ) : null}
      <label htmlFor="reason">
        One-line reason{" "}
        <span>
          {reason.length} / {LIMITS.reason}
        </span>
      </label>
      <textarea
        id="reason"
        name="oneLineReason"
        rows={2}
        required
        maxLength={LIMITS.reason}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-invalid={!!errors.oneLineReason}
        aria-describedby={errors.oneLineReason ? "reason-error" : undefined}
      />
      {errors.oneLineReason ? (
        <p id="reason-error" className="field-error">
          {errors.oneLineReason}
        </p>
      ) : null}
      <label htmlFor="description">
        Additional description <span>Optional · 12,000 characters max</span>
      </label>
      <textarea
        id="description"
        name="description"
        rows={6}
        maxLength={LIMITS.description}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        aria-invalid={!!errors.description}
      />
      {errors.description ? <p className="field-error">{errors.description}</p> : null}
      <fieldset className="source-fields">
        <legend>
          Sources <span>Optional · up to 12 web links</span>
        </legend>
        {sources.map((s, index) => (
          <div className="source-row" key={s.key}>
            <label htmlFor={`url-${s.key}`}>Source {index + 1} address</label>
            <input
              id={`url-${s.key}`}
              name="sourceUrl"
              type="url"
              maxLength={LIMITS.url}
              placeholder="https://"
              value={s.url}
              onChange={(event) =>
                setSources((rows) =>
                  rows.map((row) =>
                    row.key === s.key ? { ...row, url: event.target.value } : row,
                  ),
                )
              }
              aria-invalid={!!errors.sources}
            />
            <label htmlFor={`title-${s.key}`}>
              Source {index + 1} title <span>Optional</span>
            </label>
            <input
              id={`title-${s.key}`}
              name="sourceTitle"
              maxLength={LIMITS.title}
              value={s.title}
              onChange={(event) =>
                setSources((rows) =>
                  rows.map((row) =>
                    row.key === s.key ? { ...row, title: event.target.value } : row,
                  ),
                )
              }
            />
            <button
              type="button"
              className="text-button"
              onClick={() => setSources((rows) => rows.filter((row) => row.key !== s.key))}
            >
              Remove source {index + 1} ×
            </button>
          </div>
        ))}
        {errors.sources ? <p className="field-error">{errors.sources}</p> : null}
        <button
          type="button"
          className="secondary"
          disabled={sources.length >= LIMITS.sources}
          onClick={() => {
            setSources((rows) => [...rows, { key: nextKey, url: "", title: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          + Add source
        </button>
      </fieldset>
    </>
  );
}
