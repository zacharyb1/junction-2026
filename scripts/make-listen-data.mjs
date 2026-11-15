#!/usr/bin/env node
/**
 * Writes src/data/wake-patterns.json from hermes/config.snippet.yaml, so the listening page (/listen)
 * lets the same sentences through as the Telegram gate does when its small model is down:
 * the runbook's wake patterns (the lines that start with "#B   - ").
 *
 *   node scripts/make-listen-data.mjs
 *
 * tests/listen.test.ts fails when the two files no longer agree.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** The wake patterns of the runbook, in its order. Same reading as patterns_from_snippet in the gate plugin. */
export async function wakePatterns() {
  const text = await readFile(path.join(ROOT, "hermes/config.snippet.yaml"), "utf8");
  return text.split("\n").flatMap((line) => {
    const match = line.match(/^\s*#B\s+- (".*")\s*$/);
    return match ? [JSON.parse(match[1])] : [];
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const patterns = await wakePatterns();
  for (const pattern of patterns) new RegExp(pattern, "i"); // a pattern the browser cannot read stops here
  await writeFile(path.join(ROOT, "src/data/wake-patterns.json"), `${JSON.stringify(patterns, null, 2)}\n`);
  console.log(`${patterns.length} wake patterns`);
}
