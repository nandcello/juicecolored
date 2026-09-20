import assert from "node:assert/strict";
import { test } from "vitest";
import { GatewayInternalServerError } from "@ai-sdk/gateway";
import { APICallError, RetryError } from "ai";
import { sanitizeProviderFailure } from "./classifier";

const apiError = (responseBody: string) =>
  new APICallError({
    message: "PRIVATE upstream message",
    url: "https://example.com/evaluation-model",
    requestBodyValues: { email: "PRIVATE email content" },
    statusCode: 403,
    responseBody,
  });

test("verification detection survives Gateway and retry wrappers", () => {
  const error = new RetryError({
    message: "PRIVATE retry details",
    reason: "errorNotRetryable",
    errors: [
      new GatewayInternalServerError({
        message: "PRIVATE gateway details",
        statusCode: 403,
        cause: apiError(JSON.stringify({ error: { type: "customer_verification_required" } })),
      }),
    ],
  });
  const sanitized = sanitizeProviderFailure(error);
  assert.equal(sanitized._tag, "GatewayVerificationRequired");
  assert.ok(!JSON.stringify(sanitized).includes("PRIVATE"));
  assert.equal(sanitized.cause, undefined);
});

test("malformed or unrecognized provider bodies retain only the status", () => {
  for (const body of ["not JSON", "null", '{"error":{"type":"PRIVATE"}}']) {
    const sanitized = sanitizeProviderFailure(apiError(body));
    assert.equal(sanitized._tag, "ClassificationFailed");
    assert.ok("upstreamStatus" in sanitized && sanitized.upstreamStatus === 403);
    assert.ok(!JSON.stringify(sanitized).includes("PRIVATE"));
    assert.equal(sanitized.cause, undefined);
  }
});
