import type { NextConfig } from "next";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";
import { stylexBabelConfig } from "../../packages/jarvis/stylex.config.mjs";

const config: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  transpilePackages: ["@personal/jarvis", "@personal/canceldt"],
  allowedDevOrigins: ["juicecolored.local", "juicecolored.localhost"],
  serverExternalPackages: ["ws"],
  poweredByHeader: false,
  // The original public host served both forms, including its proxied areas.
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/canceldt/api/og": ["../../packages/canceldt/src/assets/*"],
  },
  experimental: {
    globalNotFound: true,
    // Each root owns a separate reset. Merging their CSS changes unrelated pages.
    cssChunking: false,
    serverActions: {
      bodySizeLimit: "64kb",
      allowedOrigins: ["juicecolored.com", "juicecolored.local:1355", "juicecolored.localhost"],
    },
  },
  webpack(webpackConfig) {
    // Compile StyleX before Next's SWC pass without changing Server Actions or
    // React Compiler behavior in the other project packages.
    webpackConfig.module.rules.push({
      test: /\.[jt]sx?$/,
      include: realpathSync(resolve(import.meta.dirname, "../../packages/jarvis/src")),
      enforce: "pre",
      use: [
        {
          loader: "babel-loader",
          options: { babelrc: false, configFile: false, ...stylexBabelConfig },
        },
      ],
    });
    return webpackConfig;
  },
  async redirects() {
    return [{ source: "/calceldt/admin", destination: "/canceldt/admin", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/canceldt/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;
