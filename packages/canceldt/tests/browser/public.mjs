import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { SignJWT, importPKCS8 } from "jose";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference as ref } from "convex/server";
const env = parseEnv(
  readFileSync(new URL("../../../../apps/web/.env.local", import.meta.url), "utf8"),
);
const origin = process.env.CANCELDT_TEST_ORIGIN ?? "https://juicecolored.local:1355";
const prefix = `FictionalPublicQa${Date.now()}`;
const checks = [],
  ids = [];
const key = await importPKCS8(env.CANCELDT_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1" })
  .setIssuer(env.CANCELDT_AUTH_ISSUER)
  .setSubject("canceldt-owner")
  .setAudience("canceldt")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(key);
const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
client.setAuth(token);
function ab(...args) {
  const r = spawnSync(
    "agent-browser",
    ["--session", "canceldt-public", "--ignore-https-errors", ...args],
    { encoding: "utf8", timeout: 40000 },
  );
  if (r.status !== 0) throw new Error(`${args[0]} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function wait(text) {
  ab(
    "wait",
    "--fn",
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`,
  );
  ab("snapshot", "-i");
}
function check(expr, label) {
  if (ab("eval", `Boolean(${expr})`) !== "true") throw new Error(label);
  checks.push(label);
  console.log("PASS " + label);
}
function open(path) {
  ab("open", origin + path);
  ab("snapshot", "-i");
}
async function invalidate() {
  const r = await fetch(
    `${process.env.CANCELDT_REVALIDATE_ORIGIN ?? "http://127.0.0.1:3000"}/canceldt/api/revalidate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CANCELDT_REVALIDATE_SECRET}` },
    },
  );
  if (!r.ok) throw new Error("Invalidation failed");
}
try {
  for (const [i, suffix] of [
    "Café",
    "Sources",
    "Reason",
    "Fourth",
    "Fifth",
    "Sixth",
    "Private",
  ].entries())
    ids.push(
      await client.mutation(ref("canceldt/admin:save"), {
        subject: `${prefix} ${suffix}`,
        oneLineReason: "Fictional reason marker uniqueZXQ, no real allegation.",
        sources:
          i === 1 ? [{ url: "https://example.com/", title: "Fictional source fixture" }] : [],
        ...(i === 0 ? { description: "Fictional description only.\n\nSecond paragraph." } : {}),
        publicationState: i === 6 ? "draft" : "published",
      }),
    );
  await invalidate();
  open("/canceldt");
  wait("LATEST CANCELS");
  check(
    'document.querySelectorAll(".entries > li").length===5',
    "Latest list contains exactly five",
  );
  check(
    'document.querySelector(".entries > li").textContent.includes("Sixth")',
    "Latest ordering uses publication date",
  );
  const cafe = `${prefix} Café`;
  open("/canceldt?q=" + encodeURIComponent(cafe.normalize("NFD")));
  wait("is cancelled.");
  check(
    `document.querySelector('main h1').textContent.includes(${JSON.stringify(cafe)})`,
    "Unicode-equivalent exact match preserves canonical spelling",
  );
  ab("reload");
  wait("is cancelled.");
  check(
    `document.querySelector('[name=q]').value.normalize('NFC')===${JSON.stringify(cafe)}`,
    "Direct search survives refresh",
  );
  ab("fill", "[name=q]", prefix);
  ab("press", "Enter");
  wait("Matching subjects");
  check(
    'document.querySelectorAll(".entries > li").length===6',
    "Partial search covers more than latest five",
  );
  ab("back");
  wait("is cancelled.");
  ab("forward");
  wait("Matching subjects");
  checks.push("Browser Back and Forward restore searches");
  console.log("PASS Browser Back and Forward restore searches");
  ab("find", "role", "link", "click", "--name", "Clear search");
  wait("LATEST CANCELS");
  check('location.search===""', "Clear returns to latest URL");
  open("/canceldt?q=" + encodeURIComponent("   "));
  wait("LATEST CANCELS");
  checks.push("Whitespace-only query shows latest");
  open("/canceldt?q=" + encodeURIComponent("UnlistedZyx <script> & nobody") + "&q=ignored");
  wait("is not cancelled.");
  check(
    '!document.querySelector("main script") && document.querySelector("main h1").textContent.includes("<script>")',
    "Special input escaped and first repeated q wins",
  );
  ab("find", "role", "link", "click", "--name", "Should be cancelled? Report it.");
  ab("wait", "form.editor");
  check(
    'document.querySelector("form [name=subject]").value==="UnlistedZyx <script> & nobody"',
    "No-match report link carries the search subject",
  );
  for (let i = 0; i < 12; i++) ab("find", "role", "button", "click", "--name", "+ Add source");
  check(
    'document.querySelectorAll("[name=sourceUrl]").length===12',
    "Source editor supports twelve fields",
  );
  check(
    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Add source")).disabled',
    "Thirteenth source disabled",
  );
  ab("find", "role", "button", "click", "--name", "Remove source 1 ×");
  check(
    'document.querySelectorAll("[name=sourceUrl]").length===11',
    "Remove source keeps remaining fields",
  );
  open("/canceldt?q=" + "x".repeat(161));
  wait("The check was not run.");
  check(
    '!document.body.innerText.includes("is not cancelled.")',
    "Overlong query rejected without verdict",
  );
  open("/canceldt?q=uniqueZXQ");
  wait("is not cancelled.");
  checks.push("Reason text cannot identify a subject");
  for (const [i, suffix] of ["Café", "Sources", "Reason"].entries()) {
    open("/canceldt?q=" + encodeURIComponent(`${prefix} ${suffix}`));
    wait("is cancelled.");
    check(
      `Array.from(document.links).some(a=>a.textContent.includes('The deets'))===${i < 2}`,
      `${suffix}: correct detail affordance`,
    );
    if (i < 2) {
      ab("find", "role", "link", "click", "--name", "The deets");
      wait(suffix);
      check(
        i === 0
          ? 'document.body.innerText.includes("Second paragraph.")'
          : 'Array.from(document.links).some(a=>a.href==="https://example.com/")',
        `${suffix}: detail content present`,
      );
    }
  }
  const draft = await client.query(ref("canceldt/admin:subject"), { id: ids[6] });
  open("/canceldt/subject/" + encodeURIComponent(draft.slug));
  wait("Nothing published here.");
  checks.push("Draft detail excluded");
  open("/canceldt/subject/no-such-fictional-qa-entry");
  wait("Nothing published here.");
  checks.push("Missing detail returns intentional not-found view");
  ab("set", "viewport", "320", "740");
  open("/canceldt?q=" + "Fictional".repeat(17));
  wait("is not cancelled.");
  check(
    "document.documentElement.scrollWidth<=innerWidth",
    "Long subject fits 320px mobile viewport",
  );
  ab("screenshot", "/tmp/canceldt-audit-mobile.png", "--full");
  open("/canceldt/report");
  ab("wait", "form.editor");
  ab("find", "role", "button", "click", "--name", "+ Add source");
  check("document.documentElement.scrollWidth<=innerWidth", "Report sources fit mobile viewport");
  // Browser-native GET response is also inspected independently of the enhanced search.
  open("/canceldt/lookup?q=" + encodeURIComponent(cafe));
  wait("is cancelled.");
  check(
    '!document.querySelector("script")',
    "Native GET fallback returns complete script-free results",
  );
} finally {
  for (const id of ids) {
    const row = await client.query(ref("canceldt/admin:subject"), { id });
    if (row)
      await client.mutation(ref("canceldt/admin:save"), {
        id,
        revision: row.revision,
        subject: row.subject,
        oneLineReason: row.oneLineReason,
        description: row.description,
        sources: row.sources,
        publicationState: "archived",
      });
  }
  await invalidate();
  writeFileSync(
    "/tmp/canceldt-public-browser-results.json",
    JSON.stringify({ prefix, checks }, null, 2),
  );
}
