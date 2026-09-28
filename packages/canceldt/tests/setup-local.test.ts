import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const workspaces: string[] = [];
const testDirectory = dirname(fileURLToPath(import.meta.url));

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "canceldt-setup-"));
  workspaces.push(root);
  const web = join(root, "apps/web");
  const scripts = join(root, "packages/canceldt/scripts");
  await mkdir(web, { recursive: true });
  await mkdir(scripts, { recursive: true });
  await symlink(resolve(testDirectory, "../../../node_modules"), join(root, "node_modules"));
  const script = join(scripts, "setup-local.mjs");
  await cp(resolve(testDirectory, "../scripts/setup-local.mjs"), script);
  await writeFile(join(root, ".env.local"), "VITE_CONVEX_URL=https://shared.convex.cloud\n");
  await writeFile(
    join(web, ".env.local"),
    "NEXT_PUBLIC_CONVEX_URL=https://existing.convex.cloud\nJARVIS_SESSION_SECRET=existing-session\n",
  );
  return { root, web, script };
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("CANCELDT setup in the shared Next application", () => {
  it("preserves Jarvis credentials and unrelated backend settings when adding CANCELDT", async () => {
    const { root, web, script } = await fixture();
    const owner = "# Migrated Jarvis owner\nJARVIS_OWNER_PASSPHRASE=existing-owner";
    const backend = "OTHER_FEATURE_SETTING=keep-this\n";
    await writeFile(join(web, ".env.credentials.local"), owner);
    await writeFile(join(web, ".env.convex.local"), backend);
    const { stdout, stderr } = await run(process.execPath, [script], { cwd: root });
    expect(stderr).toBe("");
    const credentials = await readFile(join(web, ".env.credentials.local"), "utf8");
    const convex = await readFile(join(web, ".env.convex.local"), "utf8");
    const env = parseEnv(await readFile(join(web, ".env.local"), "utf8"));
    expect(credentials.startsWith(`${owner}\n`)).toBe(true);
    expect(convex.startsWith(backend)).toBe(true);
    expect(parseEnv(credentials).JARVIS_OWNER_PASSPHRASE).toBe("existing-owner");
    expect(parseEnv(credentials).CANCELDT_ADMIN_PASSPHRASE).toBeTruthy();
    expect(env.JARVIS_SESSION_SECRET).toBe("existing-session");
    expect(env.NEXT_PUBLIC_CONVEX_URL).toBe("https://existing.convex.cloud");
    expect(parseEnv(convex).CANCELDT_LOGIN_SECRET).toBe(env.CANCELDT_LOGIN_SECRET);
    expect(stdout).not.toContain(parseEnv(credentials).CANCELDT_ADMIN_PASSPHRASE!);
    expect(stdout).not.toContain(env.CANCELDT_LOGIN_SECRET!);
    for (const file of [".env.local", ".env.credentials.local", ".env.convex.local"])
      expect((await stat(join(web, file))).mode & 0o777).toBe(0o600);
  });

  it.each([".env.credentials.local", ".env.convex.local"])(
    "refuses existing CANCELDT values in %s before changing shared files",
    async (file) => {
      const { root, web, script } = await fixture();
      const existing = "JARVIS_OWNER_PASSPHRASE=keep-owner\nCANCELDT_EXISTING_KEY=keep-key\n";
      await writeFile(join(web, file), existing);
      const originalEnv = await readFile(join(web, ".env.local"), "utf8");
      await expect(run(process.execPath, [script], { cwd: root })).rejects.toThrow(
        "refusing to rotate keys",
      );
      expect(await readFile(join(web, file), "utf8")).toBe(existing);
      expect(await readFile(join(web, ".env.local"), "utf8")).toBe(originalEnv);
    },
  );
});
