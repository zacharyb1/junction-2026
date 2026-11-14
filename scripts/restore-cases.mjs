#!/usr/bin/env node
// Import an exact Blob cases/ backup into local storage without replacing live cases.
import { constants } from "node:fs";
import { link, lstat, mkdir, mkdtemp, open, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function directory(dir, optional = false) {
  try {
    if (!(await lstat(dir)).isDirectory()) throw new Error(`${dir} must be a directory, not a symlink.`);
  } catch (error) {
    if (!optional || error.code !== "ENOENT") throw error;
  }
}

async function regularFile(file) {
  const stat = await lstat(file);
  if (!stat.isFile()) throw new Error(`${file} must be a regular file.`);
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await handle.stat()).isFile()) throw new Error(`${file} must be a regular file.`);
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function currentFile(file) {
  try { return await regularFile(file); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function restoreCases(sourceArg, targetArg, { apply = false } = {}) {
  const source = path.resolve(sourceArg);
  const target = path.resolve(targetArg);
  if (source === target) throw new Error("Backup and destination must be different directories.");
  await directory(source);
  await directory(target, true);
  const result = { mode: apply ? "apply" : "dry-run", cases: 0, missing: 0, identical: 0, keptDifferent: 0, imported: 0 };
  const missing = [];

  // Validate the complete input before creating anything in the live store.
  for (const name of (await readdir(source)).filter((name) => name.endsWith(".json")).sort()) {
    const match = /^([A-Za-z0-9_-]{8,40})\.json$/.exec(name);
    if (!match) throw new Error(`Invalid backup filename: ${name}`);
    const body = await regularFile(path.join(source, name));
    let document;
    try { document = JSON.parse(body.toString("utf8")); } catch {
      throw new Error(`Invalid JSON in ${name}; no files imported.`);
    }
    if (document?.id !== match[1]) throw new Error(`Mismatched case ID in ${name}; no files imported.`);
    result.cases++;
    const current = await currentFile(path.join(target, name));
    if (current === null) missing.push({ name, body });
    else if (current.equals(body)) result.identical++;
    else result.keptDifferent++;
  }
  if (!result.cases) throw new Error("The backup has no case JSON files; check the source directory.");
  result.missing = missing.length;
  if (!apply || !missing.length) return result;

  await mkdir(target, { recursive: true, mode: 0o700 });
  await directory(target);
  const staging = await mkdtemp(path.join(target, ".restore-"));
  try {
    for (const { name, body } of missing) {
      const temporary = path.join(staging, name);
      await writeFile(temporary, body, { flag: "wx", mode: 0o600 });
      try {
        // An exclusive hard link publishes complete bytes atomically. A live write wins.
        await link(temporary, path.join(target, name));
        result.imported++;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const current = await regularFile(path.join(target, name));
        if (current.equals(body)) result.identical++;
        else result.keptDifferent++;
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [source, target, ...flags] = process.argv.slice(2);
  if (!source || !target || flags.some((flag) => flag !== "--apply") || flags.length > 1) {
    console.error("Usage: node scripts/restore-cases.mjs BACKUP_CASES DESTINATION_CASES [--apply]");
    process.exitCode = 1;
  } else {
    restoreCases(source, target, { apply: flags.includes("--apply") })
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => { console.error(`Case restore failed: ${error.message}`); process.exitCode = 1; });
  }
}
