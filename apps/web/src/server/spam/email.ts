import { Schema } from "effect";

const Content = Schema.String.pipe(Schema.maxLength(100_000));

export const EmailInput = Schema.Struct({
  subject: Schema.String.pipe(Schema.maxLength(998)),
  sender: Schema.String.pipe(
    Schema.maxLength(512),
    Schema.filter((value) => value.trim().length > 0),
  ),
  body: Schema.optional(Content),
  content: Schema.optional(Content),
}).pipe(
  Schema.filter((email) => (email.body === undefined) !== (email.content === undefined), {
    message: () => "Provide exactly one of body or content",
  }),
  Schema.filter(
    (email) =>
      email.subject.trim().length > 0 || (email.body ?? email.content ?? "").trim().length > 0,
    { message: () => "The subject and content cannot both be blank" },
  ),
);

export interface Email {
  readonly subject: string;
  readonly sender: string;
  readonly body: string;
}

export interface SpamVerdict {
  readonly isSpam: boolean;
  /** Probability of the selected verdict, in [0.5, 1]. */
  readonly confidence: number;
}

export const decodeEmail = (input: unknown) =>
  Schema.decodeUnknown(EmailInput, { onExcessProperty: "error" })(input);

export const MAX_BATCH_EMAILS = 20;

export const decodeEmailBatch = Schema.decodeUnknown(
  Schema.Struct({
    emails: Schema.Array(EmailInput).pipe(Schema.minItems(1), Schema.maxItems(MAX_BATCH_EMAILS)),
  }),
  { onExcessProperty: "error" },
);
