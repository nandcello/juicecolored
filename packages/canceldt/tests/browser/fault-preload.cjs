// Isolated QA process only. Production application has no fault injection hook.
const fs = require("node:fs");
const realFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  let fault = {};
  try {
    fault = JSON.parse(fs.readFileSync("/tmp/canceldt-fault-mode.json", "utf8"));
  } catch {}
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let body = {};
  try {
    body = JSON.parse(init?.body ?? "{}");
  } catch {}
  if (url.includes(".convex.cloud") && (fault.path === "*" || body.path === fault.path)) {
    if (fault.response)
      return new Response(JSON.stringify(fault.response), {
        status: 560,
        headers: { "Content-Type": "application/json" },
      });
    if (fault.delay) await new Promise((r) => setTimeout(r, fault.delay));
    if (fault.fail)
      throw new TypeError("Simulated backend connection failure", {
        cause: Object.assign(new Error("QA unreachable"), { code: "EHOSTUNREACH" }),
      });
  }
  return realFetch(input, init);
};
