import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import type { Case } from "@/lib/case";

/**
 * Case storage. Vercel Blob (private) in production, a local folder in development.
 * One JSON document per case, keyed by an unguessable id.
 */

const LOCAL_DIR = path.join(process.cwd(), ".data", "cases");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blobPath = (id: string) => `cases/${id}.json`;
const safeId = (id: string) => /^[A-Za-z0-9_-]{8,40}$/.test(id);

export function storageKind(): "blob" | "local" {
  return blobEnabled() ? "blob" : "local";
}

export async function saveCase(c: Case): Promise<void> {
  const body = JSON.stringify(c, null, 2);
  if (blobEnabled()) {
    await put(blobPath(c.id), body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, `${c.id}.json`), body, "utf8");
}

export async function loadCase(id: string): Promise<Case | null> {
  if (!safeId(id)) return null;
  if (blobEnabled()) {
    try {
      const result = await get(blobPath(id), { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return (await new Response(result.stream).json()) as Case;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(await readFile(path.join(LOCAL_DIR, `${id}.json`), "utf8")) as Case;
  } catch {
    return null;
  }
}

const AUDIO_DIR = path.join(process.cwd(), ".data", "audio");
const audioName = (id: string, hash: string) => `${id}-${hash}.mp3`;
const safeHash = (hash: string) => /^[a-f0-9]{8,64}$/.test(hash);

/** The spoken version of a case, stored next to it. The hash names one version of the spoken text. */
export async function saveAudio(id: string, hash: string, audio: Buffer): Promise<void> {
  if (!safeId(id) || !safeHash(hash)) return;
  if (blobEnabled()) {
    await put(`audio/${audioName(id, hash)}`, audio, {
      access: "private",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await mkdir(AUDIO_DIR, { recursive: true });
  await writeFile(path.join(AUDIO_DIR, audioName(id, hash)), audio);
}

export async function loadAudio(id: string, hash: string): Promise<Buffer | null> {
  if (!safeId(id) || !safeHash(hash)) return null;
  if (blobEnabled()) {
    try {
      const result = await get(`audio/${audioName(id, hash)}`, { access: "private" });
      if (!result || result.statusCode !== 200) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch {
      return null;
    }
  }
  try {
    return await readFile(path.join(AUDIO_DIR, audioName(id, hash)));
  } catch {
    return null;
  }
}
