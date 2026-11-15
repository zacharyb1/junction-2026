#!/usr/bin/env node
/**
 * Packs the browser extension (extension/) into public/aidaddy-extension.zip, the file the setup page offers.
 *
 *   node scripts/pack-extension.mjs
 *
 * The zip is committed, so a deployment needs no extra build step. Run this after changing a file in extension/;
 * tests/extension-pack.test.ts fails while the zip and the folder differ. The zip holds one folder,
 * aidaddy-extension/, which is the folder to choose in Chrome's "Load unpacked". The prototype in extension/aidaddy-focus is a separate extension and is left out.
 * The file is written without a library: a zip is a list of deflated files followed by a directory of them.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "extension");
const OUT = path.join(ROOT, "public/aidaddy-extension.zip");
const FOLDER = "aidaddy-extension";
const LEFT_OUT = new Set(["aidaddy-focus"]);

/** Every file under a directory, as paths relative to it, in a fixed order. */
async function filesIn(dir, prefix = "") {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || (!prefix && LEFT_OUT.has(entry.name))) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await filesIn(path.join(dir, entry.name), relative)));
    else if (entry.isFile()) out.push(relative);
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// One fixed date in every entry, so the same extension always packs to the same bytes: 15 November 2026, 00:00.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 15;

/** What the zip should hold: every file of the extension with the checksum and size of its contents. */
export async function sourceEntries() {
  const names = await filesIn(SOURCE);
  return Promise.all(
    names.map(async (name) => {
      const data = await readFile(path.join(SOURCE, name));
      return { name: `${FOLDER}/${name}`, crc: crc32(data), size: data.length };
    }),
  );
}

/** What a zip does hold, read from its directory. The checksum is of the unpacked contents, whatever packed them. */
export function zipEntries(zip) {
  const out = [];
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) return out;
  let at = zip.readUInt32LE(end + 16);
  for (let index = 0; index < zip.readUInt16LE(end + 10); index++) {
    const nameLength = zip.readUInt16LE(at + 28);
    out.push({ name: zip.toString("utf8", at + 46, at + 46 + nameLength), crc: zip.readUInt32LE(at + 16), size: zip.readUInt32LE(at + 24) });
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  return out;
}

export const ZIP_PATH = OUT;

export async function packExtension() {
  const names = await filesIn(SOURCE);
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const name of names) {
    const data = await readFile(path.join(SOURCE, name));
    const packed = deflateRawSync(data, { level: 9 });
    const file = Buffer.from(`${FOLDER}/${name}`, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // names are UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(file.length, 26);
    parts.push(local, file, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(file.length, 28);
    central.writeUInt32LE(offset, 42); // where this file's entry starts
    directory.push(central, file);
    offset += local.length + file.length + packed.length;
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...parts, directoryBytes, end]);
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, zip);
  return { files: names, bytes: zip.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const { files, bytes } = await packExtension();
  console.log(`public/aidaddy-extension.zip: ${files.length} files, ${Math.round(bytes / 1024)} kB`);
}
