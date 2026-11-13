import { normalise, quoteMatch, VERIFY_THRESHOLD } from "@/lib/verify";

/**
 * Grounding helpers. The search model proposes a quote, an amount and a
 * deadline. Nothing is kept unless we can point at a sentence on the page.
 */

const MAX_QUOTE = 400;

export function sentences(page: string): string[] {
  const out: string[] = [];
  for (const block of page.split(/\n+/)) {
    const trimmed = block.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
    if (trimmed.length < 12) continue;
    for (const s of trimmed.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"'(])/u)) {
      const sentence = s.trim();
      if (sentence.length >= 12) out.push(sentence);
    }
  }
  return out;
}

// English, Finnish (with the common inflected forms) and Swedish.
const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  yksi: "1", yhden: "1", kaksi: "2", kahden: "2", kahta: "2", kolme: "3", kolmen: "3", kolmea: "3",
  neljä: "4", neljän: "4", neljää: "4", viisi: "5", viiden: "5", viittä: "5", kuusi: "6", kuuden: "6",
  seitsemän: "7", kahdeksan: "8", yhdeksän: "9", kymmenen: "10",
  två: "2", tre: "3", fyra: "4", fem: "5", sex: "6", sju: "7", åtta: "8", nio: "9", tio: "10",
};
// \b does not treat ä, ö, å as word characters, so word boundaries are spelled out.
const NUMBER_WORD_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${Object.keys(NUMBER_WORDS).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

/** "two months" and "2 months" are the same fact. */
const numerals = (text: string) => text.replace(NUMBER_WORD_RE, (w) => NUMBER_WORDS[w.toLowerCase()]);

const STOP = new Set(
  "the a an and or of to in on for is are be you your can will it this that with as by at from if not have has".split(" "),
);

function tokens(text: string): string[] {
  return normalise(numerals(text))
    .split(" ")
    .map((t) => t.replace(/^[.,'-]+|[.,'-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Share of the needle's content words that occur in the sentence. Numbers count double. */
function coverage(needle: string[], hay: Set<string>): number {
  if (!needle.length) return 0;
  let total = 0;
  let hit = 0;
  for (const t of needle) {
    const weight = /\d/.test(t) ? 2 : 1;
    total += weight;
    if (hay.has(t)) hit += weight;
  }
  return hit / total;
}

export type Support = { sentence: string; score: number };

/**
 * Find the sentence, or pair of neighbouring sentences, on the page that best
 * supports a claim. Returns verbatim page text.
 */
export function bestSupport(claim: string, page: string, hint = ""): Support | null {
  const needle = tokens(claim);
  // A single word is too weak to locate a sentence, unless it is a figure such as "1.6%".
  if (needle.length < 2 && !needle.some((t) => /\d/.test(t))) return null;
  const context = tokens(hint);
  const all = sentences(page);
  let best: (Support & { rank: number }) | null = null;
  for (let i = 0; i < all.length; i++) {
    const single = all[i];
    const pair = i + 1 < all.length ? `${single} ${all[i + 1]}` : null;
    for (const candidate of pair ? [single, pair] : [single]) {
      if (candidate.length > MAX_QUOTE) continue;
      const words = new Set(tokens(candidate));
      const score = coverage(needle, words);
      // The hint (the step title) breaks ties between sentences that carry the value equally well.
      const rank = score + 0.2 * coverage(context, words);
      // On equal rank the earlier, shorter candidate stays: a tighter quote is a better quote.
      if (!best || rank > best.rank + 0.001) best = { sentence: candidate, score, rank };
    }
  }
  return best ? { sentence: best.sentence, score: best.score } : null;
}

/**
 * Make a model-written quote verbatim. If it is already on the page, keep it.
 * Otherwise replace it with the closest real sentence, when one is close enough.
 */
export function snapQuote(quote: string, page: string, minScore = 0.6): { quote: string; snapped: boolean } | null {
  const clipped = quote.trim().slice(0, MAX_QUOTE);
  if (quoteMatch(clipped, page) >= VERIFY_THRESHOLD) return { quote: clipped, snapped: false };
  const support = bestSupport(clipped, page);
  if (support && support.score >= minScore) return { quote: support.sentence, snapped: true };
  return null;
}

const digits = (text: string) =>
  (numerals(text).match(/\d[\d\s.,]*\d|\d/g) ?? []).map((n) => n.replace(/[\s.,]/g, ""));

/** Share of a's content words found in b, 0 to 1. Used to spot two wordings of one fact. */
export function overlap(a: string, b: string): number {
  return coverage(tokens(a), new Set(tokens(b)));
}

/** True when `outer` contains `inner` word for word. */
export function contains(outer: string, inner: string): boolean {
  return normalise(outer).includes(normalise(inner));
}

/**
 * Is this value (an amount or a deadline) stated on the page?
 * Every number in the value must appear on the page, and one sentence must carry most of its words.
 */
export function supportFor(value: string, page: string, minScore = 0.55, hint = ""): Support | null {
  const wanted = digits(value);
  if (wanted.length) {
    const pageDigits = new Set(digits(page));
    const compact = numerals(page).replace(/[\s.,]/g, "");
    if (!wanted.every((n) => pageDigits.has(n) || compact.includes(n))) return null;
  }
  const support = bestSupport(value, page, hint);
  if (!support) return null;
  if (wanted.length) {
    const inSentence = new Set(digits(support.sentence));
    const compact = numerals(support.sentence).replace(/[\s.,]/g, "");
    if (!wanted.every((n) => inSentence.has(n) || compact.includes(n))) return null;
  }
  return support.score >= minScore ? support : null;
}
