import { z } from "zod";
import { mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";
import { renderSpeech, replyLanguage, speakable } from "@/lib/speech";

export const maxDuration = 30;

const Input = z.object({ text: z.string().trim().min(1).max(5000) });
const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * One AIDaddy chat reply, read aloud in its voice (ElevenLabs). The page sends the reply it just received;
 * links and markdown are dropped and a long reply is cut after a whole sentence. Needs the demo code,
 * and counts against the same per-visitor limit as the chat, because every rendering costs credits.
 */
export async function POST(req: Request) {
  if (!process.env.ELEVENLABS_API_KEY) return json({ error: "Voice is not set up on this server." }, 503);
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = Input.safeParse(await readJson(req, 20_000).catch(() => null));
  if (!parsed.success) return json({ error: "Nothing to read aloud." }, 400);
  const text = speakable(parsed.data.text);
  if (!text) return json({ error: "Nothing to read aloud." }, 400);
  if (!allow(req, false)) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  try {
    // AIDaddy answers in the language it was written to, and the reply is spoken as that language.
    const audio = await renderSpeech(text, { language: replyLanguage(text) });
    return new Response(new Uint8Array(audio), { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (error) {
    console.error("AIDaddy speech failed", error);
    // The reason is ElevenLabs' short code, for the operator; the page shows only the sentence.
    const reason = error instanceof Error ? error.message : "speech failed";
    return json({ error: "AIDaddy lost its voice for a moment. The reply is still in the chat.", reason }, 502);
  }
}
