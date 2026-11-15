import { allow } from "@/lib/rate-limit";
import { renderSpeech, speechHash, spokenDelivery, spokenLanguage, spokenText } from "@/lib/speech";
import { loadAudio, loadCase, saveAudio } from "@/lib/store";

export const maxDuration = 30;

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

/** Renderings in progress, so two requests for the same audio pay for one. */
const rendering = new Map<string, Promise<Buffer>>();

/** Phones ask for a byte range before they play anything, so ranges are answered. */
function audioResponse(req: Request, audio: Buffer, voice: Record<string, string>): Response {
  const headers = { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600", "accept-ranges": "bytes", ...voice };
  const size = audio.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (!range || (!range[1] && !range[2])) {
    return new Response(new Uint8Array(audio), { headers });
  }
  // "bytes=-500" means the last 500 bytes.
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  return new Response(new Uint8Array(audio.subarray(start, end + 1)), {
    status: 206,
    headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}` },
  });
}

/**
 * The case read aloud, as an MP3. Like the case itself it needs no secret: the id is unguessable.
 * Each version of the spoken text is rendered once and then served from the case store.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/cases/[id]/audio">) {
  if (!process.env.ELEVENLABS_API_KEY) return notFound();
  const { id } = await ctx.params;
  const c = await loadCase(id);
  if (!c) return notFound();

  const text = spokenText(c);
  // The voice fits the case: read in the case's language, gently after bad news, brighter after good news.
  const language = spokenLanguage(c);
  const delivery = spokenDelivery(c);
  const voice = { "x-spoken-language": language ?? "as written", "x-spoken-delivery": delivery };
  const hash = speechHash(text, language, delivery);
  const stored = await loadAudio(id, hash);
  if (stored) return audioResponse(req, stored, voice);

  const key = `${id}-${hash}`;
  let job = rendering.get(key);
  if (!job) {
    // Only a new rendering costs ElevenLabs credits, so only that is limited.
    if (!allow(req, false)) {
      return Response.json({ error: "The demo is busy. Please try again in a minute." }, { status: 429 });
    }
    job = renderSpeech(text, { language, delivery })
      .then(async (audio) => {
        // A failed save only means the next request renders again.
        await saveAudio(id, hash, audio).catch(() => {});
        return audio;
      })
      .finally(() => rendering.delete(key));
    rendering.set(key, job);
  }
  try {
    return audioResponse(req, await job, voice);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "speech failed" }, { status: 502 });
  }
}
