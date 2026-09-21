import { cleanupFixture } from "./cleanup.mjs";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { SignJWT, importPKCS8 } from "jose";
const env = parseEnv(readFileSync(new URL("../../.env.local", import.meta.url), "utf8"));
const origin = "http://127.0.0.1:3003";
const name = `Fictional Failure QA ${Date.now()}`;
const checks = [];
const faultFile = "/tmp/canceldt-fault-mode.json";
const key = await importPKCS8(env.CANCELDT_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: "canceldt-owner-1" })
  .setIssuer(env.CANCELDT_AUTH_ISSUER)
  .setSubject("canceldt-owner")
  .setAudience("canceldt")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(key);
function ab(...args) {
  const r = spawnSync("agent-browser", ["--session", "canceldt-failures", ...args], {
    encoding: "utf8",
    timeout: 40000,
  });
  if (r.status !== 0) throw new Error(`${args[0]} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function fault(path, fail = true) {
  writeFileSync(faultFile, JSON.stringify({ path, fail }));
}
function wait(text) {
  ab("wait", "--fn", `document.body.innerText.includes(${JSON.stringify(text)})`);
  ab("snapshot", "-i");
}
function click(name) {
  ab("find", "role", "button", "click", "--name", name);
}
function check(expr, label) {
  if (ab("eval", `Boolean(${expr})`) !== "true") throw new Error(label);
  checks.push(label);
  console.log("PASS " + label);
}
function cookie(value) {
  ab(
    "cookies",
    "set",
    "canceldt_session",
    value,
    "--url",
    origin,
    "--path",
    "/canceldt",
    "--httpOnly",
    "--sameSite",
    "Strict",
  );
}
let fixtureId;
try {
  ab("open", origin + "/canceldt/admin");
  cookie(token);
  fault("canceldt/admin:permission");
  ab("open", origin + "/canceldt/admin");
  wait("The edit desk could not be loaded.");
  check(
    '!document.querySelector("[name=password]")',
    "Backend outage shows service error instead of login",
  );
  fault("");
  click("Retry →");
  wait("The edit desk.");
  checks.push("Retry restores admin with the same session");
  console.log("PASS Retry restores admin with the same session");
  ab("open", origin + "/canceldt/admin?edit=new");
  wait("New subject");
  ab("fill", "[name=subject]", name);
  ab("fill", "[name=oneLineReason]", "Fictional input retained through failures.");
  fault("canceldt/admin:save");
  click("Save draft");
  wait("Your entered values are kept");
  check(
    `document.querySelector('[name=subject]').value===${JSON.stringify(name)}`,
    "Failed create retains input",
  );
  fault("");
  click("Save draft");
  wait("Saved.");
  check(
    'document.querySelector("[name=revision]").value==="1"',
    "Retry after failed create saves one draft",
  );
  const id = (fixtureId = JSON.parse(ab("eval", 'document.querySelector("[name=id]").value')));
  cookie("tampered-session");
  ab("fill", "[name=oneLineReason]", "Fictional edit retained after session expires.");
  click("Publish →");
  wait("Your session has expired");
  check(
    `document.querySelector('[name=id]').value===${JSON.stringify(id)} && document.querySelector('[name=oneLineReason]').value.includes('session expires')`,
    "Expired session preserves record identity and unsaved edit",
  );
  check(
    'Array.from(document.links).some(a => a.target === "_blank" && a.pathname === "/canceldt/admin")',
    "Expired session offers separate-tab sign-in",
  );
  cookie(token);
  click("Publish →");
  wait("Saved.");
  check(
    'document.querySelector("[name=revision]").value==="2"',
    "Restored session retries original edit successfully",
  );
  // Two open editors must not silently overwrite each other.
  const originalTab = ab("tab", "list").match(/→ \[(t\d+)\]/)[1];
  ab("tab", "new", origin + `/canceldt/admin?edit=${id}`);
  wait("Edit subject");
  ab("fill", "[name=oneLineReason]", "Fictional newer concurrent edit.");
  click("Save selected state");
  wait("Saved.");
  ab("tab", originalTab);
  ab("fill", "[name=oneLineReason]", "Fictional stale edit must be rejected.");
  click("Save selected state");
  wait("Another edit was saved.");
  check(
    'document.querySelector("[name=oneLineReason]").value.includes("stale edit")',
    "Concurrent edit conflict rejects overwrite and retains input",
  );
  ab("open", origin + `/canceldt/admin?edit=${id}`);
  wait("Edit subject");
  check(
    'document.querySelector("[name=oneLineReason]").value.includes("newer concurrent")',
    "Reload displays the actual winning revision",
  );
  ab("select", "[name=publicationState]", "archived");
  ab("check", "[name=confirmArchive]");
  click("Save selected state");
  wait("Saved.");
  fault("canceldt/public:search");
  ab("open", origin + "/canceldt?q=FictionalOutageSearch");
  wait("The check could not be completed.");
  check(
    '!document.body.innerText.includes("is not cancelled.")',
    "Failed public lookup never shows a not-cancelled verdict",
  );
  fault("");
  ab("find", "role", "link", "click", "--name", "Retry →");
  wait("is not cancelled.");
  checks.push("Public Retry re-runs the failed lookup");
  console.log("PASS Public Retry re-runs the failed lookup");
} finally {
  await cleanupFixture(fixtureId, name);
  fault("");
  writeFileSync(
    "/tmp/canceldt-failure-browser-results.json",
    JSON.stringify({ name, checks }, null, 2),
  );
}
