import { isNumber, normalise, numbersIn, tokens } from "@/lib/text";

/**
 * Grounding helpers. The search model proposes a quote, an amount and a
 * deadline. Nothing is kept unless we can point at a sentence on the page,
 * and what we show is always the page's own wording.
 */

const MAX_QUOTE = 400;

/** Page text as lines, each split into sentences. Sentences in one line follow each other on the page. */
function blocks(page: string): string[][] {
  const out: string[][] = [];
  for (const block of page.split(/\n+/)) {
    const trimmed = block.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
    if (trimmed.length < 12) continue;
    const list = trimmed
      .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"'(])/u)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12);
    if (list.length) out.push(list);
  }
  return out;
}

export const sentences = (page: string): string[] => blocks(page).flat();

type Candidate = { text: string; words: Set<string>; pair: boolean };
type Prepared = { candidates: Candidate[]; singles: Candidate[]; numbers: Set<string>; normalised?: string };

// A page is searched several times per case. Tokenise it once.
const PREPARED = new Map<string, Prepared>();

function prepare(page: string): Prepared {
  const hit = PREPARED.get(page);
  if (hit) return hit;
  const candidates: Candidate[] = [];
  for (const block of blocks(page)) {
    for (let i = 0; i < block.length; i++) {
      // A sentence alone, or with the sentence that follows it in the same paragraph.
      const pair = i + 1 < block.length ? `${block[i]} ${block[i + 1]}` : null;
      for (const text of pair ? [block[i], pair] : [block[i]]) {
        if (text.length <= MAX_QUOTE) candidates.push({ text, words: new Set(tokens(text)), pair: text === pair });
      }
    }
  }
  const prepared = { candidates, singles: candidates.filter((c) => !c.pair), numbers: new Set(numbersIn(page)) };
  if (PREPARED.size >= 40) PREPARED.clear();
  PREPARED.set(page, prepared);
  return prepared;
}

/** Every number that appears on the page, as whole tokens. */
export const pageNumbers = (page: string): Set<string> => prepare(page).numbers;

/** Share of the needle's content words that occur in the sentence. Numbers count double. */
function coverage(needle: string[], hay: Set<string>): number {
  if (!needle.length) return 0;
  let total = 0;
  let hit = 0;
  for (const t of needle) {
    const weight = isNumber(t) ? 2 : 1;
    total += weight;
    if (hay.has(t)) hit += weight;
  }
  return hit / total;
}

export type Support = { sentence: string; score: number };

/**
 * Find the sentence, or pair of neighbouring sentences, on the page that best
 * supports a claim. Returns verbatim page text. `accept` can rule sentences out.
 */
export function bestSupport(
  claim: string,
  page: string,
  hint = "",
  accept: (candidate: Candidate) => boolean = () => true,
): Support | null {
  const needle = tokens(claim);
  // A single word is too weak to locate a sentence, unless it is a figure such as "1.6%".
  if (needle.length < 2 && !needle.some(isNumber)) return null;
  const context = tokens(hint);
  let best: (Support & { rank: number }) | null = null;
  for (const candidate of prepare(page).candidates) {
    if (!accept(candidate)) continue;
    const score = coverage(needle, candidate.words);
    // The hint (the step title) breaks ties between sentences that carry the value equally well.
    const rank = score + 0.2 * coverage(context, candidate.words);
    // On equal rank the earlier, shorter candidate stays: a tighter quote is a better quote.
    if (!best || rank > best.rank + 0.001) best = { sentence: candidate.text, score, rank };
  }
  return best ? { sentence: best.sentence, score: best.score } : null;
}

/** True when `outer` contains `inner` word for word. */
export function contains(outer: string, inner: string): boolean {
  const needle = normalise(inner);
  return Boolean(needle) && normalise(outer).includes(needle);
}

/**
 * Make a model-written quote verbatim. A quote that is on the page word for word is kept.
 * Anything else is replaced by the closest real sentence, when one is close enough.
 * A quote that only resembles the page (a changed number, a dropped "not") is never shown.
 */
export function snapQuote(quote: string, page: string, minScore = 0.6): { quote: string; snapped: boolean } | null {
  const clipped = quote.trim().slice(0, MAX_QUOTE);
  if (contains(page, clipped)) return { quote: clipped, snapped: false };
  const support = bestSupport(clipped, page);
  if (support && support.score >= minScore) return { quote: support.sentence, snapped: true };
  return null;
}

/** Share of a's content words found in b, 0 to 1. Used to spot two wordings of one fact. */
export function overlap(a: string, b: string): number {
  return coverage(tokens(a), new Set(tokens(b)));
}

/** How many longer words two texts share, ignoring numbers and the words in `except`. A cheap topic check. */
export function sharedWords(a: string, b: string, except = ""): number {
  const skip = new Set(tokens(except));
  const other = new Set(tokens(b));
  return new Set(tokens(a).filter((t) => t.length >= 4 && !isNumber(t) && !skip.has(t) && other.has(t))).size;
}

const BEFORE = ["before", "latest"];
const AFTER = ["after"];

/** "14 days before" does not support "14 days after". */
function wrongDirection(value: string[], sentence: Set<string>): boolean {
  const wantsBefore = BEFORE.some((t) => value.includes(t));
  const wantsAfter = AFTER.some((t) => value.includes(t));
  if (wantsBefore === wantsAfter) return false;
  const saysBefore = BEFORE.some((t) => sentence.has(t));
  const saysAfter = AFTER.some((t) => sentence.has(t));
  return wantsBefore ? saysAfter && !saysBefore : saysBefore && !saysAfter;
}

/**
 * Is this value (an amount or a deadline) stated on the page?
 * A single sentence must carry every number of the value as a whole number, most of its words,
 * and must not point the other way in time. Two sentences together never count: that is how
 * a figure gets attached to the wrong rule.
 */
export function supportFor(value: string, page: string, minScore = 0.55, hint = ""): Support | null {
  const needle = tokens(value);
  const wanted = needle.filter(isNumber);
  const support = bestSupport(
    value,
    page,
    hint,
    (c) => !c.pair && wanted.every((n) => c.words.has(n)) && !wrongDirection(needle, c.words),
  );
  if (support && support.score >= minScore) return support;
  return wanted.length >= 2 ? supportFromList(needle, wanted, page, minScore) : null;
}

/**
 * A value with several figures is often a list or a table on the page: "250 €", "400 €" and "600 €"
 * on three lines. Up to four lines that follow each other count together, when each of them
 * carries one of the figures and the run as a whole carries all of them.
 */
function supportFromList(needle: string[], wanted: string[], page: string, minScore: number): Support | null {
  const prepared = prepare(page);
  const { singles } = prepared;
  for (let i = 0; i < singles.length; i++) {
    const words = new Set<string>();
    const parts: string[] = [];
    for (let k = i; k < Math.min(i + 4, singles.length); k++) {
      if (!wanted.some((n) => singles[k].words.has(n))) break;
      parts.push(singles[k].text);
      for (const w of singles[k].words) words.add(w);
      const text = parts.join(" ");
      if (text.length > MAX_QUOTE) break;
      if (parts.length < 2 || !wanted.every((n) => words.has(n))) continue;
      const score = coverage(needle, words);
      // The lines must really follow each other on the page, with nothing between them.
      prepared.normalised ??= normalise(page);
      if (score >= minScore && prepared.normalised.includes(normalise(text))) return { sentence: text, score };
      break;
    }
  }
  return null;
}

/** Numbers in a text that none of the given sets contain. Used to keep unsourced figures out of prose. */
export function unbackedNumbers(text: string, ...allowed: Set<string>[]): string[] {
  return numbersIn(text).filter((n) => !allowed.some((set) => set.has(n)));
}
