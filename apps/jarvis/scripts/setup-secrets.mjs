import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Creates new secrets only on first run. Never prints their values.
const path = ".env.credentials.local";
if (!existsSync(path)) {
  const password = randomBytes(18).toString("base64url"),
    salt = randomBytes(16).toString("hex");
  const values = {
    JARVIS_OWNER_PASSPHRASE: password,
    JARVIS_PASSWORD_HASH: salt + ":" + scryptSync(password, salt, 64).toString("hex"),
    JARVIS_GATEWAY_SECRET: randomBytes(32).toString("base64url"),
    JARVIS_SESSION_SECRET: randomBytes(32).toString("base64url"),
    XIAOMI_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  };
  writeFileSync(
    path,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
}
const values = Object.fromEntries(
  readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
const local = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const retained = local
  .split("\n")
  .filter((line) => !/^JARVIS_(GATEWAY|SESSION)_SECRET=/.test(line))
  .join("\n");
writeFileSync(
  ".env.local",
  retained +
    "\n" +
    ["JARVIS_GATEWAY_SECRET", "JARVIS_SESSION_SECRET"].map((k) => `${k}=${values[k]}`).join("\n") +
    "\n",
  { mode: 0o600 },
);
if (process.argv.includes("--convex")) {
  const envFile = ".env.convex-secrets.local";
  writeFileSync(
    envFile,
    ["JARVIS_GATEWAY_SECRET", "JARVIS_PASSWORD_HASH", "XIAOMI_ENCRYPTION_KEY"]
      .map((k) => `${k}=${values[k]}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  const result = spawnSync(
    "npx",
    [
      "convex",
      "env",
      "set",
      "--from-file",
      envFile,
      ...(process.argv.includes("--prod") ? ["--prod"] : []),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("Secrets ready. Owner passphrase is in .env.credentials.local; no values printed.");
