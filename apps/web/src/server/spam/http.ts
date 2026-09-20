import { timingSafeEqual } from "node:crypto";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Data, Effect, Redacted, Stream } from "effect";
import { SpamClassifier } from "./classifier";
import { AppConfig } from "./config";
import { decodeEmail, decodeEmailBatch, type Email } from "./email";

export const MAX_BODY_BYTES = 512 * 1024;
export const BATCH_CONCURRENCY = 4;

class PayloadTooLarge extends Data.TaggedError("PayloadTooLarge")<{}> {}
class InvalidJson extends Data.TaggedError("InvalidJson")<{}> {}

const json = (value: unknown, status = 200) =>
  HttpServerResponse.unsafeJson(value, { status, headers: { "cache-control": "no-store" } });

const error = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

const authorized = (header: string | undefined, token: string) => {
  const actual = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

// Enforce the limit while streaming, including requests without Content-Length.
const readJson = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    yield* request.stream.pipe(
      Stream.runForEach((chunk) => {
        bytes += chunk.byteLength;
        if (bytes > MAX_BODY_BYTES) return Effect.fail(new PayloadTooLarge());
        chunks.push(chunk);
        return Effect.void;
      }),
    );
    return yield* Effect.try({
      try: () =>
        JSON.parse(
          new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(Buffer.concat(chunks)),
        ) as unknown,
      catch: () => new InvalidJson(),
    });
  });

const providerErrors = {
  ClassificationFailed: {
    code: "CLASSIFICATION_FAILED",
    message: "The classification provider could not return a valid result.",
  },
  GatewayVerificationRequired: {
    code: "GATEWAY_VERIFICATION_REQUIRED",
    message:
      "Vercel AI Gateway requires a valid credit card on file. Complete verification in your Vercel AI Gateway dashboard, then retry.",
  },
  ClassificationTimedOut: {
    code: "CLASSIFICATION_TIMEOUT",
    message: "The classification provider timed out.",
  },
} as const;

const normalizeEmail = (email: {
  sender: string;
  subject: string;
  body?: string | undefined;
  content?: string | undefined;
}): Email => ({
  sender: email.sender,
  subject: email.subject,
  body: email.body ?? email.content ?? "",
});

const classify = (batch: boolean) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const config = yield* AppConfig;
    if (!authorized(request.headers.authorization, Redacted.value(config.authToken))) {
      return error(401, "UNAUTHORIZED", "A valid bearer token is required.");
    }
    if (
      request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json"
    ) {
      return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use Content-Type: application/json.");
    }
    const input = yield* readJson(request);
    const classifier = yield* SpamClassifier;
    if (batch) {
      // Validate the entire request before starting any paid provider calls.
      const { emails } = yield* decodeEmailBatch(input);
      const results = yield* Effect.forEach(
        emails,
        (email, index) =>
          classifier.classify(normalizeEmail(email)).pipe(
            Effect.map((verdict) => ({ index, ...verdict })),
            Effect.catchAll((failure) =>
              Effect.succeed({ index, error: providerErrors[failure._tag] }),
            ),
          ),
        { concurrency: BATCH_CONCURRENCY },
      );
      return json({ results });
    }
    const email = yield* decodeEmail(input);
    const verdict = yield* classifier.classify(normalizeEmail(email));
    return json(verdict);
  }).pipe(
    Effect.catchTags({
      PayloadTooLarge: () =>
        Effect.succeed(error(413, "PAYLOAD_TOO_LARGE", "The JSON body must not exceed 512 KiB.")),
      InvalidJson: () =>
        Effect.succeed(error(400, "INVALID_JSON", "The request must contain valid UTF-8 JSON.")),
      RequestError: () =>
        Effect.succeed(error(400, "INVALID_REQUEST", "Could not read the request body.")),
      ParseError: () =>
        Effect.succeed(
          error(
            400,
            batch ? "INVALID_BATCH" : "INVALID_EMAIL",
            (batch ? "Provide an emails array containing 1–20 valid emails. " : "") +
              "Provide subject (up to 998 characters), nonblank sender (up to 512 characters), and exactly one of body or content (up to 100000 characters). Subject and content cannot both be blank. Extra fields are not allowed.",
          ),
        ),
      ClassificationFailed: () =>
        Effect.succeed(
          error(
            502,
            providerErrors.ClassificationFailed.code,
            providerErrors.ClassificationFailed.message,
          ),
        ),
      GatewayVerificationRequired: () =>
        Effect.succeed(
          error(
            502,
            providerErrors.GatewayVerificationRequired.code,
            providerErrors.GatewayVerificationRequired.message,
          ),
        ),
      ClassificationTimedOut: () =>
        Effect.succeed(
          error(
            504,
            providerErrors.ClassificationTimedOut.code,
            providerErrors.ClassificationTimedOut.message,
          ),
        ),
    }),
  );

export const app = HttpRouter.empty.pipe(
  HttpRouter.get("/api/health", Effect.succeed(json({ status: "ok" }))),
  HttpRouter.post("/api/spam", classify(false)),
  HttpRouter.post("/api/spam/batch", classify(true)),
  HttpRouter.all("*", Effect.succeed(error(404, "NOT_FOUND", "Route not found."))),
);
