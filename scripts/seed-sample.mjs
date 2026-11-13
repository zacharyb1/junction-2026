// Usage: node scripts/seed-sample.mjs [baseUrl]   (default http://localhost:3000)
// Publishes src/data/sample-case.json through the REST API and prints the case URL.
// Set CASEFILE_SECRET in the environment when the target requires it.
import { readFile } from "node:fs/promises";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const body = await readFile(new URL("../src/data/sample-case.json", import.meta.url), "utf8");

const res = await fetch(`${base}/api/cases`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...(process.env.CASEFILE_SECRET ? { authorization: `Bearer ${process.env.CASEFILE_SECRET}` } : {}),
  },
  body,
});

const out = await res.json();
console.log(JSON.stringify(out, null, 2));
process.exit(res.ok ? 0 : 1);
