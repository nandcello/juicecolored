import { cleanupFixture } from "./cleanup.mjs";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { SignJWT, importPKCS8 } from "jose";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
const env = parseEnv(
  readFileSync(new URL("../../../../apps/web/.env.local", import.meta.url), "utf8"),
);
const origin = process.env.CANCELDT_TEST_ORIGIN ?? "http://127.0.0.1:3003";
const name = `FictionalReportQa${Date.now()}`;
const checks = [];
function ab(...args) {
  const r = spawnSync("agent-browser", ["--session", "canceldt-reports-test", ...args], {
    encoding: "utf8",
    timeout: 40000,
  });
  if (r.status !== 0) throw new Error(`${args[0]} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function wait(text) {
  ab("wait", "--fn", `document.body.innerText.includes(${JSON.stringify(text)})`);
  ab("snapshot", "-i");
}
function check(expr, label) {
  if (ab("eval", `Boolean(${expr})`) !== "true") throw new Error(label);
  checks.push(label);
  console.log("PASS " + label);
}
function fill(name, value) {
  ab("fill", `form [name="${name}"]`, value);
}
function click(name) {
  ab("find", "role", "button", "click", "--name", name);
}
function open(path) {
  ab("open", origin + path);
  ab("snapshot", "-i");
}
function ready() {
  ab("wait", "--fn", 'Boolean(document.querySelector("[name=cf-turnstile-response]")?.value)');
}
const secret = await importPKCS8(env.CANCELDT_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1" })
  .setIssuer(env.CANCELDT_AUTH_ISSUER)
  .setSubject("canceldt-owner")
  .setAudience("canceldt")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
let fixtureId;
try {
  open(`/canceldt/report?subject=${encodeURIComponent(name)}`);
  ab("wait", "form.editor");
  check(
    `document.querySelector('form [name=subject]').value===${JSON.stringify(name)}`,
    "Report subject prefilled",
  );
  fill("oneLineReason", "Fictional proposed reason for browser QA.");
  ready();
  const submissionId = JSON.parse(
    ab("eval", 'document.querySelector("[name=submissionId]").value'),
  );
  ab("eval", 'document.querySelector("[name=cf-turnstile-response]").value=""');
  click("Submit for review →");
  wait("spam check");
  check(
    'document.querySelector("[name=oneLineReason]").value.includes("Fictional proposed")',
    "Failed spam check keeps report content",
  );
  ready();
  click("Submit for review →");
  wait("Received. Under review.");
  check(
    'document.body.innerText.includes("Nothing has been published or changed")',
    "Report success confirms private review",
  );
  // Retry the exact browser submission through the exposed API, including a spent token.
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  await client.action(makeFunctionReference("canceldt/reports:submit"), {
    subject: name,
    oneLineReason: "Fictional proposed reason for browser QA.",
    description: "",
    sources: [],
    website: "",
    submissionId,
    token: "XXXX.DUMMY.TOKEN.XXXX",
  });
  open(`/canceldt?q=${encodeURIComponent(name)}`);
  wait("is not cancelled.");
  checks.push("Pending report is not public");
  console.log("PASS Pending report is not public");
  // Owner login was independently exercised with the actual passphrase in full-flow.mjs.
  ab(
    "cookies",
    "set",
    "canceldt_session",
    token,
    "--url",
    origin,
    "--path",
    "/canceldt",
    "--httpOnly",
    "--sameSite",
    "Strict",
  );
  open("/canceldt/admin?section=reports");
  wait(name);
  check(
    `Array.from(document.querySelectorAll('.admin-list a')).filter(a=>a.textContent.includes(${JSON.stringify(name)})).length===1`,
    "Repeated submission creates only one pending report",
  );
  ab("find", "text", name, "click");
  wait("Review report");
  click("Approve & publish →");
  wait("Confirm that you intend");
  fill("oneLineReason", "Fictional reason edited during moderation.");
  ab("check", "[name=confirmPublish]");
  click("Approve & publish →");
  wait("Report reviewed.");
  ab("find", "role", "link", "click", "--name", "View saved subject →");
  wait("Edit subject");
  const id = (fixtureId = JSON.parse(ab("eval", 'document.querySelector("[name=id]").value')));
  writeFileSync("/tmp/canceldt-report-browser-fixture.json", JSON.stringify({ name, id }));
  open(`/canceldt?q=${encodeURIComponent(name)}`);
  wait("is cancelled.");
  check(
    'document.body.innerText.includes("Fictional reason edited during moderation.")',
    "Approval publishes edited report content immediately",
  );
  open(`/canceldt/report?subject=${encodeURIComponent(name)}`);
  ab("wait", "form.editor");
  fill("oneLineReason", "Fictional correction applied to existing subject.");
  ready();
  click("Submit for review →");
  wait("Received. Under review.");
  open("/canceldt/admin?section=reports");
  wait(name);
  ab("find", "text", name, "click");
  wait("Review report");
  check(
    `document.querySelector('[name=targetId]').value===${JSON.stringify(id)}`,
    "Correction explicitly targets existing subject",
  );
  ab("check", "[name=confirmPublish]");
  click("Approve & publish →");
  wait("Report reviewed.");
  open(`/canceldt?q=${encodeURIComponent(name)}`);
  wait("Fictional correction applied");
  checks.push("Correction changes existing published entry");
  console.log("PASS Correction changes existing published entry");
  const rejected = name + "Rejected";
  open(`/canceldt/report?subject=${encodeURIComponent(rejected)}`);
  ab("wait", "form.editor");
  fill("oneLineReason", "Fictional rejected report.");
  ready();
  click("Submit for review →");
  wait("Received. Under review.");
  open("/canceldt/admin?section=reports");
  wait(rejected);
  ab("find", "text", rejected, "click");
  wait("Review report");
  click("Reject report");
  wait("Report reviewed.");
  open(`/canceldt?q=${encodeURIComponent(rejected)}`);
  wait("is not cancelled.");
  checks.push("Rejection does not publish");
  console.log("PASS Rejection does not publish");
  open(`/canceldt/admin?edit=${id}`);
  wait("Edit subject");
  ab("select", "[name=publicationState]", "archived");
  ab("check", "[name=confirmArchive]");
  click("Save selected state");
  wait("Saved.");
  checks.push("Report-created fixture archived");
} finally {
  await cleanupFixture(fixtureId, name);
  writeFileSync(
    "/tmp/canceldt-report-browser-results.json",
    JSON.stringify({ name, checks }, null, 2),
  );
}
