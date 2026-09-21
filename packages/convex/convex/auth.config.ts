import type { AuthConfig } from "convex/server";
// No configured identity provider means no authenticated administrative access.
export default {
  providers:
    process.env.CANCELDT_AUTH_ISSUER && process.env.CANCELDT_AUTH_JWKS
      ? [
          {
            type: "customJwt",
            applicationID: "canceldt",
            issuer: process.env.CANCELDT_AUTH_ISSUER,
            jwks: process.env.CANCELDT_AUTH_JWKS,
            algorithm: "ES256",
          },
        ]
      : [],
} satisfies AuthConfig;
