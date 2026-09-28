import { copyFile, lstat, readFile, realpath, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Vercel's output packager cannot copy these cross-workspace symlinks. Keep
// them in local checkouts, but give its build checkout ordinary asset files.
if (process.env.VERCEL === "1") {
  const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const source = resolve(repository, "packages/jarvis/src/assets/icon.svg");
  const contents = await readFile(source);
  const targets = ["apps/web/public/jarvis/icon.svg", "apps/web/src/app/(jarvis)/jarvis/icon.svg"];

  for (const relativePath of targets) {
    const target = resolve(repository, relativePath);
    const stat = await lstat(target);
    if (stat.isFile() && (await readFile(target)).equals(contents)) continue;
    if (!stat.isSymbolicLink() || (await realpath(target)) !== (await realpath(source))) {
      throw new Error(`Expected the package-owned Jarvis icon at ${relativePath}`);
    }

    const temporary = `${target}.vercel-${process.pid}`;
    await copyFile(source, temporary, constants.COPYFILE_EXCL);
    try {
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
