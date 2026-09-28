import { execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })));
});

async function fixture() {
  const workspace = await mkdtemp(join(tmpdir(), "jarvis-web-assets-"));
  workspaces.push(workspace);
  const source = join(workspace, "packages/jarvis/src/assets/icon.svg");
  const script = join(workspace, "packages/jarvis/scripts/prepare-web-assets.mjs");
  const targets = [
    join(workspace, "apps/web/public/jarvis/icon.svg"),
    join(workspace, "apps/web/src/app/(jarvis)/jarvis/icon.svg"),
  ];
  for (const path of [source, script, ...targets]) await mkdir(dirname(path), { recursive: true });
  await copyFile(join(packageRoot, "src/assets/icon.svg"), source);
  await copyFile(join(packageRoot, "scripts/prepare-web-assets.mjs"), script);
  for (const target of targets) await symlink(relative(dirname(target), source), target);
  return { workspace, source, script, targets };
}

test("ordinary local builds leave the tracked icon symlinks unchanged", async () => {
  const { workspace, script, targets } = await fixture();
  execFileSync(process.execPath, [script], {
    cwd: workspace,
    env: { ...process.env, VERCEL: "0" },
  });
  for (const target of targets) expect((await lstat(target)).isSymbolicLink()).toBe(true);
});

test("Vercel builds receive identical regular icon files without changing the package source", async () => {
  const { workspace, source, script, targets } = await fixture();
  const original = await readFile(source);
  const options = { cwd: workspace, env: { ...process.env, VERCEL: "1" } };
  execFileSync(process.execPath, [script], options);
  execFileSync(process.execPath, [script], options);

  for (const target of targets) {
    expect((await lstat(target)).isSymbolicLink()).toBe(false);
    expect((await lstat(target)).isFile()).toBe(true);
    expect(await readFile(target)).toEqual(original);
  }
  expect(await readFile(source)).toEqual(original);
});
