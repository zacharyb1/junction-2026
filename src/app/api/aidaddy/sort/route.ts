import { z } from "zod";
import { mayResearch, readJson } from "@/lib/cases";
import { sortSentence } from "@/lib/listen-sort";
import { clientAddress } from "@/lib/rate-limit";

export const maxDuration = 20;

const Input = z.object({ text: z.string().trim().min(1).max(300) });
const json = (body: unknown, status: number) => Response.json(body, { status });

/** Its own small limit per address: a sentence check is cheap and frequent, and must not use up the research limit. */
const WINDOW_MS = 60_000;
const PER_WINDOW = 40;
/** For everyone together, so a caller who changes address cannot keep the one small model busy. */
const ALL_PER_WINDOW = 240;
const hits = new Map<string, number[]>();
let all: number[] = [];
function allowSort(req: Request): boolean {
  // The address the nearest proxy saw, as for research: the caller cannot choose it.
  const client = clientAddress(req);
  const now = Date.now();
  all = all.filter((at) => now - at < WINDOW_MS);
  const recent = (hits.get(client) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= PER_WINDOW || all.length >= ALL_PER_WINDOW) return false;
  all.push(now);
  recent.push(now);
  hits.set(client, recent);
  if (hits.size > 5_000) hits.delete(hits.keys().next().value as string);
  return true;
}

/**
 * The listening page's model check, used only when the presenter switches it on: one sentence the phrase list did
 * not catch goes to the server's local Gemma, which says whether it is a matter. Nothing is stored or logged.
 * Answers { label: "trigger" | "small_talk" | "unsure" }, or 503 when the model is not running here.
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = Input.safeParse(await readJson(req, 4_000).catch(() => null));
  if (!parsed.success) return json({ error: "Send one sentence." }, 400);
  if (!allowSort(req)) return json({ error: "Too many sentences, try again in a minute." }, 429);
  try {
    return json({ label: await sortSentence(parsed.data.text) }, 200);
  } catch {
    return json({ error: "The model check is not running on this server." }, 503);
  }
}
