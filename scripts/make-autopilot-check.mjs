#!/usr/bin/env node
/**
 * Records one real research run of the question the /autopilot demo's lawyer asks.
 *
 *   CASEFILE_SECRET=... node scripts/make-autopilot-check.mjs --base https://86.38.238.136.sslip.io
 *   DEMO_ACCESS_CODE=... node scripts/make-autopilot-check.mjs --base http://localhost:3000
 *
 * The page runs this same question live when it has an access code. Without one, or when the live
 * check fails, it shows this recording and says so. Nothing in the file is invented: it holds the
 * question, the quotes the Engine found on their pages, and what the run cost.
 * The case link is left out, because the case lives on whichever Engine made the recording.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "src/data/autopilot-check.json");
const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000").replace(/\/$/, "");

const request = {
  situation:
    "We rent a flat in Helsinki and plan to move to Tampere in spring. How do we end the rental agreement and what is the notice period?",
  country: "FI",
  region: "Helsinki",
  language: "en",
};

const headers = { "content-type": "application/json" };
if (process.env.CASEFILE_SECRET) headers.authorization = `Bearer ${process.env.CASEFILE_SECRET}`;
else if (process.env.DEMO_ACCESS_CODE) headers["x-demo-code"] = process.env.DEMO_ACCESS_CODE;
else {
  console.error("Set CASEFILE_SECRET or DEMO_ACCESS_CODE.");
  process.exit(2);
}

const res = await fetch(`${base}/api/research`, { method: "POST", headers, body: JSON.stringify(request) });
if (!res.ok) {
  console.error(`HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const result = await res.json();
if (!result.evidenceVerified) {
  console.error("No quote was found on its page in this run, so nothing was recorded. Try again.");
  process.exit(1);
}

const recording = {
  recordedAt: new Date().toISOString(),
  request,
  title: result.title,
  evidence: result.evidence.map(({ n, url, quote, verification, checkedVia }) => ({ n, url, quote, verification, checkedVia })),
  evidenceVerified: result.evidenceVerified,
  evidenceTotal: result.evidenceTotal,
  exa: result.exa,
  ms: result.ms,
};
await writeFile(OUT, `${JSON.stringify(recording, null, 2)}\n`);
console.log(`${path.relative(ROOT, OUT)}: ${result.evidenceVerified} of ${result.evidenceTotal} quotes found on their pages, ${result.exa.searches} Exa searches, ${result.ms} ms`);
