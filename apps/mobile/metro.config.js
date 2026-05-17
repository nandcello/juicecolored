const { createHash } = require("node:crypto");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const getCacheVersion = (values) =>
  values
    .filter(Boolean)
    .reduce(
      (hash, value) => hash.update("\0", "utf8").update(value || "", "utf8"),
      createHash("md5"),
    )
    .digest("hex");

const config = getDefaultConfig(projectRoot);

module.exports = withUniwindConfig(
  {
    ...config,
    cacheVersion: getCacheVersion([
      config.cacheVersion,
      readFileSync(path.join(monorepoRoot, "bun.lock"), "utf8"),
      readFileSync(path.join(projectRoot, "package.json"), "utf8"),
      existsSync(path.join(projectRoot, ".env")) &&
        readFileSync(path.join(projectRoot, ".env"), "utf8"),
      existsSync(path.join(projectRoot, ".env.local")) &&
        readFileSync(path.join(projectRoot, ".env.local"), "utf8"),
    ]),
  },
  {
    cssEntryFile: "./src/global.css",
    dtsFile: "./src/uniwind-types.d.ts",
    polyfills: {
      rem: 16,
    },
  },
);
