import type { NextConfig } from "next";
const config: NextConfig = {
  basePath: "/jarvis",
  allowedDevOrigins: ["juicecolored.local"],
  cacheComponents: true,
  reactCompiler: true,
  // Convex's Node transport owns its WebSocket bundle; leave it to Node.
  serverExternalPackages: ["convex"],
  poweredByHeader: false,
};
export default config;
