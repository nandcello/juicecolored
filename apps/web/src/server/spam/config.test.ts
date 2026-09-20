import assert from "node:assert/strict";
import { test } from "vitest";
import { ConfigProvider, Effect, Either } from "effect";
import { config } from "./config";

const load = (values: Record<string, string | undefined>) =>
  Effect.runPromise(
    Effect.either(config).pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map(
            Object.entries(values).filter(
              (entry): entry is [string, string] => entry[1] !== undefined,
            ),
          ),
        ),
      ),
    ),
  );

test("configuration requires both secrets and validates evaluation deadlines", async () => {
  const valid = { AI_GATEWAY_API_KEY: "test-key", API_AUTH_TOKEN: "test-token" };
  const invalid = [
    {},
    { AI_GATEWAY_API_KEY: "test-key" },
    { API_AUTH_TOKEN: "test-token" },
    ...[
      { AI_GATEWAY_API_KEY: "" },
      { AI_GATEWAY_API_KEY: " " },
      { API_AUTH_TOKEN: "" },
      { API_AUTH_TOKEN: " " },
      { JEV_TIMEOUT_MS: "0" },
      { JEV_TIMEOUT_MS: "120001" },
      { JEV_TIMEOUT_MS: "abc" },
    ].map((value) => ({ ...valid, ...value })),
  ];
  for (const values of invalid) {
    assert.equal(Either.isLeft(await load(values)), true);
  }
  const result = await load(valid);
  assert.ok(Either.isRight(result));
  assert.equal(result.right.timeoutMs, 10_000);
});
