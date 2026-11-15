import { createHash } from "node:crypto";
import { type Case, verifiedCount } from "@/lib/case";
import { labels } from "@/lib/i18n";

/**
 * The spoken version of a case. It reads out stored text only: nothing is summarised, rephrased or added,
 * so the audio can never say more than the case file shows.
 */

const MODEL = "eleven_flash_v2_5";
/**
 * AIDaddy's own voice, designed for this project with ElevenLabs Voice Design from a text description
 * (an older, calm voice with a light Nordic accent). It is not a clone of anyone's voice.
 * It lives in the team's ElevenLabs account; ELEVENLABS_VOICE_ID overrides it, for example for another account.
 */
export const AIDADDY_VOICE = "UWUOFJTWwuSmZFHzbMpM";
const DEFAULT_VOICE = AIDADDY_VOICE;
/**
 * ELEVENLABS_VOICE_ID as an operator typed it into an env file. Quotes, spaces and a line ending pasted along with
 * it are dropped, and a value that still is not a voice id gives AIDaddy's own voice: a malformed id makes
 * ElevenLabs refuse every request (400 invalid_uid), which took the server's voice down while the key was fine.
 */
const voiceId = () => {
  const typed = (process.env.ELEVENLABS_VOICE_ID ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  return /^[A-Za-z0-9]{16,32}$/.test(typed) ? typed : DEFAULT_VOICE;
};

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
 * The voice fits the case. Three things are chosen from the case itself, never from a model's guess:
 * the language it is read in, the model that speaks that language, and the delivery.
 */

/**
 * A case written in one of these languages is spoken as that language throughout. Left to itself the model changes
 * language for an English phrase quoted inside a Finnish plan, and the figure in it came out unclear: "40 working
 * days" was heard as "fourteen". English cases are sent without a language, as before.
 */
const SPOKEN_AS = new Set(["fi", "sv", "de", "es", "fr", "uk", "et"]);
export const spokenLanguage = (c: Pick<Case, "language">): string | undefined => {
  const code = c.language.toLowerCase().slice(0, 2);
  return SPOKEN_AS.has(code) ? code : undefined;
};

/** The fast model does not speak Estonian (it answers 400 for that language); the newer turbo model does. */
const MODEL_FOR: Record<string, string> = { et: "eleven_v4_turbo" };
const modelFor = (language?: string) => (language && MODEL_FOR[language]) || MODEL;

/**
 * How a case is read. "plain" is the voice as it was designed. "gentle" is slower and steadier, for a case that
 * starts with bad news: a dismissal, a fine, an eviction, an illness. "bright" has more movement in it, for a case
 * that starts with good news: a baby, a wedding, a new job.
 */
export type Delivery = "plain" | "gentle" | "bright";

/** Sent to ElevenLabs as voice_settings. Measured on one sentence: 7.4 s plain, 8.0 s gentle. */
const DELIVERY: Record<Delivery, { stability: number; speed: number } | undefined> = {
  plain: undefined,
  gentle: { stability: 0.7, speed: 0.92 },
  bright: { stability: 0.4, speed: 1.02 },
};

// The event slug is English; the title is in the case's language, so the Finnish words stand beside the English ones.
const HARD =
  /\b(job loss|lost (my|his|her|their|the) job|laid off|layoff|redundan\w*|dismiss\w*|terminat\w*|unemploy\w*|evict\w*|fine|fined|penalt\w*|debt\w*|overdue|bankrupt\w*|death|died|funeral|bereave\w*|illness|sick|injur\w*|accident|hospital\w*|divorce\w*|separation|cancel\w*|delay\w*|denied|refus\w*|reject\w*|rent increase|stolen|theft|burglar\w*|lost passport)\b|irtisano|lomaut|työttöm|häätö|sakko|sakon|maksumuistu|perintä|velka|kuol|hautaj|sairas|sairaus|tapaturm|avioero|peruut|peruun|myöhäst|hylä|hylkä|kielteinen|vuokrankorotu|varast|varkau/i;
const GOOD =
  /\b(pregnan\w*|baby|birth|newborn|expecting|wedding|marri\w*|engag\w*|new job|job offer|hired|promot\w*|graduat\w*|new home|housewarming|birthday|adopt\w*)\b|raska|vauva|syntymä|synty|häät|naimisiin|kihla|uusi työ|työtarjou|valmistu|uusi koti|uuteen kotiin/i;

/** The delivery for a case, from its event and title. Bad news wins when a case holds both. */
export function spokenDelivery(c: Pick<Case, "event" | "title">): Delivery {
  const about = `${c.event} ${c.title}`.replace(/[_-]+/g, " ");
  if (HARD.test(about)) return "gentle";
  if (GOOD.test(about)) return "bright";
  return "plain";
}

/**
 * The name, written for the ear. As one word the voice swallows its first letters: speech to text heard
 * "Hey, Daddy here" in English and "iDaddy" in Finnish. As two words it is heard as "AI Daddy" in both,
 * also with a Finnish ending ("AI Daddyn"). Only what is sent to the voice changes; the page still says AIDaddy.
 */
export const forVoice = (text: string): string => text.replace(/AIDaddy/g, "AI Daddy");

/**
 * Names one rendering. A changed text, voice, model, language or delivery gives a new name, so stale audio is never
 * served. A plain rendering with the fast model is named as it always was, so audio stored earlier still plays.
 */
export function speechHash(text: string, language?: string, delivery: Delivery = "plain"): string {
  const model = modelFor(language);
  const named = `${voiceId()}\n${model}\n${forVoice(text)}${language ? `\n${language}` : ""}${delivery === "plain" ? "" : `\n${delivery}`}`;
  return createHash("sha256").update(named).digest("hex").slice(0, 16);
}

/**
 * Why ElevenLabs said no, as "ElevenLabs answered 400 (voice_not_found)". The word in brackets is the short code
 * of its answer: it names the cause (an unknown voice, a key without the permission, a spent quota) and holds
 * nothing private, so the route may pass it on and the operator can read the reason without the server's logs.
 */
async function refusal(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { detail?: { status?: unknown; code?: unknown; type?: unknown } | string } | null;
  const detail = body?.detail;
  const code = typeof detail === "string" ? detail : (detail?.status ?? detail?.code ?? detail?.type);
  const word = typeof code === "string" && /^[\w .:-]{1,60}$/.test(code) ? ` (${code})` : "";
  return `ElevenLabs answered ${res.status}${word}`;
}

/**
 * "Bill", one of the standard voices every ElevenLabs account has: an older, calm voice, the closest to AIDaddy's own.
 * A designed voice exists only in the account that made it. With a key from another account ElevenLabs answers
 * 404 voice_not_found, which left the production server without a voice while its key was fine.
 */
export const STAND_IN_VOICE = "pqHfZKP75CvOlQylNhV4";

/** Text to speech with ElevenLabs, in the language and delivery given. Returns the MP3. */
export async function renderSpeech(text: string, voice: { language?: string; delivery?: Delivery } = {}): Promise<Buffer> {
  const { language, delivery = "plain" } = voice;
  const settings = DELIVERY[delivery];
  const speak = (id: string) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({
        text: forVoice(text),
        model_id: modelFor(language),
        ...(language ? { language_code: language } : {}),
        ...(settings ? { voice_settings: settings } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
  let res = await speak(voiceId());
  if (!res.ok) {
    const why = await refusal(res);
    // The account behind this key does not have the voice: read with the standard voice, never stay silent.
    if (!/voice_not_found/.test(why) || voiceId() === STAND_IN_VOICE) throw new Error(why);
    res = await speak(STAND_IN_VOICE);
    if (!res.ok) throw new Error(await refusal(res));
  }
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs sent no audio");
  return audio;
}

/**
 * The language of a chat reply, when it is clearly one of the languages a case can be spoken in. The chat has no
 * language field: AIDaddy answers in the language it was written to. Counted on the small words every sentence of a
 * language is made of; English, a short reply and anything unclear give no language, and the voice decides as before.
 */
const SMALL_WORDS: Record<string, string[]> = {
  fi: ["ja", "on", "ei", "että", "tai", "kun", "se", "sinun", "sinä", "voit", "myös", "mutta", "kanssa", "ole", "olet", "tämä", "mitä", "miten", "ennen", "jälkeen", "pitää", "sitä", "siitä", "joka", "sen", "ovat", "voi", "tee", "hae"],
  sv: ["och", "är", "att", "det", "du", "inte", "för", "med", "ska", "kan", "din", "ditt", "som", "på", "till", "eller", "innan", "måste", "har", "från"],
  de: ["und", "ist", "nicht", "der", "die", "das", "mit", "für", "sie", "ein", "eine", "oder", "auf", "muss", "müssen", "vor", "wenn", "bei", "den", "dem"],
  es: ["y", "es", "el", "la", "los", "las", "que", "para", "con", "una", "del", "antes", "debe", "puede", "por", "su", "si", "como", "más", "está"],
  fr: ["et", "est", "le", "la", "les", "que", "pour", "avec", "une", "des", "avant", "vous", "votre", "dans", "sur", "pas", "doit", "peut", "ce", "du"],
  en: ["the", "and", "is", "you", "your", "to", "of", "for", "with", "before", "must", "can", "that", "this", "it", "are", "on", "in", "by", "or"],
};

export function replyLanguage(text: string): string | undefined {
  // Ukrainian is the one supported language in Cyrillic; its own letters tell it from Russian.
  if (/[а-яіїєґ]{3}/i.test(text)) return /[іїєґ]/i.test(text) ? "uk" : undefined;
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 6) return undefined;
  const counts = Object.entries(SMALL_WORDS)
    .map(([language, small]) => ({ language, hits: words.filter((w) => small.includes(w)).length }))
    .sort((a, b) => b.hits - a.hits);
  const [best, next] = counts;
  // Clearly one language: at least three of its small words, and well ahead of the runner-up.
  if (best.language === "en" || best.hits < 3 || best.hits < next.hits * 1.5) return undefined;
  return best.language;
}

/** The longest chat reply AIDaddy reads aloud. Longer replies are cut after the last whole sentence that fits. */
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
  if (!res.ok) throw new Error(await refusal(res));
  const body = (await res.json()) as { text?: string };
  return (body.text ?? "").trim();
}

/** The Finnish case endings and the one particle people write straight after the name, as the gate accepts them. */
const NAME_ENDING = "(?:n|a|ä|lle|lla|llä|lta|ltä|ssa|ssä|sta|stä|yn|na|nä|ksi)?(?:kin|kaan|kään|han|hän|ko|kö|pa|pä)?";

/** The name as speech to text writes it down: "AI Daddy", "Ai daddy", "AI-Daddy", "A.I. Daddy", with or without an ending. */
const NAME_AS_HEARD = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:ai|a\\.\\s?i\\.?)[ \\u00a0\\u2010\\u2011-]?daddy(${NAME_ENDING})(?![\\p{L}\\p{N}_])`,
  "giu",
);

/**
 * A transcript with the name spelled the way the product spells it. Speech to text hears "AIDaddy" as two words,
 * and the transcript goes into the visitor's message box. Only the name changes, and an ending written straight
 * after it stays ("AI Daddyn" becomes "AIDaddyn"): "daddy" alone, "AI" alone and every other word are left as heard.
 */
export function spellName(transcript: string): string {
  return transcript.replace(NAME_AS_HEARD, "AIDaddy$1");
}
