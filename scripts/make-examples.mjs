#!/usr/bin/env node
/**
 * Researches every example of the browser demo once and records the case ids,
 * so the demo has real cases to fall back on when live research is not available.
 *
 *   CASEFILE_SECRET=... node --experimental-strip-types scripts/make-examples.mjs --base https://junction-2026.vercel.app
 *
 * The cases are stored wherever that server stores cases. Run it against a server that writes to the
 * production store (the same BLOB_READ_WRITE_TOKEN) if the links should open on production.
 * Writes src/data/example-cases.json. One call at a time: Exa limits searches per second.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { EXAMPLES } from "../src/lib/examples.ts";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CASEFILE_SECRET;
if (!secret) {
  console.error("Set CASEFILE_SECRET: the examples are researched with the bot secret.");
  process.exit(2);
}

const cases = [];
for (const example of EXAMPLES) {
  const res = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ situation: example.text, country: "FI", region: "Espoo", language: "en" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.id) {
    console.error(`${example.label}: HTTP ${res.status} ${body?.error ?? ""}`);
    process.exitCode = 1;
    continue;
  }
  cases.push({
    label: example.label,
    situation: example.text,
    id: body.id,
    title: body.title,
    evidenceVerified: body.evidenceVerified,
    evidenceTotal: body.evidenceTotal,
  });
  console.log(`${example.label}: ${body.id}  ${body.evidenceVerified} of ${body.evidenceTotal} quotes  ${(body.ms / 1000).toFixed(1)} s`);
}

if (cases.length) {
  const file = path.resolve(import.meta.dirname, "../src/data/example-cases.json");
  await writeFile(file, `${JSON.stringify({ generatedAt: new Date().toISOString(), cases }, null, 2)}\n`);
  console.log(`Wrote ${cases.length} cases to src/data/example-cases.json`);
}
