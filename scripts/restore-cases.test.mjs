import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { restoreCases } from "./restore-cases.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "case-restore-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "backup");
  const target = path.join(root, "live");
  await mkdir(source);
  const body = '{\n  "id": "archived_123", "summary": "Original evidence", "steps": []\n}\n';
  await writeFile(path.join(source, "archived_123.json"), body);
  return { root, source, target, body };
}

test("the default is a dry run and creates no destination", async (t) => {
  const { source, target } = await fixture(t);
  const result = await restoreCases(source, target);
  assert.equal(result.missing, 1);
  assert.equal(result.imported, 0);
  await assert.rejects(readdir(target), { code: "ENOENT" });
});

test("imports exact bytes and retains originals; repeating is harmless", async (t) => {
  const { source, target, body } = await fixture(t);
  assert.equal((await restoreCases(source, target, { apply: true })).imported, 1);
  assert.equal(await readFile(path.join(target, "archived_123.json"), "utf8"), body);
  assert.equal(await readFile(path.join(source, "archived_123.json"), "utf8"), body);
  const repeat = await restoreCases(source, target, { apply: true });
  assert.equal(repeat.imported, 0);
  assert.equal(repeat.identical, 1);
  assert.deepEqual(await readdir(target), ["archived_123.json"]);
});

test("keeps newer existing cases while recovering other missing cases", async (t) => {
  const { source, target } = await fixture(t);
  await mkdir(target);
  const current = '{"id":"archived_123","summary":"Newer approved draft"}';
  await writeFile(path.join(target, "archived_123.json"), current);
  const another = '{"id":"archived_456","summary":"Another original"}';
  await writeFile(path.join(source, "archived_456.json"), another);
  const result = await restoreCases(source, target, { apply: true });
  assert.equal(result.keptDifferent, 1);
  assert.equal(result.imported, 1);
  assert.equal(await readFile(path.join(target, "archived_123.json"), "utf8"), current);
  assert.equal(await readFile(path.join(target, "archived_456.json"), "utf8"), another);
});

for (const [label, body] of [["malformed JSON", "{"], ["mismatched ID", '{"id":"another_789"}']]) {
  test(`validates the whole backup before any write: ${label}`, async (t) => {
    const { source, target } = await fixture(t);
    await writeFile(path.join(source, "invalid_123.json"), body);
    await assert.rejects(restoreCases(source, target, { apply: true }));
    await assert.rejects(readdir(target), { code: "ENOENT" });
  });
}

test("refuses case symlinks instead of reading or writing outside the directories", async (t) => {
  const { root, source, target } = await fixture(t);
  const outside = path.join(root, "outside.json");
  await writeFile(outside, '{"id":"outside_123"}');
  await symlink(outside, path.join(source, "outside_123.json"));
  await assert.rejects(restoreCases(source, target, { apply: true }), /regular file/);
  await rm(path.join(source, "outside_123.json"));
  await mkdir(target);
  await symlink(outside, path.join(target, "archived_123.json"));
  await assert.rejects(restoreCases(source, target, { apply: true }), /regular file/);
  assert.equal(await readFile(outside, "utf8"), '{"id":"outside_123"}');
});

test("concurrent restores publish each missing case once without partial files", async (t) => {
  const { source, target, body } = await fixture(t);
  const results = await Promise.all([
    restoreCases(source, target, { apply: true }),
    restoreCases(source, target, { apply: true }),
  ]);
  assert.equal(results.reduce((n, result) => n + result.imported, 0), 1);
  assert.equal(await readFile(path.join(target, "archived_123.json"), "utf8"), body);
  assert.deepEqual(await readdir(target), ["archived_123.json"]);
});
