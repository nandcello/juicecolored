import { cleanupFixture } from "./cleanup.mjs";
// Run against the local production server with agent-browser installed.
// No credentials or cookie values are written to the report.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../../..");
const session = process.env.CANCELDT_BROWSER_SESSION ?? "canceldt-audit";
const origin = process.env.CANCELDT_TEST_ORIGIN ?? "https://juicecolored.local:1355";
const name = `Fictional Browser QA ${Date.now()} Café`;
const report = [];
function ab(...args) {
  const r = spawnSync("agent-browser", ["--session", session, ...args], {
    encoding: "utf8",
    timeout: 40000,
  });
  if (r.status !== 0) throw new Error(`agent-browser ${args[0]} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function check(expression, label) {
  const out = ab("eval", `Boolean(${expression})`);
  if (out !== "true") throw new Error(`FAILED: ${label}: ${out}`);
  report.push(label);
  console.log(`PASS ${label}`);
}
function waitText(text) {
  ab("wait", "--fn", `document.body.innerText.includes(${JSON.stringify(text)})`);
}
function snap() {
  ab("snapshot", "-i");
}
function open(path) {
  ab("open", origin + path);
  ab("wait", "--fn", '!!document.querySelector("main h1")');
  snap();
}
function fill(name, value) {
  ab("fill", `form [name="${name}"]`, value);
}
function click(name) {
  ab("find", "role", "button", "click", "--name", name);
}
function saved() {
  ab("wait", "--fn", '!document.querySelector("button[value=published]").disabled');
  waitText("Saved.");
  snap();
  check(
    'document.querySelectorAll("[name=subject]").length===1',
    "Exactly one subject field after save",
  );
}
const password = parseEnv(
  readFileSync(resolve(root, "apps/web/.env.credentials.local"), "utf8"),
).CANCELDT_ADMIN_PASSPHRASE;
let fixtureId;
try {
  open("/canceldt/admin");
  if (ab("get", "text", "body").includes("The edit desk.")) {
    click("Sign out");
    waitText("Editors only.");
  }
  check(
    '!document.body.innerText.includes("Add subject")',
    "Unauthenticated admin excludes editors",
  );
  fill("password", "definitely-incorrect-qa-passphrase");
  click("Sign in →");
  waitText("Passphrase not recognized.");
  check('document.body.innerText.includes("Editors only.")', "Wrong passphrase rejected");
  fill("password", password);
  click("Sign in →");
  waitText("The edit desk.");
  snap();
  check('location.pathname==="/canceldt/admin"', "Real owner sign-in uses canonical path");
  open("/canceldt/admin?edit=new");
  click("Save draft");
  check(
    '!document.querySelector("[name=subject]").validity.valid',
    "Native required validation prevents empty create",
  );
  fill("subject", "   ");
  fill("oneLineReason", "Fictional test; no real allegation.");
  click("Save draft");
  waitText("Check the marked fields.");
  snap();
  check(
    'document.querySelector("[name=oneLineReason]").value==="Fictional test; no real allegation."',
    "Server validation preserves entered values",
  );
  fill("subject", name);
  click("Save draft");
  saved();
  const id = (fixtureId = JSON.parse(ab("eval", 'document.querySelector("[name=id]").value')));
  writeFileSync("/tmp/canceldt-browser-fixture.json", JSON.stringify({ id, name }, null, 2));
  check('document.querySelector("[name=revision]").value==="1"', "New draft created at revision 1");
  click("+ Add source");
  snap();
  fill("sourceUrl", "ftp://example.com");
  fill("sourceTitle", "Fictional fixture source");
  click("Publish →");
  waitText("Check the marked fields.");
  snap();
  check(
    `document.querySelector('[name=id]').value===${JSON.stringify(id)} && document.querySelector('[name=revision]').value==='1'`,
    "Failed edit retains saved ID and revision",
  );
  check(
    'document.querySelector("[name=sourceUrl]").value==="ftp://example.com"',
    "Unsafe source scheme rejected without losing input",
  );
  fill("sourceUrl", "https://example.com/");
  fill("description", "Fictional first paragraph.\n\nFictional second paragraph.");
  click("Publish →");
  saved();
  check(
    'document.querySelector("[name=publicationState]").value==="published"',
    "Publish keeps the selected publication state",
  );
  check(
    'document.querySelector("[name=revision]").value==="2"',
    "Publish updates the original record",
  );
  fill("oneLineReason", "Fictional edited reason persisted after create.");
  click("Save selected state");
  saved();
  check(
    'document.querySelector("[name=revision]").value==="3"',
    "Second consecutive edit updates the same record",
  );
  open(`/canceldt?q=${encodeURIComponent(name.toUpperCase().replaceAll(" ", "  "))}`);
  waitText("is cancelled.");
  check(
    'document.body.innerText.includes("Fictional edited reason persisted after create.")',
    "Case and whitespace normalized exact search reflects edit",
  );
  ab("find", "role", "link", "click", "--name", "The deets");
  waitText("Fictional second paragraph.");
  snap();
  const detail = JSON.parse(ab("eval", "location.pathname"));
  check(
    'Array.from(document.links).some(a => a.href === "https://example.com/")',
    "Detail renders persisted source",
  );
  open(`/canceldt/admin?edit=${id}`);
  waitText("Edit subject");
  ab("select", "[name=publicationState]", "archived");
  click("Save selected state");
  waitText("Confirm archiving");
  check(
    'document.querySelector("[name=subject]").value.length>0',
    "Archive requires confirmation and preserves form",
  );
  ab("check", "[name=confirmArchive]");
  click("Save selected state");
  saved();
  open(detail);
  waitText("Nothing published here.");
  report.push("Archived detail excluded immediately");
  console.log("PASS Archived detail excluded immediately");
  open(`/canceldt/admin?edit=${id}`);
  waitText("Edit subject");
  click("Publish →");
  saved();
  open(detail);
  waitText("Fictional edited reason");
  report.push("Restored detail visible immediately");
  console.log("PASS Restored detail visible immediately");
  open("/canceldt/admin?edit=new");
  fill("subject", name);
  fill("oneLineReason", "Duplicate fixture");
  click("Publish →");
  waitText("This subject already exists");
  check(
    'document.body.innerText.includes("The edit desk.")',
    "Duplicate create rejected without sign-out",
  );
  open(`/canceldt/admin?edit=${id}`);
  waitText("Edit subject");
  click("Sign out");
  waitText("Editors only.");
  fill("password", password);
  click("Sign in →");
  waitText("The edit desk.");
  check(
    'document.body.innerText.includes("The edit desk.")',
    "Same passphrase works after create, edit, archive, restore and logout",
  );
  open(`/canceldt/admin?edit=${id}`);
  waitText("Edit subject");
  ab("select", "[name=publicationState]", "archived");
  ab("check", "[name=confirmArchive]");
  click("Save selected state");
  saved();
  report.push("Browser-created fixture archived");
} finally {
  await cleanupFixture(fixtureId, name);
  writeFileSync(
    "/tmp/canceldt-agent-browser-results.json",
    JSON.stringify({ date: new Date().toISOString(), session, name, checks: report }, null, 2),
  );
}
