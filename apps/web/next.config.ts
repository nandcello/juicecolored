import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

// Upstream origins may also live in the repository root env files.
const rootEnv = (phase: string) =>
  Object.assign(
    {},
    ...[
      ".env",
      ".env.local",
      `.env.${phase === PHASE_DEVELOPMENT_SERVER ? "development" : "production"}.local`,
    ].map((file) => {
      try {
        return parseEnv(readFileSync(resolve(import.meta.dirname, "../..", file), "utf8"));
      } catch {
        return {};
      }
    }),
  ) as Record<string, string | undefined>;

export default function config(phase: string): NextConfig {
  const env = rootEnv(phase);
  const origin = (key: string) => (process.env[key] || env[key])?.replace(/\/$/, "");
  const jarvisOrigin =
    origin("JARVIS_ORIGIN") ??
    (phase === PHASE_DEVELOPMENT_SERVER
      ? "http://127.0.0.1:3001"
      : "https://jarvis-pi-brown.vercel.app");
  const canceldtOrigin = origin("CANCELDT_ORIGIN") ?? "http://127.0.0.1:3002";
  if (phase === PHASE_PRODUCTION_BUILD && !origin("CANCELDT_ORIGIN"))
    throw new Error(
      "Set CANCELDT_ORIGIN to the deployed CANCELDT Next.js origin before building the main site.",
    );

  return {
    cacheComponents: true,
    reactCompiler: true,
    allowedDevOrigins: ["juicecolored.local", "juicecolored.localhost"],
    poweredByHeader: false,
    // Proxied apps own their trailing-slash handling.
    skipTrailingSlashRedirect: true,
    async redirects() {
      return [{ source: "/calceldt/admin", destination: "/canceldt/admin", permanent: true }];
    },
    async rewrites() {
      return [
        { source: "/canceldt", destination: `${canceldtOrigin}/canceldt` },
        { source: "/canceldt/:path*", destination: `${canceldtOrigin}/canceldt/:path*` },
        { source: "/jarvis", destination: `${jarvisOrigin}/jarvis` },
        { source: "/jarvis/:path*", destination: `${jarvisOrigin}/jarvis/:path*` },
      ];
    },
  };
}
