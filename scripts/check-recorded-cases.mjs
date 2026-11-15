#!/usr/bin/env node
// Read-only verification of every case linked by the recorded demos and scorecard.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const safeId = /^[A-Za-z0-9_-]{8,40}$/;

export async function recordedCaseIds() {
  const json = async (name) => JSON.parse(await readFile(path.join(root, "src/data", name), "utf8"));
  const [replay, examples, scorecard] = await Promise.all([
    json("replay.json"), json("example-cases.json"), json("scorecard.json"),
  ]);
  const ids = new Set([replay.result.id, ...examples.cases.map((item) => item.id)]);
  for (const row of scorecard.rows) {
    if (row.url) ids.add(new URL(row.url).pathname.split("/c/")[1]);
  }
  for (const file of ["chat-demo/script.ts", "browser-demo/browser-demo.tsx", "talk-demo/talk-demo.tsx", "calendar-demo/calendar-demo.tsx"]) {
    const source = await readFile(path.join(root, "src/components", file), "utf8");
    const id = /export const CASE_URL = "https?:\/\/[^"\s]+\/c\/([A-Za-z0-9_-]{8,40})"/.exec(source)?.[1];
    if (!id) throw new Error(`Cannot identify the recorded case in ${file}.`);
    ids.add(id);
  }
  if ([...ids].some((id) => !safeId.test(id))) throw new Error("A recorded case ID is missing or invalid.");
  return [...ids].sort();
}

export async function checkCaseLinks(origin, ids) {
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("Pass an HTTP(S) origin without a path, credentials or query.");
  }
  if (ids.some((id) => !safeId.test(id))) throw new Error("Invalid case ID.");
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const result = { id, page: null, api: null, matchingCase: false };
      try {
        const [page, api] = await Promise.all([
          fetch(new URL(`/c/${id}`, base), { redirect: "error", signal: AbortSignal.timeout(12000) }),
          fetch(new URL(`/api/cases/${id}`, base), { redirect: "error", signal: AbortSignal.timeout(12000) }),
        ]);
        result.page = page.status;
        result.api = api.status;
        await page.body?.cancel();
        if (api.ok) {
          const document = await api.json();
          result.matchingCase = document?.id === id && Array.isArray(document.steps) && Array.isArray(document.evidence);
        } else await api.body?.cancel();
      } catch {
        result.error = "Request failed, timed out, redirected, or returned invalid JSON";
      }
      result.ok = result.page === 200 && result.api === 200 && result.matchingCase;
      results.push(result);
    }
  }));
  return results.sort((a, b) => a.id.localeCompare(b.id));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--origin")) {
    console.error("Usage: node scripts/check-recorded-cases.mjs [--origin https://host]");
    process.exitCode = 1;
  } else {
    try {
      const results = await checkCaseLinks(args[1] ?? "https://86.38.238.136.sslip.io", await recordedCaseIds());
      for (const result of results) console.log(JSON.stringify(result));
      const failed = results.filter((result) => !result.ok).length;
      console.log(JSON.stringify({ checked: results.length, passed: results.length - failed, failed }));
      if (failed) process.exitCode = 1;
    } catch (error) {
      console.error(`Recorded case check failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
