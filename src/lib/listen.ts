import patterns from "@/data/wake-patterns.json";

/**
 * The local decisions of the listening page (/listen). Everything here runs in the browser and sends nothing anywhere.
 *
 * The page turns what is said in the room into sentences (the browser's own speech recognition does that).
 * Each sentence comes here first. Small talk is let pass and never leaves the page. A sentence about a life event,
 * a piece of paperwork, or a plan that has rules is noticed: those sentences, and nothing else, become one
 * research question for the Engine.
 *
 * The wake patterns are the Telegram gate's own (hermes/config.snippet.yaml, copied by scripts/make-listen-data.mjs).
 * The small local model that the Telegram gate asks about everything else does not run in a browser, so here the
 * patterns alone decide, which is what the gate itself does when its model is down.
 */

const WAKE = patterns.map((pattern) => new RegExp(pattern, "i"));

/** The name as speech to text writes it down. Same rule as `spellName` in src/lib/speech.ts; keep the two alike. */
const NAME_AS_HEARD = /(?<![\p{L}\p{N}_])(?:ai|a\.\s?i\.?)[ \u00a0\u2010\u2011-]?daddy(?![\p{L}\p{N}_])/giu;
const NAME = /(?<![\p{L}\p{N}_])aidaddy(?![\p{L}\p{N}_])/iu;

/**
 * Someone says what they are about to do, and it is the kind of thing that has rules: "I'll just bring ten cartons
 * from Tallinn", "we can sublet the flat while we are away". Nobody asked a question, so the page asks it for them.
 */
const PLAN =
  /\b(i'?m going to|i am going to|i will|i'?ll|we will|we'?ll|we are going to|we'?re going to|let'?s|(i|we) can just|(i|we) could just|i'?m not going to|we'?re not going to)\b[^.?!]{0,80}\b(bring|carry|import|smuggle|sublet|rent out|park|drive|work|hire|skip|ignore|not pay|stop paying|pay late|declare|report|throw away|cancel|quit|resign|move out|keep the deposit|withhold)\b/i;

/** A question about what is allowed is already in the words. */
const ASKS_IF_ALLOWED = /\b(is (it|that|this) (legal|illegal|allowed|permitted)|are we allowed|am i allowed|can (i|we) )/i;

/** How long the page waits after the last sentence before it acts, so a thought can be finished. */
export const SETTLE_MS = 3500;
/** It does not wait longer than this for a pause in a lively room. */
export const MAX_WAIT_MS = 12_000;
/** Research runs one visit may start without being asked. Each costs about three cents of search. */
export const SESSION_LIMIT = 10;
/** The Engine takes up to 1,500 characters. The newest words are the ones kept. */
const MAX_SITUATION = 1400;

export const tidy = (text: string): string => text.replace(/\s+/g, " ").trim();

/** A transcript with the name spelled the way the product spells it. */
export const spell = (text: string): string => text.replace(NAME_AS_HEARD, "AIDaddy");

export type Verdict = {
  /** True when the sentence is noticed. False when it is let pass. */
  wake: boolean;
  why: "said its name" | "life admin" | "a plan with rules" | "small talk" | "too short";
};

const words = (text: string): string[] => tidy(text).split(" ").filter(Boolean);

/** One sentence from the room: noticed, or let pass. */
export function hear(sentence: string): Verdict {
  const text = spell(tidy(sentence));
  if (NAME.test(text)) {
    // "Thanks, AIDaddy" is not a request. The name with a matter behind it is.
    return words(text.replace(NAME, "")).length >= 3 ? { wake: true, why: "said its name" } : { wake: false, why: "too short" };
  }
  if (words(text).length < 3) return { wake: false, why: "too short" };
  if (WAKE.some((pattern) => pattern.test(text))) return { wake: true, why: "life admin" };
  if (PLAN.test(text)) return { wake: true, why: "a plan with rules" };
  return { wake: false, why: "small talk" };
}

const sentence = (text: string): string => (/[.?!…]$/.test(text) ? text : `${text}.`);

/**
 * The research question, from the sentences of one thought in the order they were said.
 * It is the room's own words. One question is added when somebody announced a plan and nobody asked whether it is allowed.
 */
export function situation(lines: string[]): string {
  const said = lines.map((line) => spell(tidy(line))).filter(Boolean);
  let text = said.map(sentence).join(" ");
  if (said.some((line) => PLAN.test(line)) && !said.some((line) => ASKS_IF_ALLOWED.test(line))) {
    text += " Is it allowed, and what are the rules?";
  }
  if (text.length <= MAX_SITUATION) return text;
  // Cut at a word, keeping the end: the newest sentences carry the matter.
  const tail = text.slice(-MAX_SITUATION);
  return tail.slice(tail.indexOf(" ") + 1);
}

const SMALL = new Set(["about", "there", "their", "they", "this", "that", "with", "have", "from", "what", "when", "will", "would", "should", "could", "just", "going", "need", "want"]);
const matterWords = (text: string): Set<string> =>
  new Set(
    spell(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 4 && !SMALL.has(word)),
  );

/** Two questions about the same matter: the room came back to something AIDaddy has already looked up. */
export function sameMatter(a: string, b: string): boolean {
  const left = matterWords(a);
  const right = matterWords(b);
  if (!left.size || !right.size) return false;
  const shared = [...left].filter((word) => right.has(word)).length;
  // Measured against the shorter one, so a longer retelling of the same thing still counts.
  return shared / Math.min(left.size, right.size) >= 0.6;
}
