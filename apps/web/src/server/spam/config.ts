import { Config, Context } from "effect";

const nonEmptySecret = (name: string) =>
  Config.redacted(
    Config.string(name).pipe(
      Config.validate({
        message: `${name} must not be blank`,
        validation: (value) => value.trim().length > 0,
      }),
    ),
  );

export const config = Config.all({
  gatewayApiKey: nonEmptySecret("AI_GATEWAY_API_KEY"),
  authToken: nonEmptySecret("API_AUTH_TOKEN"),
  timeoutMs: Config.integer("JEV_TIMEOUT_MS").pipe(
    Config.withDefault(10_000),
    Config.validate({
      message: "JEV_TIMEOUT_MS must be between 1 and 120000",
      validation: (n) => n >= 1 && n <= 120_000,
    }),
  ),
});

export class AppConfig extends Context.Tag("hinto/AppConfig")<
  AppConfig,
  Config.Config.Success<typeof config>
>() {}
