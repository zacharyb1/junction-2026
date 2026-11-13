import { createHash } from "node:crypto";
import { type Case, verifiedCount } from "@/lib/case";
import { labels } from "@/lib/i18n";

/**
 * The spoken version of a case. It reads out stored text only: nothing is summarised, rephrased or added,
 * so the audio can never say more than the case file shows.
 */

const MODEL = "eleven_flash_v2_5";
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const voiceId = () => process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;

export const SPOKEN_LIMIT = 1500;

const sentence = (text: string) => {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/**
 * Title, then every step and money line that stands on a quote found on its page, then the quote count.
 * A step or amount whose quotes all failed is not read out, and a conflict is announced, never retold.
 */
export function spokenText(c: Case): string {
  const t = labels(c.language);
  const found = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));
  const confirmed = (refs: number[]) => refs.some((n) => found.has(n));

  const steps = c.steps
    .filter((s) => confirmed(s.evidence))
    .map((s) =>
      [sentence(s.title), s.due?.trim() ? sentence(`${t.spokenDeadline}: ${s.due.trim()}`) : "", s.conflict ? t.spokenConflict : ""]
        .filter(Boolean)
        .join(" "),
    );
  const money = c.money.filter((m) => confirmed(m.evidence)).map((m) => sentence(`${m.label}: ${m.amount}`));
  const closing = t.spokenClosing(verifiedCount(c), c.evidence.length);

  const build = () =>
    [sentence(c.title), ...steps, ...(money.length ? [sentence(t.money), ...money] : []), closing].join("\n");
  // Too long: whole lines are dropped from the end, steps first. A line is never cut in the middle.
  while (build().length > SPOKEN_LIMIT && steps.length) steps.pop();
  while (build().length > SPOKEN_LIMIT && money.length) money.pop();
  return build();
}

/** Names one rendering. A changed text, voice or model gives a new name, so stale audio is never served. */
export function speechHash(text: string): string {
  return createHash("sha256").update(`${voiceId()}\n${MODEL}\n${text}`).digest("hex").slice(0, 16);
}

/** Text to speech with ElevenLabs. Returns the MP3. */
export async function renderSpeech(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId())}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: MODEL }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs sent no audio");
  return audio;
}
