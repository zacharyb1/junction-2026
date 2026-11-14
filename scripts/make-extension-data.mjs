#!/usr/bin/env node
/**
 * Writes extension/official-hosts.js from src/data/official-sources.json, so the browser extension
 * knows the same official sites as the Engine without a network call.
 *
 *   node scripts/make-extension-data.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const sources = JSON.parse(await readFile(path.join(ROOT, "src/data/official-sources.json"), "utf8"));

/** host -> ISO country code. A pattern such as "*.gov.uk" is kept as its plain suffix "gov.uk". */
const hosts = {};
for (const [code, country] of Object.entries(sources.countries)) {
  const lists = [country.general ?? [], ...Object.values(country.topics ?? {})];
  for (const entry of lists.flat()) {
    const host = String(entry).toLowerCase().replace(/^\*\./, "").replace(/^www\./, "").replace(/\/.*$/, "");
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) && !hosts[host]) hosts[host] = code;
  }
}

const sorted = Object.fromEntries(Object.entries(hosts).sort(([a], [b]) => a.localeCompare(b)));
const body = `// Written by scripts/make-extension-data.mjs from src/data/official-sources.json. Do not edit by hand.
var UKK_OFFICIAL_HOSTS = ${JSON.stringify(sorted)};
if (typeof module !== "undefined") module.exports = { UKK_OFFICIAL_HOSTS };
`;
await writeFile(path.join(ROOT, "extension/official-hosts.js"), body);
console.log(`${Object.keys(sorted).length} official hosts in ${Object.keys(sources.countries).length} countries`);
