import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Run only after approval to install these Jarvis-only keys in Vercel production.
const values = Object.fromEntries(
  readFileSync(".env.credentials.local", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
for (const name of ["JARVIS_GATEWAY_SECRET", "JARVIS_SESSION_SECRET"]) {
  if (!values[name] || values[name].length < 32)
    throw new Error(`Missing ${name}. Run setup-secrets first.`);
  const result = spawnSync(
    "vercel",
    ["env", "add", name, "production", "--scope", "alt164", "--sensitive"],
    { input: values[name], encoding: "utf8" },
  );
  if (result.status !== 0) {
    // Do not print the captured process output: a failure should never expose secret input.
    console.error(
      `Could not add ${name}. Check project linkage and whether this variable already exists.`,
    );
    process.exit(1);
  }
  console.log(`${name} configured in Vercel production.`);
}
