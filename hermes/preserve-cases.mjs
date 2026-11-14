#!/usr/bin/env node
// Keep exact local case documents outside disposable engine directories.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [mode, repoArg, localArg, engineArg] = process.argv.slice(2);
if (!["prepare", "backup"].includes(mode) || !repoArg || !localArg || !engineArg) {
  console.error("Usage: node hermes/preserve-cases.mjs prepare|backup REPO LOCAL ENGINE");
  process.exit(1);
}

async function preserve() {
  const repo = path.resolve(repoArg);
  const local = path.resolve(localArg);
  const engine = path.resolve(engineArg);
  const backups = path.join(local, "case-backups");
  const target = path.join(engine, ".data", "cases");
  let previous;
  try {
    previous = (await readFile(path.join(local, "run", "engine-dir"), "utf8")).trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const sources = new Set([engine, repo, path.join(local, "engine")]);
  if (previous && path.isAbsolute(previous)) sources.add(previous);
  const cases = new Map();
  const current = new Map();
  let archived = 0;
  for (const source of sources) {
    const dir = path.join(source, ".data", "cases");
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const id = entry.name.slice(0, -5);
      const body = await readFile(path.join(dir, entry.name));
      let document;
      try { document = JSON.parse(body.toString("utf8")); } catch {
        throw new Error(`Case ${entry.name} is not valid JSON; keep its directory and inspect it before starting.`);
      }
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(id) || document?.id !== id) {
        throw new Error(`Case ${entry.name} has an invalid or mismatched id; no migration performed.`);
      }
      const hash = createHash("sha256").update(body).digest("hex");
      await mkdir(backups, { recursive: true, mode: 0o700 });
      try {
        await writeFile(path.join(backups, `${id}.${hash}.json`), body, { flag: "wx", mode: 0o600 });
        archived++;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      if (!cases.has(id)) cases.set(id, new Map());
      cases.get(id).set(hash, body);
      if (source === engine) current.set(id, hash);
    }
  }

  let restored = 0;
  if (mode === "prepare") {
    // A stopped engine may already have been deleted. Use archives only where
    // no live copy remains; an old snapshot must not override a newer live case.
    const liveIds = new Set(cases.keys());
    let entries;
    try {
      entries = await readdir(backups, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      entries = [];
    }
    for (const entry of entries) {
      const match = /^([A-Za-z0-9_-]{8,40})\.([a-f0-9]{64})\.json$/.exec(entry.name);
      if (!entry.isFile() || !match || liveIds.has(match[1])) continue;
      const [, id, expectedHash] = match;
      const body = await readFile(path.join(backups, entry.name));
      if (createHash("sha256").update(body).digest("hex") !== expectedHash) {
        throw new Error(`Backup ${entry.name} failed its checksum; inspect it before restoring this case.`);
      }
      let document;
      try { document = JSON.parse(body.toString("utf8")); } catch {
        throw new Error(`Backup ${entry.name} is not valid JSON; no migration performed.`);
      }
      if (document?.id !== id) {
        throw new Error(`Backup ${entry.name} has a mismatched id; no migration performed.`);
      }
      if (!cases.has(id)) cases.set(id, new Map());
      cases.get(id).set(expectedHash, body);
    }
    // Different versions are preserved in backups, never silently overwritten.
    for (const [id, versions] of cases) {
      if (versions.size > 1 && !current.has(id)) {
        throw new Error(`Case ${id} has conflicting source versions. All are in ${backups}; choose one before starting.`);
      }
    }
    for (const [id, versions] of cases) {
      if (current.has(id)) {
        if (versions.size > 1) console.warn(`cases: ${id} differs between engine directories; keeping the current engine's file. All versions are in ${backups}.`);
        continue;
      }
      await mkdir(target, { recursive: true, mode: 0o700 });
      try {
        await writeFile(path.join(target, `${id}.json`), versions.values().next().value, { flag: "wx", mode: 0o600 });
        restored++;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        throw new Error(`Case ${id} appeared during migration; no existing file was overwritten. Retry after stopping the engine.`);
      }
    }
  }
  console.log(`cases: ${archived} new backup(s), ${restored} copied to the current engine; originals retained`);
}

preserve().catch((error) => {
  console.error(`cases: ${error.message}`);
  process.exitCode = 1;
});
