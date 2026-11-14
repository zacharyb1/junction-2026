import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scripts = path.dirname(fileURLToPath(import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "kaveri-cases-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const local = path.join(root, ".hermes-local");
  await mkdir(path.join(root, "hermes"), { recursive: true });
  for (const file of ["start.sh", "preserve-cases.mjs"]) {
    try {
      await access(path.join(scripts, file));
      await copyFile(path.join(scripts, file), path.join(root, "hermes", file));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { root, local };
}

async function putCase(engine, id, value) {
  const dir = path.join(engine, ".data", "cases");
  await mkdir(dir, { recursive: true });
  const body = JSON.stringify({ id, ...value });
  await writeFile(path.join(dir, `${id}.json`), body);
  return body;
}

function guard(root, local, engine = root, mode = "prepare") {
  return spawnSync(process.execPath, [path.join(root, "hermes", "preserve-cases.mjs"), mode, root, local, engine], { encoding: "utf8" });
}

test("startup preserves an old engine's cases before its directory is removed", async (t) => {
  const { root, local } = await fixture(t);
  const legacy = path.join(local, "engine");
  const original = await putCase(legacy, "case_old_123", { title: "Original case" });
  await mkdir(path.join(local, "agent", ".hermes", "bin"), { recursive: true });
  await mkdir(path.join(local, "home"), { recursive: true });
  await mkdir(path.join(local, "run"), { recursive: true });
  await writeFile(path.join(local, "agent", ".hermes", "bin", "hermes"), "", { mode: 0o700 });
  await writeFile(path.join(local, "home", ".env"), "TELEGRAM_BOT_TOKEN=fixture\nCASEFILE_URL=http://localhost:3000/api/mcp\n");
  await writeFile(path.join(root, "package.json"), '{"packageManager":"pnpm@10.28.0"}');
  // Both services are marked alive: this exercises startup without launching anything.
  for (const name of ["engine", "gateway"]) {
    await writeFile(path.join(local, "run", `${name}.pid`), String(process.pid));
  }
  execFileSync("bash", [path.join(root, "hermes", "start.sh")], { env: { ...process.env, KAVERI_HERMES_LOCAL: local, KAVERI_ENGINE_DIR: root } });
  await rm(legacy, { recursive: true });
  assert.equal(await readFile(path.join(root, ".data", "cases", "case_old_123.json"), "utf8"), original);
  const backups = await readdir(path.join(local, "case-backups"));
  assert.ok(backups.some((name) => name.startsWith("case_old_123.")));
});

test("repeated startup is harmless and also works without a legacy directory", async (t) => {
  const { root, local } = await fixture(t);
  const original = await putCase(root, "case_new_123", { title: "Current case" });
  assert.equal(guard(root, local).status, 0);
  const first = await readdir(path.join(local, "case-backups"));
  const repeated = guard(root, local);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.match(repeated.stdout, /0 new backup\(s\), 0 copied/);
  assert.deepEqual(await readdir(path.join(local, "case-backups")), first);
  assert.equal(await readFile(path.join(root, ".data", "cases", "case_new_123.json"), "utf8"), original);
});

test("conflicting old and current files keep both backups and report the conflict", async (t) => {
  const { root, local } = await fixture(t);
  const current = await putCase(root, "case_same_12", { title: "Updated case" });
  const legacy = await putCase(path.join(local, "engine"), "case_same_12", { title: "Original case" });
  const result = guard(root, local);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /differs between engine directories/);
  assert.equal(await readFile(path.join(root, ".data", "cases", "case_same_12.json"), "utf8"), current);
  const backups = await readdir(path.join(local, "case-backups"));
  assert.equal(backups.length, 2);
  const saved = await Promise.all(backups.map((name) => readFile(path.join(local, "case-backups", name), "utf8")));
  assert.deepEqual(saved.sort(), [current, legacy].sort());
});

test("ambiguous source versions block migration into an empty engine", async (t) => {
  const { root, local } = await fixture(t);
  await putCase(root, "case_same_12", { title: "One case version" });
  await putCase(path.join(local, "engine"), "case_same_12", { title: "Another case version" });
  const target = path.join(root, "new-engine");
  const result = guard(root, local, target);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /conflicting source versions/);
  assert.equal((await readdir(path.join(local, "case-backups"))).length, 2);
  await assert.rejects(readFile(path.join(target, ".data", "cases", "case_same_12.json")), { code: "ENOENT" });
});

test("startup recovers a unique archived version after the previous engine was deleted", async (t) => {
  const { root, local } = await fixture(t);
  const previous = path.join(root, "custom-engine");
  const original = await putCase(previous, "case_custom1", { title: "Case made since startup" });
  await mkdir(path.join(local, "run"), { recursive: true });
  await writeFile(path.join(local, "run", "engine-dir"), previous);
  const snapshot = guard(root, local, root, "backup");
  assert.equal(snapshot.status, 0, snapshot.stderr);
  await assert.rejects(readFile(path.join(root, ".data", "cases", "case_custom1.json")), { code: "ENOENT" });
  assert.equal((await readdir(path.join(local, "case-backups"))).length, 1);
  await rm(previous, { recursive: true });
  const migration = guard(root, local);
  assert.equal(migration.status, 0, migration.stderr);
  assert.equal(await readFile(path.join(root, ".data", "cases", "case_custom1.json"), "utf8"), original);
});

test("multiple archived versions require a choice when no live copy remains", async (t) => {
  const { root, local } = await fixture(t);
  await putCase(root, "case_versions", { title: "First version" });
  assert.equal(guard(root, local, root, "backup").status, 0);
  await putCase(root, "case_versions", { title: "Second version" });
  assert.equal(guard(root, local, root, "backup").status, 0);
  await rm(path.join(root, ".data"), { recursive: true });
  // Backup itself is read-only with respect to the active store, even with ambiguity.
  assert.equal(guard(root, local, root, "backup").status, 0);
  const result = guard(root, local);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /conflicting source versions/);
  await assert.rejects(readFile(path.join(root, ".data", "cases", "case_versions.json")), { code: "ENOENT" });
});

test("an obsolete archive does not conflict with a unique live source", async (t) => {
  const { root, local } = await fixture(t);
  await putCase(root, "case_versions", { title: "Archived version" });
  assert.equal(guard(root, local, root, "backup").status, 0);
  await rm(path.join(root, ".data"), { recursive: true });
  const latest = await putCase(path.join(local, "engine"), "case_versions", { title: "Current live version" });
  const result = guard(root, local);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(await readFile(path.join(root, ".data", "cases", "case_versions.json"), "utf8"), latest);
  assert.equal((await readdir(path.join(local, "case-backups"))).length, 2);
});

test("malformed cases cannot be copied into the active store", async (t) => {
  const { root, local } = await fixture(t);
  const dir = path.join(local, "engine", ".data", "cases");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "case_bad_123.json"), '{"id":"case_bad_123",');
  const result = guard(root, local);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not valid JSON/);
  await assert.rejects(readFile(path.join(root, ".data", "cases", "case_bad_123.json")), { code: "ENOENT" });
});
