import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { SignJWT, importPKCS8 } from "jose";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
export async function cleanupFixture(id, prefix) {
  if (!id) return;
  const env = parseEnv(
    readFileSync(new URL("../../../../apps/web/.env.local", import.meta.url), "utf8"),
  );
  if (!env.CANCELDT_AUTH_ISSUER?.includes(".local"))
    throw new Error("Browser fixtures require development credentials.");
  const key = await importPKCS8(env.CANCELDT_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1" })
    .setIssuer(env.CANCELDT_AUTH_ISSUER)
    .setSubject("canceldt-owner")
    .setAudience("canceldt")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL, { auth: token });
  const row = await client.query(makeFunctionReference("canceldt/admin:subject"), { id });
  if (!row || row.publicationState === "archived") return;
  if (!row.subject.startsWith(prefix) || !prefix.startsWith("Fictional"))
    throw new Error("Refusing to clean non-fixture data.");
  await client.mutation(makeFunctionReference("canceldt/admin:save"), {
    id,
    revision: row.revision,
    subject: row.subject,
    oneLineReason: row.oneLineReason,
    description: row.description,
    sources: row.sources,
    publicationState: "archived",
  });
  for (const origin of [
    process.env.CANCELDT_REVALIDATE_ORIGIN ?? "http://127.0.0.1:3000",
    process.env.CANCELDT_TEST_ORIGIN ?? "http://127.0.0.1:3003",
  ]) {
    try {
      await fetch(`${origin}/canceldt/api/revalidate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.CANCELDT_REVALIDATE_SECRET}` },
      });
    } catch {
      /* The isolated QA server may already have stopped. */
    }
  }
}
