#!/usr/bin/env node
// The web container imports its reviewed synthetic seed before starting the server.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { restoreCases } from "./restore-cases.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function restoreRecordedSeed(repository = root, { blobToken = process.env.BLOB_READ_WRITE_TOKEN } = {}) {
  // Match the Engine's storage switch exactly. A Blob-backed deployment is not a local restore target.
  if (blobToken) return { skipped: "blob-storage" };
  return restoreCases(path.join(repository, "recorded-case-seed"), path.join(repository, ".data", "cases"), { apply: true });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) {
    console.error("Usage: node scripts/restore-recorded-seed.mjs");
    process.exitCode = 1;
  } else {
    restoreRecordedSeed()
      .then((result) => console.log(`Recorded case restore: ${JSON.stringify(result)}`))
      .catch((error) => { console.error(`Recorded case restore failed: ${error.message}`); process.exitCode = 1; });
  }
}
