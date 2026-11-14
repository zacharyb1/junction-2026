import { mayResearch } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";
import { spellName, transcribe } from "@/lib/speech";

export const maxDuration = 45;

/** About 60 seconds of compressed speech. A voice note for AIDaddy is a sentence or two. */
const MAX_AUDIO_BYTES = 2_000_000;
const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * A voice note from the /chat page, turned into text with ElevenLabs Scribe. The page records only while
 * the visitor holds the microphone button on, then puts the transcript in the message box to check
 * before sending. The audio is not stored here.
 */
export async function POST(req: Request) {
  if (!process.env.ELEVENLABS_API_KEY) return json({ error: "Voice is not set up on this server." }, 503);
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const type = req.headers.get("content-type") ?? "";
  if (!type.startsWith("audio/")) return json({ error: "Send a voice note." }, 400);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES) return json({ error: "That voice note is too long." }, 413);
  if (!allow(req, false)) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  const audio = await req.blob().catch(() => null);
  if (!audio || !audio.size) return json({ error: "The voice note was empty." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: "That voice note is too long." }, 413);
  try {
    // Speech to text writes the name as two words ("AI Daddy"). In the message box it is spelled like everywhere else.
    const text = spellName(await transcribe(new Blob([audio], { type })));
    if (!text) return json({ error: "AIDaddy did not catch any words. Try again a little closer." }, 422);
    return json({ text }, 200);
  } catch (error) {
    console.error("AIDaddy transcription failed", error);
    return json({ error: "AIDaddy could not hear that. Please type it instead." }, 502);
  }
}
