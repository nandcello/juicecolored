// Isolated UI preview. Only a temporary copy serves fixture data: production
// routes, authentication, environment files and the real backend are untouched.
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const modules = resolve(dirname(require.resolve("next/package.json")), "..");
const preview = await mkdtemp(join(tmpdir(), "jarvis-ui-"));
for (const name of [
  "src",
  "babel.config.js",
  "postcss.config.js",
  "tsconfig.json",
  "package.json",
]) {
  await cp(join(root, name), join(preview, name), { recursive: true });
}
await symlink(modules, join(preview, "node_modules"), "dir");
await writeFile(
  join(preview, "next.config.ts"),
  'export default { basePath: "/jarvis", reactCompiler: true, devIndicators: false };\n',
);
const fixture = await readFile(join(root, "tests/fixtures/home.json"), "utf8");
await writeFile(
  join(preview, "src/app/page.tsx"),
  `import { Dashboard } from '@/components/dashboard';\nimport { BUILTIN_SCENES, type Snapshot } from '@/lib/domain';\nconst initial = ${fixture.trim()} as Snapshot;\nexport default function Page() { return <Dashboard initial={initial} presets={BUILTIN_SCENES} />; }\n`,
);
await writeFile(
  join(preview, "src/app/api/jarvis/route.ts"),
  `export async function GET() { return Response.json(${fixture}); }\nexport async function POST() { return Response.json({ error: 'Isolated preview: device commands are disabled.' }, { status: 403 }); }\n`,
);
await mkdir(join(preview, "src/app/sign-in"), { recursive: true });
await writeFile(
  join(preview, "src/app/sign-in/page.tsx"),
  "import { Welcome } from '@/components/welcome'; export default function Page() { return <Welcome configured />; }\n",
);
const port = process.argv[2] || "4317";
console.log(
  `Isolated Jarvis UI preview: http://127.0.0.1:${port}/jarvis (fixture devices; no credentials loaded)`,
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
