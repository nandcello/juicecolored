// One-time migration of ignored development env files from the former Next apps.
// Existing values win. Production files and backend secrets are never copied to the web app.
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "../../..");
const read = (path) => (existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {});
function appendMissing(path, values) {
  const current = read(path);
  const entries = Object.entries(values).filter(([key, value]) => value && !current[key]);
  if (!entries.length) return;
  const lines = entries.map(([key, value]) => {
    const delimiter = ["'", '"', "`"].find((quote) => !value.includes(quote));
    if (!delimiter) throw new Error(`Cannot safely serialize ${key}; migrate it manually.`);
    const line = `${key}=${delimiter}${value}${delimiter}`;
    if (parseEnv(line)[key] !== value) throw new Error(`Cannot round-trip ${key}.`);
    return line;
  });
  const original = existsSync(path) ? readFileSync(path, "utf8") : "";
  writeFileSync(path, original + "\n" + lines.join("\n") + "\n", { mode: 0o600 });
  chmodSync(path, 0o600);
  console.log(`Migrated ${entries.length} settings to ${path.replace(root + "/", "")}`);
}
const jarvis = read(resolve(root, "apps/jarvis/.env.local"));
const canceldt = read(resolve(root, "apps/canceldt/.env.local"));
appendMissing(resolve(root, "apps/web/.env.local"), {
  ...Object.fromEntries(
    ["JARVIS_GATEWAY_SECRET", "JARVIS_SESSION_SECRET", "JARVIS_PUBLIC_ORIGIN"].map((key) => [
      key,
      jarvis[key],
    ]),
  ),
  JARVIS_CONVEX_URL: jarvis.NEXT_PUBLIC_CONVEX_URL,
  ...Object.fromEntries(
    [
      "CANCELDT_PUBLIC_ORIGIN",
      "CANCELDT_AUTH_ISSUER",
      "CANCELDT_AUTH_PRIVATE_KEY",
      "CANCELDT_AUTH_PUBLIC_JWKS",
      "CANCELDT_LOGIN_SECRET",
      "CANCELDT_REVALIDATE_SECRET",
      "CANCELDT_TURNSTILE_SITE_KEY",
      "NEXT_PUBLIC_CANCELDT_TURNSTILE_SITE_KEY",
    ].map((key) => [key, canceldt[key]]),
  ),
});
const jarvisCredentials = read(resolve(root, "apps/jarvis/.env.credentials.local"));
const canceldtCredentials = read(resolve(root, "apps/canceldt/.env.credentials.local"));
appendMissing(resolve(root, "apps/web/.env.credentials.local"), {
  JARVIS_OWNER_PASSPHRASE: jarvisCredentials.JARVIS_OWNER_PASSPHRASE,
  CANCELDT_ADMIN_PASSPHRASE: canceldtCredentials.CANCELDT_ADMIN_PASSPHRASE,
});
appendMissing(resolve(root, "packages/jarvis/.env.local"), {
  CONVEX_DEPLOYMENT: jarvis.CONVEX_DEPLOYMENT,
});
