import { readFile, writeFile } from "node:fs/promises";
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { randomBytes, scryptSync } from "node:crypto";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../..");
const target = resolve(root, "apps/canceldt/.env.local");
try {
  await readFile(target);
  throw new Error("CANCELDT .env.local already exists; refusing to rotate keys.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const shared = parseEnv(await readFile(resolve(root, ".env.local"), "utf8"));
const keys = await generateKeyPair("ES256", { extractable: true });
const jwk = {
  ...(await exportJWK(keys.publicKey)),
  kid: "canceldt-owner-1",
  alg: "ES256",
  use: "sig",
};
const jwks = JSON.stringify({ keys: [jwk] });
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
const values = {
  NEXT_PUBLIC_CONVEX_URL: shared.VITE_CONVEX_URL,
  CANCELDT_PUBLIC_ORIGIN: "https://juicecolored.localhost",
  CANCELDT_LOGIN_SECRET: randomBytes(32).toString("hex"),
  CANCELDT_AUTH_ISSUER: "https://juicecolored.localhost/canceldt",
  CANCELDT_AUTH_PRIVATE_KEY: (await exportPKCS8(keys.privateKey)).replaceAll("\n", "\\n"),
  CANCELDT_AUTH_PUBLIC_JWKS: jwks,
  CANCELDT_REVALIDATE_SECRET: randomBytes(32).toString("hex"),
};
const serialize = (values) =>
  Object.entries(values)
    .map(([k, v]) => `${k}='${v}'`)
    .join("\n") + "\n";
await writeFile(target, serialize(values), { mode: 0o600, flag: "wx" });
await writeFile(
  resolve(root, "apps/canceldt/.env.credentials.local"),
  serialize({ CANCELDT_ADMIN_PASSPHRASE: password }),
  { mode: 0o600, flag: "wx" },
);
await writeFile(
  resolve(root, "apps/canceldt/.env.convex.local"),
  serialize({
    CANCELDT_AUTH_ISSUER: values.CANCELDT_AUTH_ISSUER,
    CANCELDT_AUTH_JWKS: `data:application/json;base64,${Buffer.from(jwks).toString("base64")}`,
    CANCELDT_ADMIN_IDENTITIES: `${values.CANCELDT_AUTH_ISSUER}|canceldt-owner`,
    CANCELDT_LOGIN_SECRET: values.CANCELDT_LOGIN_SECRET,
    CANCELDT_PASSPHRASE_HASH: `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`,
  }),
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Created ignored local environment, credentials and Convex configuration. Apply .env.convex.local to the development deployment. No secrets printed.",
);
