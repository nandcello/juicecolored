import { chmod, readFile, writeFile } from "node:fs/promises";
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { randomBytes, scryptSync } from "node:crypto";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../..");
const target = resolve(root, "apps/web/.env.local");
const credentials = resolve(root, "apps/web/.env.credentials.local");
const convexConfiguration = resolve(root, "apps/web/.env.convex.local");
async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  }
}
const existing = (await readOptional(target)) ?? "";
const configured = parseEnv(existing);
if (Object.keys(configured).some((key) => key.startsWith("CANCELDT_")))
  throw new Error(
    "CANCELDT is already configured in apps/web/.env.local; refusing to rotate keys.",
  );
const existingCredentials = (await readOptional(credentials)) ?? "";
const existingConvexConfiguration = (await readOptional(convexConfiguration)) ?? "";
for (const contents of [existingCredentials, existingConvexConfiguration]) {
  if (Object.keys(parseEnv(contents)).some((key) => key.startsWith("CANCELDT_")))
    throw new Error(
      "CANCELDT credentials or Convex configuration already exist; refusing to rotate keys.",
    );
}
const shared = parseEnv(await readFile(resolve(root, ".env.local"), "utf8"));
const convexUrl = configured.NEXT_PUBLIC_CONVEX_URL ?? shared.VITE_CONVEX_URL;
if (!convexUrl)
  throw new Error("Configure the shared Convex URL before creating CANCELDT credentials.");
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
  ...(!configured.NEXT_PUBLIC_CONVEX_URL ? { NEXT_PUBLIC_CONVEX_URL: convexUrl } : {}),
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
const append = (contents, values) =>
  `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}${serialize(values)}`;
await writeFile(target, append(existing, values), {
  mode: 0o600,
});
await writeFile(credentials, append(existingCredentials, { CANCELDT_ADMIN_PASSPHRASE: password }), {
  mode: 0o600,
});
await writeFile(
  convexConfiguration,
  append(existingConvexConfiguration, {
    CANCELDT_AUTH_ISSUER: values.CANCELDT_AUTH_ISSUER,
    CANCELDT_AUTH_JWKS: `data:application/json;base64,${Buffer.from(jwks).toString("base64")}`,
    CANCELDT_ADMIN_IDENTITIES: `${values.CANCELDT_AUTH_ISSUER}|canceldt-owner`,
    CANCELDT_LOGIN_SECRET: values.CANCELDT_LOGIN_SECRET,
    CANCELDT_PASSPHRASE_HASH: `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`,
  }),
  { mode: 0o600 },
);
await Promise.all([target, credentials, convexConfiguration].map((path) => chmod(path, 0o600)));
console.log(
  "Added CANCELDT configuration to apps/web/.env.local and created its ignored credentials and Convex configuration alongside it. Existing shared app settings were preserved. Apply .env.convex.local to the development deployment. No secrets printed.",
);
