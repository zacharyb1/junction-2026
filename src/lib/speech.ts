import { createHash } from "node:crypto";
import { type Case, verifiedCount } from "@/lib/case";
import { labels } from "@/lib/i18n";

/**
 * The spoken version of a case. It reads out stored text only: nothing is summarised, rephrased or added,
 * so the audio can never say more than the case file shows.
 */

const MODEL = "eleven_flash_v2_5";
/**
 * UKK's own voice, designed for this project with ElevenLabs Voice Design from a text description
 * (an older, calm statesman with a light Nordic accent). It is not a clone of anyone's voice.
 * It lives in the team's ElevenLabs account; ELEVENLABS_VOICE_ID overrides it, for example for another account.
 */
export const UKK_VOICE = "UWUOFJTWwuSmZFHzbMpM";
const DEFAULT_VOICE = UKK_VOICE;
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
/** "two (2) months" is written for the eye. Read aloud it would say the number twice. */
const aloud = (text: string) => text.replace(/\s*\(\d+\)/g, "");

export function spokenText(c: Case): string {
  const t = labels(c.language);
  const found = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));
  const confirmed = (refs: number[]) => refs.some((n) => found.has(n));

  const steps = c.steps
    .filter((s) => confirmed(s.evidence))
    .map((s) =>
      [sentence(s.title), s.due?.trim() ? sentence(`${t.spokenDeadline}: ${aloud(s.due.trim())}`) : "", s.conflict ? t.spokenConflict : ""]
        .filter(Boolean)
        .join(" "),
    );
  // A money line named by the start of its own sentence already says the amount. Reading both would say it twice.
  const quoted = (label: string) => /^[“"]/.test(label);
  const money = c.money
    .filter((m) => confirmed(m.evidence))
    .map((m) => sentence(quoted(m.label) && !m.label.endsWith("…”") ? m.label.replace(/[“”"]/g, "") : `${m.label.replace(/[“”"…]/g, "")}: ${m.amount}`));
  const closing = t.spokenClosing(verifiedCount(c), c.evidence.length);

  const build = () =>
    [sentence(c.title), ...steps, ...(money.length ? [sentence(t.money), ...money] : []), closing].join("\n");
  // Too long: whole lines are dropped from the end, steps first. A line is never cut in the middle.
  while (build().length > SPOKEN_LIMIT && steps.length) steps.pop();
  while (build().length > SPOKEN_LIMIT && money.length) money.pop();
  return build();
}

/**
 * A Finnish case is spoken as Finnish throughout. Left to itself the model changes language for an English phrase
 * quoted inside a Finnish plan, and the figure in it came out unclear: "40 working days" was heard as "fourteen".
 * Other cases are sent without a language, as before.
 */
export const spokenLanguage = (c: Case): string | undefined => (c.language.toLowerCase().startsWith("fi") ? "fi" : undefined);

/** Names one rendering. A changed text, voice, model or language gives a new name, so stale audio is never served. */
export function speechHash(text: string, language?: string): string {
  const named = `${voiceId()}\n${MODEL}\n${text}${language ? `\n${language}` : ""}`;
  return createHash("sha256").update(named).digest("hex").slice(0, 16);
}

/** Text to speech with ElevenLabs. Returns the MP3. */
export async function renderSpeech(text: string, language?: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId())}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: MODEL, ...(language ? { language_code: language } : {}) }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs sent no audio");
  return audio;
}

/** The longest chat reply UKK reads aloud. Longer replies are cut after the last whole sentence that fits. */
export const SPEAKABLE_LIMIT = 900;

/**
 * A chat reply made fit for speaking: links and markdown are written for the eye, so they are dropped,
 * and a long reply ends at a sentence boundary. Nothing is added; the words come from the reply itself.
 */
export function speakable(text: string): string {
  const plain = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]+/g, "")
    .replace(/\s*\[\d+\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (plain.length <= SPEAKABLE_LIMIT) return plain;
  const cut = plain.slice(0, SPEAKABLE_LIMIT);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf(".\n"));
  return end > 0 ? cut.slice(0, end + 1) : cut;
}

/** Speech to text with ElevenLabs Scribe. Returns the transcript, or an empty string when nothing was said. */
export async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("file", audio, "voice-note");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}`);
  const body = (await res.json()) as { text?: string };
  return (body.text ?? "").trim();
}
