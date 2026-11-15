#!/usr/bin/env node
// Build only the synthetic cases already selected by the public scorecard and demo manifests.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const archivedRun = "eval/results/2026-11-14T05-01-11-265Z.json";
const validId = /^[A-Za-z0-9_-]{8,40}$/;

function caseDocument(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !validId.test(value.id ?? "")) {
    throw new Error(`${label} is not a stored case with a valid ID.`);
  }
  for (const key of ["title", "event", "language", "summary", "createdAt", "updatedAt"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`${label} is missing ${key}.`);
  }
  if (Number.isNaN(Date.parse(value.createdAt)) || Number.isNaN(Date.parse(value.updatedAt))) {
    throw new Error(`${label} has invalid original timestamps.`);
  }
  if (typeof value.jurisdiction?.country !== "string" || !value.jurisdiction.country) {
    throw new Error(`${label} is missing its jurisdiction.`);
  }
  for (const key of ["steps", "money", "evidence", "drafts", "unverified", "openQuestions"]) {
    if (!Array.isArray(value[key])) throw new Error(`${label} is missing ${key}.`);
  }
  return value;
}

function caseIdFromUrl(value) {
  let id;
  try { id = /^\/c\/([A-Za-z0-9_-]{8,40})$/.exec(new URL(value).pathname)?.[1]; } catch { /* Rejected below. */ }
  if (!id) throw new Error("The scorecard contains an invalid case link.");
  return id;
}

export async function prepareRecordedSeed(repository = root, target = path.join(repository, "recorded-case-seed")) {
  const json = async (file) => JSON.parse(await readFile(path.join(repository, file), "utf8"));
  const [run, scorecard, fresh, replay, examples] = await Promise.all([
    json(archivedRun), json("src/data/scorecard.json"), json("src/data/demo-case-seeds.json"),
    json("src/data/replay.json"), json("src/data/example-cases.json"),
  ]);
  if (run.mock !== false || !Array.isArray(run.results)) throw new Error("The archived source must be the recorded non-mock run.");
  const archivedIds = scorecard.rows.map((row) => caseIdFromUrl(row.url));
  if (archivedIds.length !== 19 || new Set(archivedIds).size !== 19) throw new Error("Expected the 19 original scorecard cases.");
  const originals = new Map();
  for (const result of run.results) {
    if (!result.case || !archivedIds.includes(result.case.id)) continue;
    const document = caseDocument(result.case, "Archived case");
    if (result.response?.id !== document.id || result.mock === true) throw new Error("An archived case does not match its recorded response.");
    if (originals.has(document.id)) throw new Error("Duplicate archived case ID.");
    originals.set(document.id, document);
  }
  if (originals.size !== 19 || archivedIds.some((id) => !originals.has(id))) throw new Error("An original scorecard case is missing from the archived run.");

  const sampleIds = [replay.result.id, ...examples.cases.map((item) => item.id)];
  if (sampleIds.length !== 6 || new Set(sampleIds).size !== 6 || sampleIds.some((id) => !validId.test(id))) {
    throw new Error("Expected the recorded landing case and five distinct current examples.");
  }
  if (!Array.isArray(fresh.cases) || fresh.cases.length !== 6 || Number.isNaN(Date.parse(fresh.generatedAt))) {
    throw new Error("Expected six full refreshed demo cases with their generation date.");
  }
  const documents = new Map(originals);
  for (const value of fresh.cases) {
    const document = caseDocument(value, "Refreshed case");
    if (!sampleIds.includes(document.id)) throw new Error("A refreshed case is not linked by the current demo manifests.");
    if (documents.has(document.id)) throw new Error("Duplicate or reused case ID in refreshed demos.");
    if (!document.evidence.some((item) => item?.verification === "verified")) {
      throw new Error("A refreshed demo case has no verified evidence.");
    }
    documents.set(document.id, document);
  }
  if (sampleIds.some((id) => !documents.has(id))) throw new Error("A current demo case has no stored original.");

  // Validation happens before creating output. Do not mix an older image seed into a new one.
  await mkdir(target, { mode: 0o700 });
  for (const [id, document] of documents) {
    await writeFile(path.join(target, `${id}.json`), `${JSON.stringify(document, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  return { archived: originals.size, refreshed: fresh.cases.length, total: documents.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) {
    console.error("Usage: node scripts/prepare-recorded-seed.mjs");
    process.exitCode = 1;
  } else {
    prepareRecordedSeed()
      .then((result) => console.log(`Recorded case seed: ${JSON.stringify(result)}`))
      .catch((error) => { console.error(`Recorded case seed failed: ${error.message}`); process.exitCode = 1; });
  }
}
