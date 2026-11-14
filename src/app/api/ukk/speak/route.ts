import { z } from "zod";
import { mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";
import { renderSpeech, speakable } from "@/lib/speech";

export const maxDuration = 30;

const Input = z.object({ text: z.string().trim().min(1).max(5000) });
const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * One UKK chat reply, read aloud in UKK's voice (ElevenLabs). The page sends the reply it just received;
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
  if (!allow(req, false)) return json({ error: "UKK is busy, try again in a minute." }, 429);
  try {
    const audio = await renderSpeech(text);
    return new Response(new Uint8Array(audio), { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (error) {
    console.error("ukk speech failed", error);
    return json({ error: "UKK lost his voice for a moment. The reply is still in the chat." }, 502);
  }
}
