// Exercise the unified app with fixture devices in a temporary checkout. No
// credentials are copied, and only the temporary Jarvis routes serve fixtures.
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(root, "../..");
const web = join(repository, "apps/web");
const require = createRequire(import.meta.url);
const modules = resolve(dirname(require.resolve("next/package.json")), "..");
const workspace = await mkdtemp(join(tmpdir(), "unified-jarvis-ui-"));
const preview = join(workspace, "apps/web");
await mkdir(preview, { recursive: true });
for (const name of [
  "src",
  "public",
  "postcss.config.mjs",
  "next.config.ts",
  "tsconfig.json",
  "package.json",
]) {
  await cp(join(web, name), join(preview, name), { recursive: true });
}
await cp(join(preview, "next.config.ts"), join(preview, "next.preview-base.ts"));
await writeFile(
  join(preview, "next.config.ts"),
  'import config from "./next.preview-base";\nexport default { ...config, devIndicators: false };\n',
);
await symlink(modules, join(workspace, "node_modules"), "dir");
await symlink(join(repository, "packages"), join(workspace, "packages"), "dir");
await mkdir(join(preview, "node_modules/@personal"), { recursive: true });
for (const feature of ["jarvis", "canceldt"])
  await symlink(
    join(repository, "packages", feature),
    join(preview, "node_modules/@personal", feature),
    "dir",
  );
const fixture = await readFile(join(root, "tests/fixtures/home.json"), "utf8");
const jarvis = join(preview, "src/app/(jarvis)/jarvis");
// --qa serves an in-memory device simulator with delay/hold/failure controls and
// a request log at /jarvis/qa. It still never contacts a backend or device.
const qa = process.argv.includes("--qa");
const from = (directory, file) =>
  JSON.stringify(relative(directory, join(workspace, "packages/jarvis/tests/qa", file)));
if (qa) {
  await writeFile(
    join(jarvis, "page.tsx"),
    `import { Suspense } from 'react';\nimport { connection } from 'next/server';\nimport { Dashboard } from '@personal/jarvis/components/dashboard';\nimport { BUILTIN_SCENES } from '@personal/jarvis/lib/domain';\nimport { simulator } from ${from(jarvis, "simulator")};\nasync function Home() { await connection(); return <Dashboard initial={simulator.snapshot()} presets={BUILTIN_SCENES} />; }\nexport default function Page() { return <Suspense><Home /></Suspense>; }\n`,
  );
  await writeFile(
    join(jarvis, "api/jarvis/route.ts"),
    `import { connection } from 'next/server';\nimport { simulator } from ${from(join(jarvis, "api/jarvis"), "simulator")};\nconst headers = { 'Cache-Control': 'no-store' };\nexport async function GET() { await connection(); return Response.json(simulator.snapshot(), { headers }); }\nexport async function POST(request: Request) { const { status, json } = await simulator.handle(await request.json()); return Response.json(json, { status, headers }); }\n`,
  );
  await mkdir(join(jarvis, "api/qa"), { recursive: true });
  await writeFile(
    join(jarvis, "api/qa/route.ts"),
    `import { connection } from 'next/server';\nimport { simulator } from ${from(join(jarvis, "api/qa"), "simulator")};\nconst headers = { 'Cache-Control': 'no-store' };\nexport async function GET() { await connection(); return Response.json(simulator.report(), { headers }); }\nexport async function POST(request: Request) { simulator.configure(await request.json()); return Response.json(simulator.report(), { headers }); }\n`,
  );
  await mkdir(join(jarvis, "qa"), { recursive: true });
  await writeFile(
    join(jarvis, "qa/page.tsx"),
    `import { QAPanel } from ${from(join(jarvis, "qa"), "qa-panel")};\nexport default function Page() { return <QAPanel />; }\n`,
  );
} else {
  await writeFile(
    join(jarvis, "page.tsx"),
    `import { Dashboard } from '@personal/jarvis/components/dashboard';\nimport { BUILTIN_SCENES, type Snapshot } from '@personal/jarvis/lib/domain';\nconst initial = ${fixture.trim()} as Snapshot;\nexport default function Page() { return <Dashboard initial={initial} presets={BUILTIN_SCENES} />; }\n`,
  );
  await writeFile(
    join(jarvis, "api/jarvis/route.ts"),
    `export async function GET() { return Response.json(${fixture}); }\nexport async function POST() { return Response.json({ error: 'Isolated preview: device commands are disabled.' }, { status: 403 }); }\n`,
  );
}
await mkdir(join(jarvis, "sign-in"), { recursive: true });
await writeFile(
  join(jarvis, "sign-in/page.tsx"),
  "import { Welcome } from '@personal/jarvis/components/welcome'; export default function Page() { return <Welcome configured />; }\n",
);
const port = process.argv.slice(2).find((arg) => /^\d+$/.test(arg)) || "4317";
console.log(
  qa
    ? `Jarvis QA preview: http://127.0.0.1:${port}/jarvis (simulated devices) · controls and request log: http://127.0.0.1:${port}/jarvis/qa`
    : `Unified Jarvis UI preview: http://127.0.0.1:${port}/jarvis (fixture devices)`,
);
const env = { ...process.env };
for (const name of Object.keys(env)) if (/JARVIS|CONVEX|XIAOMI/.test(name)) delete env[name];
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { cwd: preview, stdio: "inherit", env },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
