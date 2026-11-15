import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prepareRecordedSeed } from "./prepare-recorded-seed.mjs";
import { restoreRecordedSeed } from "./restore-recorded-seed.mjs";

const repository = fileURLToPath(new URL("../", import.meta.url));
const archivedFile = "eval/results/2026-11-14T05-01-11-265Z.json";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "recorded-seed-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const archived = JSON.parse(await readFile(path.join(repository, archivedFile), "utf8"));
  const scorecard = JSON.parse(await readFile(path.join(repository, "src/data/scorecard.json"), "utf8"));
  const fresh = {
    generatedAt: "2026-11-15T01:00:00.000Z",
    cases: Array.from({ length: 6 }, (_, i) => ({
      ...structuredClone(archived.results[0].case),
      id: "freshcase_" + String(i + 1).padStart(6, "0"),
      createdAt: "2026-11-15T00:59:00.000Z",
      updatedAt: "2026-11-15T00:59:00.000Z",
    })),
  };
  const replay = { result: { id: fresh.cases[0].id } };
  const examples = { cases: fresh.cases.slice(1).map(({ id }) => ({ id })) };
  const files = {
    [archivedFile]: archived,
    "src/data/scorecard.json": scorecard,
    "src/data/demo-case-seeds.json": fresh,
    "src/data/replay.json": replay,
    "src/data/example-cases.json": examples,
  };
  async function save() {
    for (const [name, document] of Object.entries(files)) {
      const filename = path.join(root, name);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, JSON.stringify(document));
    }
  }
  await save();
  return { root, archived, fresh, scorecard, replay, examples, save, seed: path.join(root, "recorded-case-seed") };
}

test("prepares all 19 original case objects unchanged and six current full cases", async (t) => {
  const { root, archived, fresh, seed } = await fixture(t);
  assert.deepEqual(await prepareRecordedSeed(root), { archived: 19, refreshed: 6, total: 25 });
  assert.equal((await readdir(seed)).length, 25);
  for (const original of [...archived.results.map((row) => row.case), ...fresh.cases]) {
    const copied = JSON.parse(await readFile(path.join(seed, original.id + ".json"), "utf8"));
    assert.deepEqual(copied, original, "Seed must retain original IDs, timestamps, evidence, drafts and fields");
  }
});

test("the reviewed repository inputs produce all 25 linked case originals", async (t) => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "recorded-seed-inputs-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const target = path.join(temporary, "seed");
  assert.deepEqual(await prepareRecordedSeed(repository, target), { archived: 19, refreshed: 6, total: 25 });
  const archived = JSON.parse(await readFile(path.join(repository, archivedFile), "utf8"));
  const fresh = JSON.parse(await readFile(path.join(repository, "src/data/demo-case-seeds.json"), "utf8"));
  for (const document of [...archived.results.map((row) => row.case), ...fresh.cases]) {
    assert.deepEqual(JSON.parse(await readFile(path.join(target, document.id + ".json"), "utf8")), document);
  }
});

test("container startup imports missing cases but retains newer state on every restart", async (t) => {
  const { root, archived } = await fixture(t);
  await prepareRecordedSeed(root);
  const live = path.join(root, ".data", "cases");
  await mkdir(live, { recursive: true });
  const newer = { ...archived.results[0].case, summary: "An existing newer draft must survive" };
  const newerBytes = JSON.stringify(newer) + "\n";
  await writeFile(path.join(live, newer.id + ".json"), newerBytes);
  const first = await restoreRecordedSeed(root, { blobToken: "" });
  assert.equal(first.imported, 24);
  assert.equal(first.keptDifferent, 1);
  const second = await restoreRecordedSeed(root, { blobToken: "" });
  assert.equal(second.imported, 0);
  assert.equal(second.keptDifferent, 1);
  assert.equal(await readFile(path.join(live, newer.id + ".json"), "utf8"), newerBytes);
});

test("Blob deployments skip local recovery without accessing the seed", async (t) => {
  const { root } = await fixture(t);
  assert.deepEqual(await restoreRecordedSeed(root, { blobToken: "configured" }), { skipped: "blob-storage" });
  await assert.rejects(readdir(path.join(root, ".data")), { code: "ENOENT" });
});

for (const [label, mutate] of [
  ["mock source", (f) => { f.archived.mock = true; }],
  ["mismatched captured response", (f) => { f.archived.results[0].response.id = "different_123"; }],
  ["missing original", (f) => { f.archived.results.shift(); }],
  ["duplicate fresh ID", (f) => { f.fresh.cases[1] = structuredClone(f.fresh.cases[0]); }],
  ["unlinked fresh ID", (f) => { f.fresh.cases[0].id = "unlinked_123"; }],
  ["partial fresh case", (f) => { delete f.fresh.cases[0].drafts; }],
  ["fresh case without verified evidence", (f) => { f.fresh.cases[0].evidence = []; }],
]) {
  test("refuses " + label + " before creating output", async (t) => {
    const f = await fixture(t);
    mutate(f);
    await f.save();
    await assert.rejects(prepareRecordedSeed(f.root));
    await assert.rejects(readdir(f.seed), { code: "ENOENT" });
  });
}

test("runtime refuses a malformed image seed before any live case is created", async (t) => {
  const { root, seed, fresh } = await fixture(t);
  await prepareRecordedSeed(root);
  await writeFile(path.join(seed, fresh.cases[5].id + ".json"), "{");
  await assert.rejects(restoreRecordedSeed(root, { blobToken: "" }), /Invalid JSON/);
  await assert.rejects(readdir(path.join(root, ".data")), { code: "ENOENT" });
});
