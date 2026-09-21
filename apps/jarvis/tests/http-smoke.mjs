import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const origin = process.env.JARVIS_TEST_URL ?? "https://juicecolored.localhost";
const values = Object.fromEntries(
  readFileSync(".env.credentials.local", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
const unauth = await fetch(origin + "/jarvis/api/jarvis");
assert.equal(unauth.status, 401);
const cross = await fetch(origin + "/jarvis/api/jarvis", {
  method: "POST",
  headers: { Origin: "https://other.test", "Content-Type": "application/json" },
  body: JSON.stringify({ type: "login", password: "test" }),
});
assert.equal(cross.status, 403);
const signed = await fetch(origin + "/jarvis/api/jarvis", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "login", password: values.JARVIS_OWNER_PASSPHRASE }),
});
assert.equal(signed.status, 200, await signed.text());
const cookie = signed.headers.get("set-cookie");
assert.ok(cookie?.includes("HttpOnly"));
assert.ok(cookie?.includes("SameSite=strict"));
const snapshot = await fetch(origin + "/jarvis/api/jarvis", {
  headers: { Cookie: cookie.split(";")[0] },
});
assert.equal(snapshot.status, 200);
const data = await snapshot.json();
assert.ok(Array.isArray(data.devices));
assert.ok(!JSON.stringify(data).includes("encryptedSession"));
const page = await fetch(origin + "/jarvis", { headers: { Cookie: cookie.split(";")[0] } });
const html = await page.text();
assert.ok(html.includes("My home"));
console.log(
  "HTTP smoke passed: auth gate, cross-origin rejection, owner login, secure cookie, Convex snapshot, authenticated HTML.",
);
