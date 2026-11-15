import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { sourceEntries, ZIP_PATH, zipEntries } from "../scripts/pack-extension.mjs";

describe("the extension download on /setup", () => {
  // The zip is committed. After a change in extension/, run: node scripts/pack-extension.mjs
  it("holds the extension exactly as it is in the repository", async () => {
    const packed = zipEntries(await readFile(ZIP_PATH));
    expect(packed).toEqual(await sourceEntries());
  });

  it("unpacks to one folder that Chrome can load, without the separate prototype", async () => {
    const names: string[] = zipEntries(await readFile(ZIP_PATH)).map((entry: { name: string }) => entry.name);
    expect(names).toContain("aidaddy-extension/manifest.json");
    expect(names.every((name) => name.startsWith("aidaddy-extension/"))).toBe(true);
    expect(names.some((name) => name.includes("aidaddy-focus"))).toBe(false);
  });
});
