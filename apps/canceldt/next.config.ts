import type { NextConfig } from "next";
const config: NextConfig = {
  basePath: "/canceldt",
  cacheComponents: true,
  reactCompiler: true,
  allowedDevOrigins: ["juicecolored.local", "juicecolored.localhost"],
  serverExternalPackages: ["convex"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "64kb",
      allowedOrigins: ["juicecolored.com", "juicecolored.local:1355", "juicecolored.localhost"],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
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
