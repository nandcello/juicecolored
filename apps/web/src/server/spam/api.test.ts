import assert from "node:assert/strict";
import { test } from "vitest";
import { createGateway } from "@ai-sdk/gateway";
import { HttpApp } from "@effect/platform";
import { Effect, Redacted } from "effect";
import {
  ClassificationFailed,
  ClassificationTimedOut,
  GatewayVerificationRequired,
  JEV_MODEL,
  SpamClassifier,
  makeClassifier,
} from "./classifier";
import { AppConfig } from "./config";
import { app, BATCH_CONCURRENCY, MAX_BODY_BYTES } from "./http";

const email = {
  subject: "Your prize",
  sender: "Prizes <prizes@example.com>",
  body: "Pay a fee to claim your prize.",
};

const setup = (
  options: {
    answer?: unknown;
    status?: number;
    providerErrorType?: string;
    token?: string;
    hang?: boolean;
    timeoutMs?: number;
    classifier?: typeof SpamClassifier.Service;
  } = {},
) => {
  const calls: { url: string; headers: Headers; body: unknown }[] = [];
  let aborted = false;
  const gateway = createGateway({
    apiKey: "test-gateway-key",
    fetch: async (url, init) => {
      assert.equal(typeof init?.body, "string");
      calls.push({
        url: url instanceof Request ? url.url : url.toString(),
        headers: new Headers(init?.headers),
        body: JSON.parse(init?.body as string),
      });
      if (options.hang) {
        return await new Promise<Response>((_resolve, reject) => {
          const abort = () => {
            aborted = true;
            reject(new Error("Aborted"));
          };
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener("abort", abort, { once: true });
        });
      }
      if (options.status)
        return Response.json(
          { error: { message: "PRIVATE provider data", type: options.providerErrorType } },
          { status: options.status },
        );
      return Response.json({
        answers: { spam: options.answer ?? { type: "boolean", probability: 0.98 } },
      });
    },
  });
  const handler = HttpApp.toWebHandler(
    app.pipe(
      Effect.provideService(
        SpamClassifier,
        options.classifier ??
          makeClassifier(gateway.evaluationModel(JEV_MODEL), options.timeoutMs ?? 1000),
      ),
      Effect.provideService(AppConfig, {
        gatewayApiKey: Redacted.make("test-gateway-key"),
        timeoutMs: 1000,
        authToken: Redacted.make(options.token ?? "test-api-token"),
      }),
    ),
  );
  const post = (input: unknown, headers: Record<string, string> = {}) =>
    handler(
      new Request("http://localhost/api/spam", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${options.token ?? "test-api-token"}`,
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    );
  const postBatch = (input: unknown, headers: Record<string, string> = {}) =>
    handler(
      new Request("http://localhost/api/spam/batch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${options.token ?? "test-api-token"}`,
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    );
  return { handler, post, postBatch, calls, wasAborted: () => aborted };
};

test("HTTP → Effect → real AI SDK Gateway adapter → verdict", async () => {
  const { post, calls } = setup();
  const response = await post(email);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { isSpam: true, confidence: 0.98 });
  assert.equal(calls.length, 1);
  const call = calls[0]!;
  assert.ok(call.url.endsWith("/evaluation-model"));
  assert.equal(call.headers.get("ai-model-id"), "typesafe-ai/jev");
  assert.equal(call.headers.get("authorization"), "Bearer test-gateway-key");
  assert.deepEqual((call.body as { state: unknown }).state, { email });
});

test("content alias is normalized and legitimate email confidence is complemented", async () => {
  const { post, calls } = setup({ answer: { type: "boolean", probability: 0.02 } });
  const response = await post({
    subject: "Meeting",
    sender: "me@example.com",
    content: "See you at 3.",
  });
  assert.deepEqual(await response.json(), { isSpam: false, confidence: 0.98 });
  assert.deepEqual((calls[0]!.body as { state: unknown }).state, {
    email: { subject: "Meeting", sender: "me@example.com", body: "See you at 3." },
  });
});

for (const probability of [0, 0.499, 0.5, 1]) {
  test(`probability boundary ${probability}`, async () => {
    const { post } = setup({ answer: { type: "boolean", probability } });
    const response = await post(email);
    assert.deepEqual(await response.json(), {
      isSpam: probability >= 0.5,
      confidence: probability >= 0.5 ? probability : 1 - probability,
    });
  });
}

test("invalid inputs are rejected before contacting Jev", async () => {
  const { post, calls } = setup();
  for (const input of [
    null,
    [],
    {},
    { ...email, sender: " " },
    { ...email, sender: 123 },
    { ...email, subject: undefined },
    { ...email, body: undefined },
    { ...email, body: null },
    { ...email, content: "Ambiguous" },
    { ...email, subject: "", body: " " },
    { ...email, unexpected: "field" },
    { ...email, body: "x".repeat(100_001) },
    { ...email, subject: "x".repeat(999) },
  ]) {
    const response = await post(input);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_EMAIL");
  }
  assert.equal(calls.length, 0);
});

test("subject-only and body-only emails are allowed with explicit empty fields", async () => {
  const { post } = setup();
  assert.equal((await post({ ...email, body: "" })).status, 200);
  assert.equal((await post({ ...email, subject: "" })).status, 200);
});

test("malformed JSON, media type, and body-size errors", async () => {
  const { handler, post, calls } = setup();
  assert.equal(
    (
      await handler(
        new Request("http://localhost/api/spam", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer test-api-token" },
          body: "{broken",
        }),
      )
    ).status,
    400,
  );
  assert.equal((await post(email, { "content-type": "text/plain" })).status, 415);
  assert.equal((await post({ ...email, body: "x".repeat(MAX_BODY_BYTES) })).status, 413);
  assert.equal(calls.length, 0);
});

test("streamed requests without Content-Length cannot bypass size limit", async () => {
  const { handler, calls } = setup();
  const request = new Request("http://localhost/api/spam", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-api-token" },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES / 2));
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES / 2 + 1));
        controller.close();
      },
    }),
    duplex: "half",
  } as RequestInit);
  assert.equal((await handler(request)).status, 413);
  assert.equal(calls.length, 0);
});

test("bearer authentication guards classification but permits health checks", async () => {
  const { post, handler, calls } = setup({ token: "api-secret" });
  assert.equal((await post(email, { authorization: "" })).status, 401);
  assert.equal((await post(email, { authorization: "Bearer wrong" })).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await post(email, { authorization: "Bearer api-secret" })).status, 200);
  const health = await handler(new Request("http://localhost/api/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
});

test("upstream failures are sanitized and never become non-spam verdicts", async () => {
  const { post } = setup({ status: 401 });
  const response = await post(email);
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.ok(text.includes("CLASSIFICATION_FAILED"));
  assert.ok(!text.includes("PRIVATE"));
  assert.ok(!text.includes("isSpam"));
});

test("Gateway account verification failures have actionable, sanitized responses", async () => {
  const { post, calls } = setup({
    status: 403,
    providerErrorType: "customer_verification_required",
  });
  const response = await post(email);
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, "GATEWAY_VERIFICATION_REQUIRED");
  assert.match(body.error.message, /credit card/);
  assert.ok(!JSON.stringify(body).includes("PRIVATE"));
  assert.equal(calls.length, 1);
});

test("other Gateway 403 errors are not mistaken for account verification", async () => {
  const { post } = setup({ status: 403, providerErrorType: "forbidden" });
  const response = await post(email);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, "CLASSIFICATION_FAILED");
});

for (const answer of [
  { type: "boolean", probability: 1.1 },
  { type: "boolean", probability: -0.1 },
  { type: "boolean", probability: null },
  { type: "choice", choice: "spam" },
]) {
  test(`invalid model output ${JSON.stringify(answer)} is rejected`, async () => {
    const { post } = setup({ answer });
    assert.equal((await post(email)).status, 502);
  });
}

test("timeout returns 504 and aborts the upstream request", async () => {
  const { post, wasAborted } = setup({ hang: true, timeoutMs: 20 });
  const response = await post(email);
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, "CLASSIFICATION_TIMEOUT");
  assert.equal(wasAborted(), true);
});

test("unknown routes return JSON 404", async () => {
  const { handler } = setup();
  const response = await handler(new Request("http://localhost/api/unknown"));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "NOT_FOUND");
});

test("batch classifies each email through the SDK and normalizes content aliases", async () => {
  const { postBatch, calls } = setup();
  const response = await postBatch({
    emails: [email, { subject: "Meeting", sender: "me@example.com", content: "See you." }],
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    results: [
      { index: 0, isSpam: true, confidence: 0.98 },
      { index: 1, isSpam: true, confidence: 0.98 },
    ],
  });
  assert.equal(calls.length, 2);
  assert.deepEqual((calls[1]!.body as { state: unknown }).state, {
    email: { subject: "Meeting", sender: "me@example.com", body: "See you." },
  });
});

test("invalid batches are rejected in full before any provider calls", async () => {
  const { postBatch, calls } = setup();
  for (const input of [
    null,
    [],
    email,
    {},
    { emails: [] },
    { emails: [email, { ...email, sender: " " }] },
    { emails: Array(21).fill(email) },
    { emails: [email], extra: true },
    { emails: [{ ...email, extra: true }] },
    { emails: [{ ...email, content: "ambiguous" }] },
  ]) {
    const response = await postBatch(input);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_BATCH");
  }
  assert.equal(calls.length, 0);
});

test("batch preserves order, caps concurrency, and isolates provider failures", async () => {
  let active = 0;
  let peak = 0;
  const finished: number[] = [];
  const { postBatch } = setup({
    classifier: {
      classify: (input) =>
        Effect.gen(function* () {
          const index = Number(input.subject);
          active++;
          peak = Math.max(peak, active);
          yield* Effect.sleep(index === 0 ? 40 : 1);
          active--;
          finished.push(index);
          if (index === 1) return yield* Effect.fail(new ClassificationFailed({}));
          if (index === 2) return yield* Effect.fail(new ClassificationTimedOut());
          if (index === 3) return yield* Effect.fail(new GatewayVerificationRequired());
          return { isSpam: index % 2 === 0, confidence: 0.9 };
        }),
    },
  });
  const response = await postBatch({
    emails: Array.from({ length: 20 }, (_, index) => ({ ...email, subject: String(index) })),
  });
  assert.equal(response.status, 200);
  const { results } = await response.json();
  assert.equal(results.length, 20);
  assert.equal(peak, BATCH_CONCURRENCY);
  assert.equal(active, 0);
  assert.notEqual(finished[0], 0);
  assert.deepEqual(
    results.map((result: { index: number }) => result.index),
    Array.from({ length: 20 }, (_, i) => i),
  );
  assert.deepEqual(results[0], { index: 0, isSpam: true, confidence: 0.9 });
  assert.deepEqual(results[19], { index: 19, isSpam: false, confidence: 0.9 });
  for (const [index, code] of [
    [1, "CLASSIFICATION_FAILED"],
    [2, "CLASSIFICATION_TIMEOUT"],
    [3, "GATEWAY_VERIFICATION_REQUIRED"],
  ] as const) {
    assert.equal(results[index].error.code, code);
    assert.equal("isSpam" in results[index], false);
  }
});

test("batch applies authentication, media type, and streamed upload limits", async () => {
  const { handler, postBatch, calls } = setup({ token: "api-secret" });
  const auth = { authorization: "Bearer api-secret" };
  assert.equal((await postBatch({ emails: [email] }, { authorization: "" })).status, 401);
  assert.equal(
    (await postBatch({ emails: [email] }, { authorization: "Bearer wrong" })).status,
    401,
  );
  assert.equal(
    (await postBatch({ emails: [email] }, { ...auth, "content-type": "text/plain" })).status,
    415,
  );
  assert.equal(
    (
      await handler(
        new Request("http://localhost/api/spam/batch", {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: "{broken",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handler(
        new Request("http://localhost/api/spam/batch", {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
              controller.enqueue(new Uint8Array(1));
              controller.close();
            },
          }),
          duplex: "half",
        } as RequestInit),
      )
    ).status,
    413,
  );
  assert.equal(calls.length, 0);
  assert.equal((await postBatch({ emails: [email] }, auth)).status, 200);
});

test("all timed-out batch items return errors and abort upstream requests", async () => {
  const { postBatch, calls, wasAborted } = setup({ hang: true, timeoutMs: 20 });
  const response = await postBatch({ emails: [email, email] });
  assert.equal(response.status, 200);
  const { results } = await response.json();
  assert.deepEqual(
    results.map((result: { error: { code: string } }) => result.error.code),
    ["CLASSIFICATION_TIMEOUT", "CLASSIFICATION_TIMEOUT"],
  );
  assert.equal(calls.length, 2);
  assert.equal(wasAborted(), true);
});
