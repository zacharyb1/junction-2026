#!/usr/bin/env node
/**
 * Records one real research run for the front page to replay.
 *
 *   CASEFILE_SECRET=... node scripts/make-replay.mjs --base https://86.38.238.136.sslip.io
 *   node scripts/make-replay.mjs --quiet-only      keeps the recorded run, refreshes the gate part
 *
 * It calls POST /api/research with the event stream on, and writes every event with its real timing,
 * the result, a few messages from the gate test set and the gate's measured counts to src/data/replay.json.
 * Nothing in that file is invented: the page plays back what happened.
 *
 * The front page's "Hear the plan" button plays public/hud/plan.mp3 only for the case named in
 * src/data/plan-audio.json, so after a new recording the button is gone until matching narration exists.
 * With ELEVENLABS_API_KEY configured, render it and name the new case:
 *   curl -o public/hud/plan.mp3 <base>/api/cases/<new case id>/audio
 *   then set caseId and seconds in src/data/plan-audio.json
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000").replace(/\/$/, "");
const request = {
  situation: "I'm pregnant!! Took two tests this morning and both are positive. If I counted right the baby is due in July, and we both work full time.",
  country: "FI",
  region: "Espoo",
  language: "en",
};

const OUT = path.join(ROOT, "src/data/replay.json");

/** Runs the research once and returns its events and result. */
async function record() {
  const secret = process.env.CASEFILE_SECRET;
  if (!secret) {
    console.error("Set CASEFILE_SECRET.");
    process.exit(2);
  }
  const res = await fetch(`${base}/api/research`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(request),
  });
  if (!res.ok || !res.body) {
    console.error(`HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const events = [];
  let result = null;
  let buffer = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let split;
    while ((split = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const name = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.+)$/m)?.[1];
      if (!name || !data) continue;
      const payload = JSON.parse(data);
      if (name === "done") result = payload;
      else if (name === "error") {
        console.error(payload.error);
        process.exit(1);
      } else if (name !== "source") events.push(payload);
    }
  }
  if (!result) {
    console.error("The stream closed before the research finished.");
    process.exit(1);
  }
  return {
    recordedAt: new Date().toISOString(),
    request,
    events,
    result: {
      id: result.id,
      title: result.title,
      plan: result.plan,
      evidence: result.evidence,
      evidenceVerified: result.evidenceVerified,
      evidenceTotal: result.evidenceTotal,
      news: result.news ?? [],
      ms: result.ms,
      exa: result.exa,
      readers: result.readers,
      officialDomains: result.jurisdiction?.officialDomains ?? 0,
    },
  };
}

// --quiet-only keeps the recorded run and refreshes only the gate part below.
const run = process.argv.includes("--quiet-only") ? JSON.parse(await readFile(OUT, "utf8")) : await record();

// The quiet part of the story: messages from the gate's labelled test set that the gate really left alone,
// and what the gate did with the whole set.
const gateRun = JSON.parse(await readFile(path.join(ROOT, "eval/results/gate-gemma3-1b.json"), "utf8"));
const ignored = gateRun.rows
  .filter((row) => row.lang === "en" && row.label === "small_talk" && row.wake === false && !row.error)
  .slice(0, 4)
  .map((row) => row.text);

const replay = {
  recordedAt: run.recordedAt,
  request: run.request,
  events: run.events,
  result: run.result,
  quiet: { ignored, gate: gateRun.summary },
};
await writeFile(OUT, `${JSON.stringify(replay, null, 2)}\n`);
const { result } = replay;
console.log(`${result.title}: ${result.evidenceVerified} of ${result.evidenceTotal} quotes, ${(result.ms / 1000).toFixed(1)} s, ${replay.events.length} events, case ${result.id}`);
for (const line of result.plan) console.log("  -", line);
console.log("Ignored by the gate:", ignored.join(" | "));
