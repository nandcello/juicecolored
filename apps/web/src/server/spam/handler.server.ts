import { HttpApp, HttpServerResponse } from "@effect/platform";
import { ConfigProvider, Effect, Logger } from "effect";
import { SpamClassifierLive } from "./classifier";
import { AppConfig, config } from "./config";
import { app } from "./http";

// Read server credentials per request; missing configuration always fails closed.
export const handleSpamRequest = HttpApp.toWebHandler(
  Effect.gen(function* () {
    const settings = yield* config.pipe(Effect.withConfigProvider(ConfigProvider.fromEnv()));
    return yield* app.pipe(
      Effect.provide(SpamClassifierLive),
      Effect.provideService(AppConfig, settings),
    );
  }).pipe(
    Effect.catchTag("ConfigError", () =>
      Effect.succeed(
        HttpServerResponse.unsafeJson(
          {
            error: {
              code: "CONFIGURATION_ERROR",
              message: "The service is not configured correctly.",
            },
          },
          { status: 503, headers: { "cache-control": "no-store" } },
        ),
      ),
    ),
    Effect.provide(Logger.json),
  ),
);
