"use client";
import { useState } from "react";
import { SourceFields } from "./source-fields";
import { LIMITS } from "@personal/canceldt/model";
import type { Content } from "@personal/canceldt/model";
export function ContentFields({
  initial,
  errors = {},
}: {
  initial?: Partial<Content>;
  errors?: Record<string, string>;
}) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
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
      <SourceFields initial={initial?.sources} error={errors.sources} />
    </>
  );
}
