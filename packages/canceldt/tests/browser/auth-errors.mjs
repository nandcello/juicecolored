import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const results = [];
const faultFile = "/tmp/canceldt-fault-mode.json";
function ab(...args) {
  const r = spawnSync("agent-browser", ["--session", "canceldt-auth-errors", ...args], {
    encoding: "utf8",
    timeout: 35000,
  });
  if (r.status !== 0) throw new Error(`${args[0]}: ${r.stderr || r.stdout}`);
  return r.stdout;
}
try {
  ab("open", "http://127.0.0.1:3003/canceldt/admin");
  ab("wait", "[name=password]");
  ab("snapshot", "-i");
  for (const [fault, message, label] of [
    [
      { path: "canceldt/login:verify", fail: true },
      "The sign-in service could not be reached",
      "Sign-in network failure does not claim the password is wrong",
    ],
    [
      {
        path: "canceldt/login:verify",
        response: {
          status: "error",
          errorMessage: "simulated rate limit",
          errorData: "Too many sign-in attempts. Try again in five minutes.",
        },
      },
      "Too many sign-in attempts. Try again in five minutes.",
      "Sign-in rate limit gives the real retry interval",
    ],
  ]) {
    writeFileSync(faultFile, JSON.stringify(fault));
    ab("fill", "[name=password]", "qa-service-simulation");
    ab("find", "role", "button", "click", "--name", "Sign in →");
    ab("wait", "--fn", `document.body.innerText.includes(${JSON.stringify(message)})`);
    ab("snapshot", "-i");
    results.push(label);
    console.log("PASS", label);
  }
} finally {
  writeFileSync(faultFile, "{}");
  writeFileSync(
    "/tmp/canceldt-auth-errors-browser-results.json",
    JSON.stringify({ checks: results }, null, 2),
  );
}
