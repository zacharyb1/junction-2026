import Exa from "exa-js";
import { z } from "zod";
import { type CaseInput, type Evidence, type EvidenceInput, LIMITS } from "@/lib/case";
import { publishCase } from "@/lib/cases";
import {
  bestSupport,
  contains,
  overlap,
  pageNumbers,
  sharedWords,
  snapQuote,
  supportFor,
  unbackedNumbers,
} from "@/lib/engine/ground";
import { hostOf, isOfficial, type Jurisdiction, publisherOf, resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { type Messages, messages } from "@/lib/engine/messages";
import { figuresIn, numbersIn, tokens } from "@/lib/text";
import { type FetchedPage, fetchPages, judge, type PageReader, readerCounts } from "@/lib/verify";

/**
 * The research engine.
 *
 *   situation + country
 *     -> three Exa searches in parallel, each returning a structured checklist
 *        (step, deadline, amount, quoted sentence, source URL) from official domains
 *     -> every cited page is opened again, live
 *     -> quotes become real sentences from the page; an amount or deadline needs a sentence on its own page
 *     -> a figure in a title, detail or summary that is on no page we read is removed
 *     -> two sources that give different figures for one step are shown side by side
 *     -> anything that cannot be pointed at moves to "could not confirm"
 *     -> case file
 */

export const ResearchInput = z.object({
  situation: z.string().trim().min(10).max(1500).describe("What happened, in the person's own words."),
  country: z.string().trim().min(2).max(60).describe("ISO country code or English country name."),
  region: z.string().trim().max(80).optional().describe("City or region, e.g. Espoo."),
  language: z.string().trim().min(2).max(20).default("en").describe("Language to write the plan in, e.g. en, fi, sv."),
  household: z.string().trim().max(600).optional().describe("Known facts about the household: who works where, residence status."),
  document: z.string().trim().max(6000).optional().describe("Text of a letter or document the family shared."),
  depth: z
    .enum(["fast", "deep", "agent"])
    .default("fast")
    .describe(
      "fast: about 6 to 12 seconds. deep: more questions and Exa deep search. agent: one Exa Agent run that researches in several steps, about 30 to 60 seconds.",
    ),
  scope: z
    .enum(["auto", "official", "open"])
    .default("auto")
    .describe(
      "official: rules, benefits, deadlines, rights; search official sites first. open: choices such as restaurants, trips, gifts, services; search the open web. auto: decide from the wording.",
    ),
});
export type ResearchInput = z.infer<typeof ResearchInput>;

/** `ms` is always the time since the research started. */
export type EngineEvent =
  | { type: "stage"; name: "plan" | "search" | "read" | "verify" | "publish"; detail: string; ms: number }
  | { type: "source"; url: string; title: string; official: boolean }
  /** One Exa search: sent when it starts, and again when it returns or fails. Counts are zero until it is done. */
  | {
      type: "search";
      focus: string;
      web: "official" | "open";
      status: "running" | "done" | "failed";
      /** Steps this search proposed, and the distinct pages those steps cite. */
      steps: number;
      pages: number;
      /** How long this one search took. */
      tookMs: number;
      ms: number;
    }
  /**
   * The first pages on the topic, from one Exa lite search, while the structured searches are still running.
   * Pointers to look at, not checked claims: nothing from them enters the plan.
   */
  | { type: "glance"; pages: { url: string; title: string; official: boolean }[]; tookMs: number; ms: number }
  /** One cited page, as soon as it has been read. `via` is the most direct reader that opened it. */
  | { type: "page"; url: string; title: string; official: boolean; via: PageReader; ms: number }
  /** Sent once the case is stored: how many quoted sentences were confirmed on their pages. */
  | { type: "verified"; verified: number; total: number; ms: number };

/** The sentence behind one citation number, as stored on the case. */
export type ResultEvidence = Pick<Evidence, "n" | "url" | "title" | "quote" | "sourceType" | "verification" | "checkedVia">;

export type ResearchResult = {
  id: string;
  url: string;
  title: string;
  plan: string[];
  /** Every citation number used in the case, so a client can show the quote under the line it supports. */
  evidence: ResultEvidence[];
  evidenceTotal: number;
  evidenceVerified: number;
  unverified: string[];
  openQuestions: string[];
  ms: number;
  timings: { searchMs: number; readMs: number; verifyMs: number };
  exa: { searches: number; contents: number; costDollars: number };
  /** Pages opened by each reader: our own live request, Exa Contents, Oxylabs Web API. */
  readers: { live: number; exa: number; oxylabs: number };
  jurisdiction: { country: string; region?: string; officialDomains: number };
  /** Recent pages on official sites about the same topic. Pointers, not checked claims. */
  news: { url: string; title: string; date: string; publisher?: string }[];
};

export class EngineError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// ---- Exa ------------------------------------------------------------------

type RawStep = { title?: string; detail?: string; due?: string; amount?: string; quote?: string; sourceUrl?: string };
type RawOutput = { title?: string; summary?: string; steps?: RawStep[]; questions?: string[] };
type ExaResult = { url: string; title?: string | null; publishedDate?: string | null; highlights?: string[] | null; text?: string | null };
type Grounding = { field: string; citations?: { url: string; title?: string }[]; confidence?: string };
type ExaSearchResponse = {
  results?: ExaResult[];
  output?: { content?: unknown; grounding?: Grounding[] };
  costDollars?: { total?: number };
};
/** A finished Exa Agent run, as far as the engine reads it. */
type ExaAgentRun = {
  id: string;
  status: string;
  output?: { structured?: unknown; grounding?: Grounding[] } | null;
  costDollars?: { total?: number } | null;
};

// Ten properties in total, nesting depth two: the limits of Exa's structured search output.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short title for this case, at most 8 words" },
    summary: { type: "string", description: "Two or three sentences: what matters most and what is urgent" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "One concrete action or entitlement, at most 10 words" },
          detail: { type: "string", description: "One or two sentences of practical detail" },
          due: { type: "string", description: "Deadline or time limit exactly as the source states it. Empty if the source gives none." },
          amount: {
            type: "string",
            description:
              "Sum of money, percentage, or number of days of an entitlement, exactly as the source states it. Never a deadline. Empty if the source gives none.",
          },
          quote: { type: "string", description: "One sentence copied word for word from the source page, in the page's language" },
          sourceUrl: { type: "string", description: "Exact URL of the page the quote was copied from" },
        },
        required: ["title", "quote", "sourceUrl"],
      },
    },
    questions: {
      type: "array",
      items: { type: "string" },
      description: "At most 2 facts you need from the family to make the plan precise",
    },
  },
  required: ["title", "summary", "steps"],
} as const;

/** The same shape for an Exa Agent run. The Agent API asks for a bound on every list. */
const AGENT_SCHEMA = {
  ...OUTPUT_SCHEMA,
  properties: { ...OUTPUT_SCHEMA.properties, steps: { ...OUTPUT_SCHEMA.properties.steps, maxItems: 8 } },
};
/** How long one Agent run may take before the usual searches take over. */
const AGENT_TIMEOUT_MS = 100_000;

/** The date a page prints for itself: "Published 18/11/2025", "Julkaistu 13.5.2026". ISO form, or null. */
function statedDate(text: string): string | null {
  const found = text.match(/\b(?:published|updated|julkaistu|päivitetty|publicerad)\b:?\s*(\d{1,2})[./](\d{1,2})[./](\d{4})/i);
  if (!found) return null;
  const [, day, month, year] = found;
  return Number(month) >= 1 && Number(month) <= 12 ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : null;
}

const properTitle = (title: string | undefined) => {
  const text = (title ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return /^\p{Ll}/u.test(text) || text.split(" ").length > 16 ? "" : text;
};

/** Countries the team decided not to serve. */
const UNSUPPORTED_COUNTRIES = new Set(["RU"]);

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fi: "Finnish",
  sv: "Swedish",
  de: "German",
  es: "Spanish",
  fr: "French",
  et: "Estonian",
  uk: "Ukrainian",
};

function choicePrompt(j: Jurisdiction, language: string): string {
  const lang = LANGUAGE_NAMES[language.toLowerCase().slice(0, 2)] ?? "English";
  return [
    `You are helping a family in ${j.region ? `${j.region}, ` : ""}${j.name} choose between real, currently available options.`,
    "Prefer the venue's or provider's own website, then recent independent reviews. Skip options that are closed, far from the place named, or fail a stated requirement.",
    "The quote must be the sentence that shows the stated requirement is met, never a sentence that also says the opposite. Never list the same place twice.",
    "For every option, copy one sentence word for word from the source page into `quote`, in the page's own language, and give that page's exact URL in `sourceUrl`.",
    "Fill `due` only with a booking deadline or opening time the page states, and `amount` only with a price the page states, in the page's own currency. Never estimate or convert.",
    "At most five options, best fit first.",
    `Write title, summary, step titles, details and questions in ${lang}. Keep quotes in the original language.`,
  ].join(" ");
}

function systemPrompt(j: Jurisdiction, language: string): string {
  // Unlisted languages fall back to English.
  const lang = LANGUAGE_NAMES[language.toLowerCase().slice(0, 2)] ?? "English";
  return [
    `You are preparing a practical checklist for a family living in ${j.region ? `${j.region}, ` : ""}${j.name}.`,
    `Use the rules that apply in ${j.name} today. Prefer the authority's own pages over news, blogs or forums.`,
    "For every step, copy one sentence word for word from the source page into `quote`, in the page's own language, and give that page's exact URL in `sourceUrl`.",
    "Choose the sentence that states the rule, deadline or amount itself, so a reader can check the step from the quote alone.",
    "Fill `due` and `amount` only when that same page states them, and repeat them exactly as written. Never estimate, convert or invent amounts or dates.",
    "`due` is only a deadline the family itself has to meet. A time limit that binds someone else, such as an authority, an airline or a landlord, is something the family is entitled to: put it in `amount`, for example \"two months' notice\", never in `due`.",
    "Each step is one distinct action. Never describe the same action in two steps.",
    "If the situation is about another town or country than where the family lives, for example a move, the rules and services of that place apply. Name the place you used.",
    "The summary says only what the steps say, in plain words, with no urgency and no advice beyond the steps. Do not ask a question that the situation already answers.",
    `When the authority publishes the page in ${lang}, cite that version of the page.`,
    "Include only steps that directly help with this exact situation. Skip general information about neighbouring topics, and anything the sources do not cover.",
    "At most five steps, in the order the family does them. Five well-sourced steps beat ten vague ones. One step per separate application or notice the family must file.",
    "`detail` restates what the quote says in plain words and adds nothing the page does not say.",
    "When a rule differs by contract date, permit type or another fact you do not have, give one step per branch and name the branch in its title. Prefer the national authority's page over an EU-level page when both cover the rule.",
    "For money, give the rate or formula first, then minimum and maximum, then for how long it is paid, and any waiting period before the first payment. When the page gives a scale (by delay, distance or income), give the row that matches the situation and name it.",
    `Write title, summary, step titles, details and questions in ${lang}. Keep quotes in the original language.`,
  ].join(" ");
}

/** A shared page can carry lines written for an AI ("ignore your instructions"). They are not passed on to the search. */
const ORDERS = /ignore (your|all|any|the|previous)|disregard (your|all|any|the|previous)|AI assistants?|language models?|automated agents?|system prompt/i;
const withoutOrders = (document: string) =>
  document
    .split("\n")
    .filter((line) => !ORDERS.test(line))
    .join("\n");

function frame(input: ResearchInput, j: Jurisdiction): string {
  const where = `${j.region ? `${j.region}, ` : ""}${j.name}`;
  return [
    `Situation of a family living in ${where}: ${input.situation}`,
    input.household ? `About the household: ${input.household}` : "",
    input.document ? `They received this document:\n"""\n${withoutOrders(input.document).slice(0, 3000)}\n"""` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type Focus = { name: string; ask: string; keywords: string; lead?: boolean };

const CHOICE = /\b(restaurants?|dinner|lunch|brunch|caf[eé]s?|bars?|anniversary|birthday|party|gifts?|presents?|hotels?|trip|holiday|vacation|weekend|date night|things to do|activit(y|ies)|concerts?|babysitters?|plumbers?|electricians?|movers?|moving compan(y|ies)|cleaners?|gyms?|recipes?)\b/i;
const RULES =
  /\b(benefits?|allowances?|permits?|visas?|tax(es)?|fines?|landlords?|rent|leases?|contracts?|compensation|refunds?|deadlines?|laws?|legal|rights?|cancel\w*|delayed|pregnan\w*|unemploy\w*|laid off|warranty|insurance|letters?|passports?|stolen|theft|lost|police|embassy|consulate|emergency|accident|hospital|sick|illness|died|death|divorce|marri(ed|age)|baby|daycare|schools?|moving|relocat\w*|residen\w*|citizen\w*|parking|invoices?|debts?|eviction|employers?|boss|salary|wages?|entitled|membership|customs|broke\w*|damaged?|complain\w*|refus\w*|charged|allowed)\b/i;
/**
 * "Can I bring snus into Finland?", "Is codeine legal in the UAE?" (issue #29): the answer is a verdict and the
 * sentence that settles it, not a to-do list. Same engine, pinned to the destination's official sites.
 */
const LEGALITY =
  /\b(can (i|we|you) (bring|take|carry|import|export|send|fly|use|drive|buy|own)|is it (legal|illegal|allowed|permitted)|allowed to (bring|take|carry|import|use|fly)|(legal|illegal|banned|prohibited|forbidden|allowed) (in|into|to bring)|customs|duty[- ]free|import (limits?|rules?|allowance)|declare at|smuggl\w*|saa(ko|nko) (tuoda|viedä|ottaa)|onko (laillista|sallittua|kiellettyä)|tullis\w*|tulli\w*)\b/i;

/** A question whether something is allowed at a destination: answered with a verdict and its sentence. */
export function isRuleCheck(input: Pick<ResearchInput, "situation" | "document">): boolean {
  return !input.document && LEGALITY.test(input.situation);
}

const ASKS_FOR_OPTIONS = /\b(find|recommend\w*|suggest\w*|book|looking for|where (can|to|should)|best|ideas?|near(by)?|options?)\b/i;

/** Rules and benefits live on official sites. Choices such as restaurants or gifts live on the open web. */
function resolveScope(input: ResearchInput): "official" | "open" {
  if (input.scope !== "auto") return input.scope;
  if (input.document) return "official";
  const text = input.situation;
  if (!CHOICE.test(text)) return "official";
  // "Find a vegan restaurant" is a choice even with a rule word nearby. "The gym will not let me cancel" is a rule.
  if (ASKS_FOR_OPTIONS.test(text)) return "open";
  return RULES.test(text) ? "official" : "open";
}

function ruleFocuses(names: Messages["focus"]): Focus[] {
  return [
    {
      name: names.rule,
      lead: true,
      keywords: "customs, import limits, allowed, prohibited, restricted, permit, declaration",
      ask: "Is this allowed? Find the sentence on the authority's own page that allows it, bans it, or sets the limit (a quantity, an age, a permit, a declaration). One step per rule, and the quote must be that sentence.",
    },
    {
      name: names.conditions,
      keywords: "maximum quantity, permit, prescription, declare, penalty, confiscation",
      ask: "Under which conditions: the maximum quantity, documents or permits needed, whether it must be declared at the border, and what happens to someone who breaks the rule?",
    },
  ];
}

function choiceFocuses(names: Messages["focus"]): Focus[] {
  return [
    {
      name: names.options,
      lead: true,
      keywords: "best options that match every requirement",
      ask: "Which specific places, providers or options fit this request best? One option per step. Every requirement in the request must be met by the option, and the quote must show that it is.",
    },
    {
      name: names.details,
      keywords: "opening hours, booking, prices, address",
      ask: "For options that fit the request: opening hours on the requested day, how to book, price level and address. One option per step.",
    },
  ];
}

function focuses(input: ResearchInput, names: Messages["focus"]): Focus[] {
  const doc = Boolean(input.document);
  const list: Focus[] = [
    {
      name: names.actions,
      lead: true,
      keywords: doc ? "rules, tenant or consumer rights, how to object, deadlines" : "what to do, applications, notifications, deadlines",
      ask: doc
        ? "Is what the document demands allowed under the current rules? What can the family do, in what order, and by when must they respond, object or appeal?"
        : "What must they do, in what order, and by when? Cover applications, notifications to employers or authorities, appointments and deadlines.",
    },
    {
      name: names.money,
      keywords: "amounts, benefits, compensation, entitlements, conditions",
      ask: doc
        ? "Which limits, compensation, fees or rights apply to this situation? List only items with a stated amount, percentage, cap or number of days."
        : "Which benefits, compensation, paid leave or other entitlements can they get? List only items with a stated amount, rate, percentage or number of days, and the conditions.",
    },
    {
      name: names.apply,
      keywords: "how to apply, which authority, forms, required documents",
      ask: "For each application or notification: which authority, online service or form is used, and which documents or certificates are needed?",
    },
  ];
  if (input.depth === "deep") {
    list.push({
      name: names.exceptions,
      keywords: "exceptions, recently moved, non-citizens, missed deadline",
      ask: "Which exceptions apply to people who recently moved to the country or are not citizens, and what happens if a deadline is missed?",
    });
  }
  return list;
}

function parseOutput(content: unknown): RawOutput | null {
  if (!content) return null;
  if (typeof content === "object") return content as RawOutput;
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as RawOutput;
    } catch {
      return null;
    }
  }
  return null;
}

// ---- Helpers ----------------------------------------------------------------

type Confidence = "low" | "medium" | "high";

/** A deadline or amount, with the page and sentence the search model took it from. */
type Fact = { kind: "deadline" | "amount"; value: string; url: string; quote: string };

type Candidate = {
  confidence?: Confidence;
  title: string;
  detail?: string;
  facts: Fact[];
  quote: string;
  url: string;
  official: boolean;
};

const key = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const clip = (text: string | undefined, max: number) => (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const EMPTY = /^(['"`´\s]*|ei määrää|ei määräaikaa|ei määritelty|ei määritetty|ei sovellu|ei koske|ei aikarajaa|ei mainittu|ei ilmoitettu|ei tiedossa|empty|none( stated| specified| given)?|n\/?a|null|unknown|varies|not (specified|stated|applicable|available|mentioned)|no (specific )?(deadline|amount)( stated| specified)?|-+|–|—)$/i;
const JUNK = /[{}\[\]]|"\s*[:,]|citations|confidence\s*:/i;
const VAGUE =
  /^(as soon as possible|asap|immediately|promptly|without delay|well in advance|in good time|in advance|when you move|within a reasonable time|while you are waiting[^,.]*|mahdollisimman pian|viipymättä|heti|hyvissä ajoin|kohtuullisessa ajassa|snarast)$/i;

/** A deadline or amount as the model wrote it, or nothing if it is a placeholder, a formatting leak or too vague to act on. */
function tidy(text: unknown): string | undefined {
  if (typeof text !== "string") return undefined;
  let value = clip(text, 400);
  // Cut long values at a word boundary so nothing ends mid-word.
  if (value.length > 100) value = `${value.slice(0, 100).replace(/\s+\S*$/, "")}…`;
  value = value.replace(/[.;,]+$/, "");
  // A bare number ("2026", "14") says nothing without its words.
  if (!value || EMPTY.test(value) || JUNK.test(value) || VAGUE.test(value) || /^\d+$/.test(value)) return undefined;
  return value;
}

/** Letter triples of a text without spaces, so "job seeker" and "jobseeker" compare equal. */
function triples(text: string): Set<string> {
  const squashed = key(text).replace(/ /g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= squashed.length; i++) out.add(squashed.slice(i, i + 3));
  return out;
}

/** 0 to 1: how much two short texts share, letter by letter. */
function likeness(a: string, b: string): number {
  const x = triples(a);
  const y = triples(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  // Either the two texts are alike as a whole, or the shorter one sits almost entirely inside the longer one
  // ("Register as a job seeker online" and "Register as a jobseeker with employment services").
  const smaller = Math.min(x.size, y.size);
  return Math.max((2 * shared) / (x.size + y.size), smaller >= 10 ? (shared / smaller) * 0.92 : 0);
}

const sameThing = (a: string, b: string) => Math.max(overlap(a, b), overlap(b, a)) >= 0.6 || likeness(a, b) >= 0.72;

/** What a step is about: word starts of its title and detail, without the verbs every title opens with. */
const objectsOf = (c: { title: string; detail?: string }) =>
  new Set([...stems(`${c.title} ${c.detail ?? ""}`)].filter((t) => !ACTION_STEMS.has(t)));
/** Two candidates for one action: the same sentence quoted from two pages, or titles and details that share most of what they are about. */
function sameAction(
  a: { title: string; detail?: string; quote: string; url: string },
  b: { title: string; detail?: string; quote: string; url: string },
): boolean {
  // One sentence quoted from two pages is one step. On the same page, two actions may share a sentence:
  // the step loop then looks for a sentence of its own for the second.
  if (a.url !== b.url && Math.min(overlap(a.quote, b.quote), overlap(b.quote, a.quote)) >= 0.8) return true;
  const x = objectsOf(a);
  const y = objectsOf(b);
  const shared = [...x].filter((t) => y.has(t)).length;
  return shared >= 5 && shared / Math.min(x.size, y.size) >= 0.5;
}

const stems = (text: string) => new Set(tokens(text).filter((t) => t.length >= 4).map((t) => t.slice(0, 5)));
/** Two step titles that are mostly about the same thing, without being the same step. */
function relatedTitles(a: string, b: string): boolean {
  const x = stems(a);
  const y = stems(b);
  if (!x.size || !y.size) return false;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / Math.min(x.size, y.size) >= 0.5;
}

// Step titles open with the same few verbs whatever the topic. They say nothing about what a page is about.
const ACTION_STEMS = new Set(
  "apply check verify submit contact request notify register review confirm report claim obtain gather prepare ensure choose select visit book update steps guide handl deali proce infor requi".split(
    " ",
  ).map((w) => w.slice(0, 5)),
);

// Whose time limit is it? "The airline must refund within seven days" binds the airline, not the family.
const OTHERS_DUTY =
  /\b(airlines?|carriers?|operators?|compan(y|ies)|traders?|sellers?|landlords?|lessors?|employers?|authorit(y|ies)|agenc(y|ies)|boards?|embass(y|ies)|consulates?|municipalit(y|ies)|insurers?|banks?|kela|we)\b[^.;:!?]{0,80}\b(must|shall|has to|have to|is required to|are required to|will)\b|\b(must|shall|has to|will)(?: \w+)? be (carried out|processed|paid|refunded|repaired|replaced|delivered|decided|handled|made)\b/i;
// Only "you must …" right together counts as the family's own duty. "If you choose a refund, the airline must …" does not.
const OWN_DUTY = /\b(you|your (application|claim|complaint|notice|request))\s+(must|have to|need to|should|shall)\b/i;
const WAITING = /\b(not|no)\b[^.;:!?]{0,40}\b(repl\w+|respon\w+|answer\w*|decision)\b[^.;:!?]{0,30}\bwithin\b/i;
const EXAMPLE = /^(for example|for instance|e\.g\.|esimerkiksi)\b/i;
/** True when the sentence states someone else's duty, a waiting time or a worked example, not the family's deadline. */
const notOurDeadline = (sentence: string) =>
  (OTHERS_DUTY.test(sentence) && !OWN_DUTY.test(sentence)) || WAITING.test(sentence) || EXAMPLE.test(sentence.trim());

// A "%" in a sentence is an amount only when the sentence is about money: "a 100% vegan restaurant" is not.
const RATE_WORDS = /\b(price|fee|rent|increase|rate|compensation|refund|discount|tax|credit|deduct\w*|salary|wage|allowance|benefit|cost|pay\w*|interest|vuokra\w*|korotu\w*|vähenny\w*|korvau\w*|hinta\w*|vero\w*|avdrag\w*|hyra\w*)\b/i;

// Signs that a place no longer exists. "Closed on Mondays" is not one of them.
const CLOSED = /\bCLOSED:|permanently closed|closed (down|for good|its doors|permanently)|has closed|is closed due to|now closed|suljettu pysyvästi|lopettanut toimintansa/i;
/** Names in a title: capitalised words that do not open it. "Enjoy vegan à la carte at OmNam" gives OmNam. */
const namesIn = (title: string) => (title.match(/(?<=\S\s)\p{Lu}[\p{L}\p{N}'’&-]{2,}/gu) ?? []).filter((w) => !/^(Finland|Helsinki|Espoo|Vantaa|Tampere|Turku|Oulu|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)$/.test(w));

/** A year in a page's address, when it is three or more years back: "…timestamp=2002", "…-2021.pdf". */
function staleYear(url: string): number | null {
  const now = new Date().getFullYear();
  const years = (url.match(/(?<!\d)(19|20)\d{2}(?!\d)/g) ?? []).map(Number).filter((y) => y >= 1990 && y <= now + 1);
  if (!years.length) return null;
  const newest = Math.max(...years);
  return newest <= now - 3 ? newest : null;
}

// Words that match almost any official press release.
const CATCH_ALL = new Set(
  "service services consumer benefit general social security customer authority change changes terms right rights rule rules under during family people person finnish finland government".split(
    " ",
  ).map((w) => w.slice(0, 5)),
);
// Municipal sites and the city each one writes for.
const CITY_SITES: Record<string, string> = {
  "hel.fi": "helsinki",
  "espoo.fi": "espoo",
  "vantaa.fi": "vantaa",
  "tampere.fi": "tampere",
  "turku.fi": "turku",
  "oulu.fi": "oulu",
};

// A period taken from a quote means something only with its qualifier: "within 30 days", "two months in advance".
const QUALIFIED = /^(within|at least|at most|up to|no later than|no earlier than|not more than|a maximum of|a minimum of|vähintään|enintään|viimeistään|högst|minst|senast)\b|in advance$/i;

const MONEY = /[€$£%]|\b(eur|euros?|euroa|usd|dollars?|pounds?|gbp|sek|nok|dkk|kr|kronor|chf|per ?cent|prosenttia|procent)\b/i;
// Deadline wording in English, Finnish and Swedish.
const TIMING =
  /\b(before|after|within|no later|at the latest|deadline|by the end|prior to|as soon as|week \d|weeks? of|ennen|viimeistään|kuluessa|menness|jälkeen|senast|innan|inom|efter)\b/i;

/** The model sometimes repeats the deadline in `amount`. Keep only real amounts and durations. */
function realAmount(amount: string | undefined, due: string | undefined): string | undefined {
  if (!amount) return undefined;
  if (due && sameThing(amount, due)) return undefined;
  // With a deadline already set, a second timing phrase is the deadline again. Without one it is a period
  // someone else must keep, such as a notice period, which is an entitlement.
  if (due && TIMING.test(amount) && !MONEY.test(amount)) return undefined;
  if (/free of charge|income/i.test(amount)) return amount;
  // A bare number is not an amount: "14A" is a form, "112" a phone number. It needs money or a length of time.
  // Number words count: "two months' notice" is a figure.
  return numbersIn(amount).length > 0 && (MONEY.test(amount) || unitOf(amount)) ? amount : undefined;
}

/** Exa allows 10 requests per second per team. Back off briefly and try again. A bad request is never retried. */
async function withRetry<T>(call: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await call();
    } catch (error) {
      const status = Number((error as { statusCode?: unknown })?.statusCode) || 0;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = status
        ? status === 429 || status >= 500
        : /rate limit|timeout|timed out|ECONNRESET|fetch failed|socket/i.test(message);
      if (!retryable || i >= attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1100 * (i + 1) + Math.random() * 600));
    }
  }
}

// Words that say nothing about a situation. Used only by the check below.
const FILLER = new Set(
  "there here what when where which would should could about they them their then than also been were does doing done need want just some more most very much many today tomorrow yesterday thing things something nothing anything everything please thanks thank hello okay well know think going".split(
    " ",
  ),
);
const stem = (t: string) => (t.length > 5 ? t.slice(0, 5) : t);

/** Does any content word of the message come back in what the search wrote and quoted? Word starts are compared, so "pregnant" meets "pregnancy". */
function echoes(message: string, written: string): boolean {
  const meaningful = (text: string) => tokens(text).filter((t) => t.length >= 4 && !FILLER.has(t) && !/^\d/.test(t));
  const asked = new Set(meaningful(message).map(stem));
  if (!asked.size) return false;
  return meaningful(written).some((t) => asked.has(stem(t)));
}

const ENGLISH_WORDS = /\b(the|and|of|to|is|are|you|your|for|must|can|with|if|be)\b/gi;

const UNITS = ["%", "€", "$", "£", "day", "week", "month", "year"];
/** What a value measures: "35 %" and "40 %" can contradict each other, "35 %" and "160 days" cannot. */
const unitOf = (value: string) => tokens(value).find((t) => UNITS.includes(t)) ?? "";
/** Same figures, however often each is written: "two months" and "two (2) months" are one fact. */
const sameNumbers = (a: string, b: string) => {
  const distinct = (text: string) => [...new Set(numbersIn(text))].sort().join(" ");
  return distinct(a) === distinct(b);
};

function dedupe(items: string[], max: number): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item && !out.some((o) => sameThing(o, item))) out.push(item);
  }
  return out.slice(0, max);
}

// ---- Pipeline ---------------------------------------------------------------

export async function researchCase(
  raw: ResearchInput,
  origin: string,
  emit: (event: EngineEvent) => void = () => {},
): Promise<ResearchResult> {
  const started = Date.now();
  const since = () => Date.now() - started;
  const input = ResearchInput.parse(raw);
  // Everything the engine writes itself, in the language of the case.
  const m = messages(input.language);
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);

  const j = resolveJurisdiction(input.country, input.region);
  if (!j.code) {
    throw new EngineError(m.unknownCountry(input.country), 400);
  }
  if (UNSUPPORTED_COUNTRIES.has(j.code)) throw new EngineError(m.unsupportedCountry, 400);
  const exa = new Exa(process.env.EXA_API_KEY);
  const usage = { searches: 0, contents: 0, costDollars: 0 };
  const scope = resolveScope(input);
  const official = scope === "official" ? j.officialDomains : [];
  const context = frame(input, j);
  const where = `${j.region ? `${j.region}, ` : ""}${j.name}`;
  const ruleCheck = scope === "official" && isRuleCheck(input);
  const system =
    scope === "open"
      ? choicePrompt(j, input.language)
      : ruleCheck
        ? `${systemPrompt(j, input.language)} This is a question whether something is allowed in ${j.name}. Make the first step the verdict: title it "Allowed", "Not allowed" or "Allowed with limits", followed by what. Its quote must be the sentence that allows, bans or limits it. If no page states it, say so in the summary and do not guess.`
        : systemPrompt(j, input.language);
  const titles = new Map<string, string>();
  const trailEvents: { ms: number; detail: string }[] = [];
  const stage = (name: Extract<EngineEvent, { type: "stage" }>["name"], detail: string) => {
    trailEvents.push({ ms: since(), detail });
    emit({ type: "stage", name, detail, ms: since() });
  };

  stage("plan", scope === "open" ? m.pinnedOpen(j) : official.length ? m.pinnedOfficial(j, official.length) : m.pinnedNoList(j));

  let head: RawOutput = {};
  const questions: string[] = [];
  const given = `${input.situation}\n${input.document ?? ""}\n${input.household ?? ""}`;

  /** The steps a search or an agent run proposed, as candidates for the page check. */
  const candidates = (out: RawOutput | null, graded: Map<number, Confidence>): Candidate[] =>
    (out?.steps ?? [])
      .map((s, index) => ({ ...s, confidence: graded.get(index) }))
      .filter((s) => s.title && s.quote && s.sourceUrl && /^https?:\/\//.test(s.sourceUrl) && !JUNK.test(s.title))
      .map((s) => {
        // A value the family told us themselves (for example the rent in their letter) is not a claim to verify.
        const own = (value: string | undefined) => (value && contains(given, value) ? undefined : value);
        const due = own(tidy(s.due));
        const amount = realAmount(own(tidy(s.amount)), due);
        const url = s.sourceUrl!.trim();
        const quote = clip(s.quote, LIMITS.quote);
        const facts: Fact[] = [];
        if (due) facts.push({ kind: "deadline", value: due, url, quote });
        if (amount) facts.push({ kind: "amount", value: amount, url, quote });
        return {
          confidence: s.confidence,
          title: clip(s.title, 140),
          detail: JUNK.test(s.detail ?? "") ? undefined : clip(s.detail, 600) || undefined,
          facts,
          quote,
          url,
          official: isOfficial(url, j),
        };
      });

  async function search(focus: Focus, restrict: boolean): Promise<Candidate[]> {
    stage("search", m.searching(Boolean(restrict && official.length), focus.name));
    usage.searches++;
    const began = Date.now();
    const report = (status: "running" | "done" | "failed", steps = 0, pages = 0) =>
      emit({
        type: "search",
        focus: focus.name,
        web: restrict && official.length ? "official" : "open",
        status,
        steps,
        pages,
        tookMs: Date.now() - began,
        ms: since(),
      });
    report("running");
    const deep = input.depth === "deep";
    const options = {
      type: deep ? "deep" : "auto",
      numResults: 8,
      // The query stays short. What to extract and the family's full situation go in `objective`,
      // question first, so a long letter can only push its own tail over the length limit.
      objective: `Question: ${focus.ask}\n\n${context}`.slice(0, 4000),
      systemPrompt: system,
      outputSchema: OUTPUT_SCHEMA,
      // Highlights let Exa fill the fields from page text, not from titles alone.
      contents: { highlights: true },
      userLocation: j.code,
      ...(restrict && official.length ? { includeDomains: official } : {}),
    };
    const query = `${clip(input.situation, 300)} ${where}: ${focus.keywords}`;
    const res = (await withRetry(() =>
      exa.search(query, options as never, { timeout: deep ? 120_000 : 45_000 } as never),
    ).catch((error: unknown) => {
      report("failed");
      throw error;
    })) as unknown as ExaSearchResponse;
    usage.costDollars += res.costDollars?.total ?? 0;
    for (const r of res.results ?? []) if (r.title) titles.set(r.url, r.title);
    for (const g of res.output?.grounding ?? []) {
      for (const c of g.citations ?? []) if (c.title && !titles.has(c.url)) titles.set(c.url, c.title);
    }
    const out = parseOutput(res.output?.content);
    if (out && (focus.lead || !head.title)) head = { title: out.title, summary: out.summary };
    for (const q of out?.questions ?? []) if (q) questions.push(q);
    // Exa grades how well each field is grounded in the pages it read.
    const graded = new Map<number, Confidence>();
    for (const g of res.output?.grounding ?? []) {
      const m = g.field.match(/^steps\[(\d+)\]\.quote$/);
      if (m && (g.confidence === "low" || g.confidence === "medium" || g.confidence === "high")) {
        graded.set(Number(m[1]), g.confidence);
      }
    }
    const proposed = candidates(out, graded);
    report("done", proposed.length, new Set(proposed.map((c) => c.url)).size);
    return proposed;
  }

  /**
   * One Exa Agent run in place of the separate searches: the agent searches, reads and reasons in several steps
   * and returns the same fields. What it proposes goes through the same page check as any search result.
   */
  async function agentSearch(asks: Focus[]): Promise<Candidate[]> {
    stage("search", m.agentSearching);
    usage.searches++;
    const began = Date.now();
    const report = (status: "running" | "done" | "failed", steps = 0, pages = 0) =>
      // The agent is told which sites to prefer, but nothing limits it to them: "open" is the honest label.
      emit({ type: "search", focus: m.focus.agent, web: "open", status, steps, pages, tookMs: Date.now() - began, ms: since() });
    report("running");
    const named = official.filter((d) => !d.startsWith("*")).slice(0, 40);
    const query = [
      context,
      `Research task: ${asks.map((a) => a.ask).join(" ")}`,
      // One run covers what three searches cover, so it may return more steps than one search does.
      system.replace("At most five steps", "At most eight steps"),
      named.length ? `Search these official sites first and prefer them over any other source: ${named.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    let id = "";
    try {
      const created = (await withRetry(() =>
        exa.agent.runs.create({ query, effort: "low", outputSchema: AGENT_SCHEMA } as never),
      )) as unknown as ExaAgentRun;
      id = created.id;
      const done = (await exa.agent.runs.pollUntilFinished(id, {
        pollInterval: 2_000,
        timeoutMs: AGENT_TIMEOUT_MS,
      })) as unknown as ExaAgentRun;
      // Only a completed run carries results. A failed or cancelled one must not look like an empty success.
      if (done.status !== "completed") throw new Error(`Exa Agent run ended as ${done.status}`);
      usage.costDollars += done.costDollars?.total ?? 0;
      const grounding = done.output?.grounding ?? [];
      for (const g of grounding) for (const c of g.citations ?? []) if (c.title && !titles.has(c.url)) titles.set(c.url, c.title);
      const out = parseOutput(done.output?.structured);
      if (out) head = { title: out.title, summary: out.summary };
      for (const q of out?.questions ?? []) if (q) questions.push(q);
      const graded = new Map<number, Confidence>();
      for (const g of grounding) {
        const at = g.field.match(/^(?:structured\.)?steps\[(\d+)\](?:\.quote)?$/);
        if (at && (g.confidence === "low" || g.confidence === "medium" || g.confidence === "high")) {
          graded.set(Number(at[1]), g.confidence);
        }
      }
      const proposed = candidates(out, graded);
      report("done", proposed.length, new Set(proposed.map((c) => c.url)).size);
      return proposed;
    } catch (error) {
      report("failed");
      // A run that is still going after the time limit would keep spending. Stopping it is best effort.
      if (id) void exa.agent.runs.cancel(id).catch(() => {});
      throw error;
    }
  }

  /**
   * A first look while the research runs: Exa lite answers from its index in well under a second.
   * The pages are shown as pointers. Nothing from them enters the plan, which only holds checked quotes.
   */
  async function firstLook(): Promise<void> {
    const began = Date.now();
    usage.searches++;
    const res = (await exa.search(
      `${clip(input.situation, 300)} ${where}`,
      {
        type: "lite",
        numResults: 5,
        userLocation: j.code,
        contents: { highlights: true },
        ...(official.length ? { includeDomains: official } : {}),
      } as never,
      { timeout: 5_000 } as never,
    )) as unknown as ExaSearchResponse;
    usage.costDollars += res.costDollars?.total ?? 0;
    const pages = (res.results ?? [])
      .filter((r) => /^https?:\/\//.test(r.url))
      .slice(0, 5)
      .map((r) => ({ url: r.url, title: clip(r.title ?? "", 200) || hostOf(r.url), official: isOfficial(r.url, j) }));
    if (!pages.length) return;
    for (const page of pages) if (!titles.has(page.url)) titles.set(page.url, page.title);
    const tookMs = Date.now() - began;
    trailEvents.push({ ms: since(), detail: m.firstLook([...new Set(pages.map((p) => hostOf(p.url)))], (tookMs / 1000).toFixed(1)) });
    emit({ type: "glance", pages, tookMs, ms: since() });
  }

  // One failed search must not sink the case: the others still carry it.
  let lastError: unknown;
  const run = async (list: Focus[], restrict: boolean): Promise<Candidate[]> => {
    const settled = await Promise.allSettled(list.map((f) => search(f, restrict)));
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failures.length) {
      lastError = failures[0].reason;
      stage("search", m.searchesSkipped(failures.length, list.length));
    }
    // Results keep the order of `list`, so the lead focus comes first.
    return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  };

  // What is new: one more search, limited to pages the official sites published in the last four months.
  // This is where a model's memory has nothing to offer. It runs beside the other searches and can only add pointers.
  const NEWS_DAYS = 120;
  type Fresh = { url: string; title: string; date: string; text: string };
  async function searchNews(topic: string): Promise<Fresh[]> {
    if (scope !== "official" || !official.length) return [];
    stage("search", m.searchingNews);
    const since = new Date(Date.now() - NEWS_DAYS * 86_400_000).toISOString();
    usage.searches++;
    const res = (await withRetry(() =>
      exa.search(
        // The plan's own step titles name the topic better than the family's message does.
        `${clip(topic, 300)}. ${j.name}: news, changes, new rules`,
        {
          type: "auto",
          numResults: 8,
          includeDomains: official,
          startPublishedDate: since,
          userLocation: j.code,
          contents: { highlights: true, text: { maxCharacters: 600 } },
        } as never,
        { timeout: 20_000 } as never,
      ),
    )) as unknown as ExaSearchResponse;
    usage.costDollars += res.costDollars?.total ?? 0;
    return (res.results ?? [])
      .filter((r) => r.title && /^https?:\/\//.test(r.url) && /^\d{4}-\d{2}-\d{2}/.test(r.publishedDate ?? ""))
      .map((r) => ({
        url: r.url,
        title: clip(r.title ?? "", 200),
        date: statedDate(`${(r.highlights ?? []).join(" ")} ${r.text ?? ""}`) ?? (r.publishedDate ?? "").slice(0, 10),
        text: `${r.title} ${(r.highlights ?? [])[0] ?? ""}`,
      }))
      // Exa's date can be the day a page was last crawled. When the page prints its own date, that one decides.
      .filter((n) => n.date >= since.slice(0, 10));
  }
  const asks = scope === "open" ? choiceFocuses(m.focus) : ruleCheck ? ruleFocuses(m.focus) : focuses(input, m.focus);
  // Runs beside the research and never holds it up. A failed first look costs nothing but the look.
  const glance = firstLook().catch(() => {});
  let found: Candidate[] = [];
  if (input.depth === "agent") {
    found = await agentSearch(asks).catch((error: unknown) => {
      lastError = error;
      return [];
    });
    // Too little from the agent: the usual searches run too, so this mode never returns less than the fast one.
    if (found.length < 3) {
      stage("search", m.agentFellBack);
      found = [...found, ...(await run(asks, true))];
    }
  } else {
    found = await run(asks, true);
  }
  // Too little from official sites: widen to the open web once.
  if (found.length < 3 && official.length) found = [...found, ...(await run(asks.slice(0, 2), false))];
  if (!found.length) {
    if (lastError) {
      throw new EngineError(m.searchFailed(lastError instanceof Error ? lastError.message : String(lastError)), 502);
    }
    // Nothing to research, or nothing found. Not a server fault, so the caller gets a message it can show.
    throw new EngineError(m.nothingToResearch, 422);
  }
  // Small talk or gibberish still returns pages, and a plan built from them would be an invented situation.
  // If no word of the message comes back in anything the search wrote or quoted, there was nothing to research.
  if (!input.document) {
    const written = found.map((c) => `${c.title} ${c.detail ?? ""} ${c.quote}`).join(" ");
    if (!echoes(input.situation, `${head.title ?? ""} ${head.summary ?? ""} ${written}`)) {
      throw new EngineError(m.nothingToResearch, 422);
    }
  }
  // The first look finished long ago, or gave up after its five seconds. Its cost and trail line belong to this case.
  await glance;
  const searchMs = since();

  // Official sources first (stable sort keeps the lead focus on top), then merge near-duplicates.
  // Each deadline and amount keeps the page it came from, so merging steps never moves a fact to another source.
  // For an English answer, a source quoted in English goes before the same fact quoted in another language,
  // so the reader gets a sentence they can read when the authority publishes one.
  const readable = (c: Candidate) =>
    input.language.toLowerCase().startsWith("en") && (c.quote.match(ENGLISH_WORDS) ?? []).length >= 2 ? 1 : 0;
  found.sort(
    (a, b) =>
      Number(b.official) - Number(a.official) ||
      // A page whose address carries an old year (a 2002 decree, a 2021 guide) goes behind current pages.
      Number(Boolean(staleYear(a.url))) - Number(Boolean(staleYear(b.url))) ||
      readable(b) - readable(a),
  );
  const merged: Candidate[] = [];
  for (const c of found) {
    const twin = merged.find(
      (m) =>
        sameThing(m.title, c.title) ||
        sameAction(m, c) ||
        (m.url === c.url &&
          (contains(m.quote, c.quote) ||
            contains(c.quote, m.quote) ||
            Math.max(overlap(m.title, c.title), overlap(c.title, m.title)) >= 0.5)),
    );
    if (twin) {
      twin.facts.push(...c.facts);
      twin.detail ??= c.detail;
    } else {
      merged.push({ ...c, facts: [...c.facts] });
    }
  }

  // Runs while the cited pages are being read, so it adds no waiting time.
  const freshPages = searchNews(merged.slice(0, 5).map((c) => c.title).join(". ")).catch(() => [] as Fresh[]);

  // A choice such as a restaurant is only useful if the place still exists. One short search per option asks.
  const closures: Promise<(string | null)[]> =
    scope === "open"
      ? Promise.all(
          merged.slice(0, 6).map(async (c) => {
            const names = namesIn(c.title);
            if (!names.length) return null;
            try {
              usage.searches++;
              const res = (await exa.search(
                `${names.join(" ")} ${where} closed`,
                { type: "auto", numResults: 5, contents: { highlights: true } } as never,
                { timeout: 8_000 } as never,
              )) as unknown as ExaSearchResponse;
              usage.costDollars += res.costDollars?.total ?? 0;
              const hit = (res.results ?? []).find((r) => {
                const text = `${r.title ?? ""} ${(r.highlights ?? []).join(" ")}`;
                return CLOSED.test(text) && names.some((name) => text.includes(name));
              });
              return hit ? hostOf(hit.url) : null;
            } catch {
              return null;
            }
          }),
        )
      : Promise.resolve([]);

  // Open every cited page again, live.
  const urls = [...new Set(merged.flatMap((c) => [c.url, ...c.facts.map((f) => f.url)]))];
  stage("read", m.opening(urls.length));
  // Fast mode spends an Oxylabs read only on pages nothing else could open. Deep mode reads every blocked page live.
  const pages = await fetchPages(urls, { oxylabs: input.depth === "deep" ? "blocked" : "unread" }, (url, via) =>
    emit({ type: "page", url, title: titles.get(url) ?? hostOf(url), official: isOfficial(url, j), via, ms: since() }),
  );
  const readers = readerCounts(pages);
  if (readers.oxylabs) stage("read", m.readBlocked(readers.oxylabs));
  for (const url of urls) emit({ type: "source", url, title: titles.get(url) ?? hostOf(url), official: isOfficial(url, j) });

  usage.contents += [...pages.values()].filter((p) => p?.exa).length;
  const readMs = since() - searchMs;

  stage("verify", m.checking);
  const evidence: EvidenceInput[] = [];
  const unverified: string[] = [];
  /** Returns the citation number, or null when the case already holds as many sources as it may. */
  const cite = (url: string, quote: string): number | null => {
    const existing = evidence.find((e) => e.url === url && (contains(e.quote, quote) || contains(quote, e.quote)));
    if (existing) {
      // Keep the longer wording: it carries more of the fact.
      if (quote.length > existing.quote.length) existing.quote = quote.slice(0, LIMITS.quote);
      return existing.n;
    }
    if (evidence.length >= LIMITS.evidence) return null;
    const n = evidence.length + 1;
    evidence.push({
      n,
      url,
      // Exa sometimes returns the first line of a PDF as its title. A lowercase start or a very long line is not a title.
      title: properTitle(titles.get(url)) || hostOf(url),
      publisher: publisherOf(url),
      quote: quote.slice(0, LIMITS.quote),
      sourceType: isOfficial(url, j) ? "official" : "secondary",
    });
    return n;
  };

  // Figures the family gave us, and the current year, need no source.
  const known = new Set([...numbersIn(given), String(new Date().getFullYear())]);
  /** Keep the sentences whose every figure is on a page we read. An unsourced number never reaches the reader. */
  const backed = (text: string | undefined, onPages: Set<string>): string | undefined =>
    (text ?? "")
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence && !unbackedNumbers(sentence, onPages, known).length)
      .join(" ")
      .trim() || undefined;

  /**
   * A deadline or amount is kept only if a sentence on its own page states it:
   * the step's quote, the sentence the search model quoted for it, or another sentence
   * on that page that is about the same thing. A fact is never borrowed from a different page.
   */
  const groundFact = (fact: Fact, c: Candidate, quote: string, main: number): number | null => {
    // A value without a figure ("when you move") has only its words, so the quote must carry all of them.
    const bar = numbersIn(fact.value).length ? 0.5 : 1;
    if (fact.url === c.url && supportFor(fact.value, quote, bar)) return main;
    const page = pages.get(fact.url);
    if (!page) return null;
    if (fact.url !== c.url || fact.quote !== c.quote) {
      const own = snapQuote(fact.quote, page.text);
      if (own && supportFor(fact.value, own.quote, bar)) return cite(fact.url, own.quote);
    }
    const anchor = `${c.title} ${c.detail ?? ""} ${quote} ${fact.quote}`;
    const onPage = supportFor(fact.value, page.text, 0.55, anchor);
    if (!onPage) return null;
    // Another sentence of the page may carry the fact only when it is about the same thing as the step.
    // Otherwise "one calendar month" of notice lands on a sentence about something else that also says one month.
    if (numbersIn(fact.value).length && sharedWords(onPage.sentence, anchor, fact.value) >= 2) return cite(fact.url, onPage.sentence);
    elsewhere.add(fact);
    return null;
  };

  type StepDraft = CaseInput["steps"][number];
  const steps: StepDraft[] = [];
  const money: CaseInput["money"] = [];
  const dueRef = new Map<StepDraft, number>();
  const dropped: { value: string; note: string }[] = [];
  // The note about figures that differ between steps, once it is written.
  let figureNote = "";
  // Deadlines that are on the page, but in a sentence about something else.
  const elsewhere = new Set<Fact>();
  // Every amount confirmed for a step, wherever its sentence is, to notice two that disagree.
  const amounts = new Map<StepDraft, { value: string; ref: number }[]>();
  /** How an amount is named when its sentence is not the step's own: by the start of that sentence. */
  const sentenceLabel = (n: number) => {
    const quote = evidence.find((e) => e.n === n)?.quote ?? "";
    return `“${quote.length > 90 ? `${quote.slice(0, 90).replace(/\s+\S*$/, "")}…` : quote}”`.slice(0, 120);
  };
  /** The same figure is one entitlement, however many steps mention it. A value without a number must match word for word. */
  const sameFigure = (a: string, b: string) =>
    numbersIn(a).length ? sameNumbers(a, b) && unitOf(a) === unitOf(b) : key(a) === key(b);

  const closedOn = await closures;
  for (const [index, c] of merged.entries()) {
    if (steps.length >= LIMITS.steps || evidence.length >= LIMITS.evidence - 1) break;
    if (closedOn[index] || (scope === "open" && CLOSED.test(pages.get(c.url)?.text.slice(0, 4000) ?? ""))) {
      unverified.push(m.closed(c.title, closedOn[index] ?? hostOf(c.url)));
      continue;
    }
    const page: FetchedPage = pages.get(c.url) ?? null;
    if (!page) {
      unverified.push(m.pageNotOpened(c.title, hostOf(c.url)));
      continue;
    }
    const snapped = snapQuote(c.quote, page.text);
    if (!snapped) {
      unverified.push(m.quoteNotFound(c.title, hostOf(c.url)));
      continue;
    }
    const onPage = pageNumbers(page.text);
    if (unbackedNumbers(c.title, onPage, known).length) {
      unverified.push(m.figureNotOnPage(c.title, hostOf(c.url)));
      continue;
    }
    let quote = snapped.quote;
    let main = cite(c.url, quote);
    if (main === null) break;
    const old = staleYear(c.url);
    if (old) unverified.push(m.oldSource(c.title, hostOf(c.url), old));

    // Two candidates that rest on the same sentence are one step, unless the second
    // describes another action and the page has a sentence of its own for it.
    let step = steps.find((s) => s.evidence[0] === main);
    if (step && !sameThing(step.title, c.title)) {
      const own = bestSupport(
        c.title,
        page.text,
        c.detail ?? "",
        (candidate) =>
          !candidate.pair &&
          !evidence.some((e) => e.url === c.url && (contains(e.quote, candidate.text) || contains(candidate.text, e.quote))),
      );
      const n = own && own.score >= 0.6 ? cite(c.url, own.sentence) : null;
      if (own && n !== null) {
        quote = own.sentence;
        main = n;
        step = undefined;
      }
    }
    if (!step) {
      step = { title: c.title, detail: backed(c.detail, onPage), status: "todo", confidence: c.confidence, evidence: [main] };
      steps.push(step);
    } else {
      step.detail ??= backed(c.detail, onPage);
    }
    const target = step;
    const addRef = (n: number) => {
      if (!target.evidence.includes(n)) target.evidence.push(n);
    };
    const differ = (first: string, firstRef: number, second: string, secondRef: number) => {
      // Two wordings can only disagree when both carry a number: "one week" and "viikon kuluessa" do not.
      if (!numbersIn(first).length || !numbersIn(second).length || firstRef === secondRef) return;
      // "€250, €400 or €600" and "EUR 250 to EUR 600" are one rule: one side's figures are all in the other.
      const a = new Set(numbersIn(first));
      const b = new Set(numbersIn(second));
      if ([...a].every((n) => b.has(n)) || [...b].every((n) => a.has(n))) return;
      if (target.conflict || sameNumbers(first, second) || !unitOf(first) || unitOf(first) !== unitOf(second)) return;
      target.conflict = m.twoFigures(first, firstRef, second, secondRef).slice(0, 400);
      addRef(firstRef);
      addRef(secondRef);
    };

    const missing: Fact[] = [];
    for (const fact of c.facts) {
      const n = groundFact(fact, c, quote, main);
      if (n === null) {
        missing.push(fact);
        continue;
      }
      const sentence = evidence.find((e) => e.n === n)?.quote ?? "";
      if (fact.kind === "deadline" && notOurDeadline(sentence)) {
        // The time limit binds someone else, or is a waiting time or an example: it is listed under its own sentence.
        const label = sentenceLabel(n);
        if (money.length < LIMITS.money && !money.some((x) => x.label === label || sameFigure(x.amount, fact.value))) {
          money.push({ label, amount: fact.value, evidence: [n] });
        }
        continue;
      }
      if (fact.kind === "deadline" && steps.some((s) => s !== target && s.due && key(s.due) === key(fact.value))) continue;
      if (fact.kind === "deadline") {
        const first = dueRef.get(target);
        if (!target.due || first === undefined) {
          target.due = fact.value;
          dueRef.set(target, n);
          addRef(n);
        } else if (sameNumbers(target.due, fact.value)) {
          // A second source that states the same deadline is shown next to the first.
          if (target.evidence.length < 4) addRef(n);
        } else {
          differ(target.due, first, fact.value, n);
        }
      } else {
        // Two amounts for one step that share a unit but not a figure are shown side by side.
        const seen = amounts.get(target) ?? [];
        const clash = seen.find((a) => !sameNumbers(a.value, fact.value) && unitOf(a.value) === unitOf(fact.value));
        if (clash) differ(clash.value, clash.ref, fact.value, n);
        amounts.set(target, [...seen, { value: fact.value, ref: n }]);

        // The same figure is one entitlement only when it comes from the same page or from sentences with the
        // same figures. "50%" for a short delay and "50%" as a minimum are two rules.
        const twin = money.find(
          (x) =>
            sameFigure(x.amount, fact.value) &&
            (x.evidence.includes(n) ||
              evidence.find((e) => e.n === x.evidence[0])?.url === fact.url ||
              sameNumbers(evidence.find((e) => e.n === x.evidence[0])?.quote ?? "", sentence)),
        );
        if (twin) {
          if (twin.evidence.length < 3 && !twin.evidence.includes(n)) twin.evidence.push(n);
        } else if (!clash && money.length < LIMITS.money) {
          // The amount carries the step's name only when the step's own sentence states it.
          // Stated elsewhere on the page, it is listed under the start of its own sentence,
          // so "40 working days" is never printed next to a step it does not belong to.
          const own = n === main && !notOurDeadline(sentence) && !money.some((x) => x.label === target.title);
          const label = own ? target.title : sentenceLabel(n);
          if (!money.some((m) => m.label === label)) money.push({ label, amount: fact.value, evidence: [n] });
        }
      }
    }
    // Only a concrete figure is worth reporting as missing. Whether the case shows it anyway is decided at the end.
    for (const fact of missing) {
      // A long value is a sentence, not a figure. Reporting it as missing would only confuse.
      if (!numbersIn(fact.value).length || fact.value.length > 60) continue;
      const note = (elsewhere.has(fact) ? m.factElsewhere : m.factNotStated)(c.title, fact.value, hostOf(fact.url));
      dropped.push({ value: fact.value, note });
      // The detail must not keep saying what was just left out ("open until 22:00").
      const figures = [...new Set(numbersIn(fact.value))];
      if (target.detail && figures.length) {
        target.detail =
          target.detail
            .split(/(?<=[.!?])\s+/)
            .filter((part) => figures.filter((f) => numbersIn(part).includes(f)).length * 2 < figures.length)
            .join(" ")
            .trim() || undefined;
      }
    }
  }
  // What a step's own sentence states is shown even when the search model left the field empty:
  // every money figure in it, and a single period when the step has no deadline or amount yet.
  // The text is the verified quote's own wording, so it is grounded as it stands.
  for (const step of steps) {
    const figures = figuresIn(evidence.find((e) => e.n === step.evidence[0])?.quote ?? "").filter((f) => !contains(given, f));
    const quote = evidence.find((e) => e.n === step.evidence[0])?.quote ?? "";
    const takes = (figure: string) => {
      if (money.length >= LIMITS.money || money.some((m) => sameFigure(m.amount, figure))) return;
      const own = numbersIn(figure);
      // Already inside a line that rests on the same sentence ("€250" within "€250, €400 or €600").
      if (money.some((x) => x.evidence.includes(step.evidence[0]) && own.every((n) => numbersIn(x.amount).includes(n)))) return;
      // One end of a range ("between 300 and 1,800 euros") is not the amount.
      const others = numbersIn(quote).filter((n) => !own.includes(n));
      if (own.length === 1 && others.length && /\b(between|from|zwischen|von)\b[^.]*\b(and|to|und|bis)\b|\d\s*(?:–|-|to|bis)\s*\d/i.test(quote)) return;
      if (unitOf(figure) === "%" && !RATE_WORDS.test(quote)) return;
      if (step.due && sameNumbers(step.due, figure) && unitOf(step.due) === unitOf(figure)) return;
      const label = money.some((m) => m.label === step.title) ? sentenceLabel(step.evidence[0]) : step.title;
      if (!money.some((m) => m.label === label)) money.push({ label, amount: figure, evidence: [step.evidence[0]] });
    };
    const sums = figures.filter((f) => ["€", "$", "£", "%"].includes(unitOf(f)));
    for (const figure of sums.slice(0, 2)) takes(figure);
    const bare = !step.due && !money.some((m) => m.label === step.title);
    if (bare && figures.length === 1 && !sums.length && QUALIFIED.test(figures[0])) takes(figures[0]);
  }

  // A figure that another source did confirm, under this step or another, is not a gap.
  const shown = [...steps.map((s) => s.due), ...money.map((m) => m.amount)].filter((v): v is string => Boolean(v));
  for (const d of dropped) {
    if (!shown.some((v) => sameNumbers(v, d.value) && unitOf(v) === unitOf(d.value))) unverified.push(d.note);
  }

  // Evidence that no step or amount points at would only clutter the source list.
  const used = new Set([...steps.flatMap((s) => s.evidence), ...money.flatMap((m) => m.evidence)]);
  if (used.size < evidence.length) {
    const renumber = new Map<number, number>();
    const kept = evidence.filter((e) => used.has(e.n));
    kept.forEach((e, i) => renumber.set(e.n, i + 1));
    const swap = (refs: number[]) => refs.map((n) => renumber.get(n) ?? n);
    for (const s of steps) {
      s.evidence = swap(s.evidence);
      s.conflict = s.conflict?.replace(/\[(\d+)\]/g, (_, n: string) => `[${renumber.get(Number(n)) ?? n}]`);
    }
    for (const m of money) m.evidence = swap(m.evidence);
    for (const e of kept) e.n = renumber.get(e.n) ?? e.n;
    evidence.length = 0;
    evidence.push(...kept);
  }

  // A money line that only repeats its step's deadline says nothing new.
  for (let i = money.length - 1; i >= 0; i--) {
    const owner = steps.find((s) => s.title === money[i].label);
    if (owner?.due && (key(owner.due) === key(money[i].amount) || (numbersIn(owner.due).length > 0 && sameFigure(owner.due, money[i].amount)))) {
      money.splice(i, 1);
    }
  }

  // Different figures for what looks like the same rule are pointed out, so nobody reads one of them as the whole truth:
  // last year's rate and this year's, or "two months" on one site and "one month" on another.
  // Percentages are compared across the whole case. Other figures only between steps whose titles are about the same thing.
  const figuresOf = (step: StepDraft) =>
    [
      ...(step.due ? [{ value: step.due, ref: dueRef.get(step) ?? step.evidence[0] }] : []),
      ...(amounts.get(step) ?? []),
      ...money.filter((m) => m.label === step.title).map((m) => ({ value: m.amount, ref: m.evidence[0] })),
      // A rate stated in a step's sentences counts even when no field carries it: 35 % in one quote and 40 % in another.
      ...step.evidence.flatMap((n) =>
        figuresIn(evidence.find((e) => e.n === n)?.quote ?? "")
          .filter((f) => unitOf(f) === "%")
          .map((value) => ({ value, ref: n })),
      ),
    ].filter((f) => unitOf(f.value) && new Set(numbersIn(f.value)).size === 1);
  const differing = (
    first: { value: string; ref: number }[],
    second: { value: string; ref: number }[],
    only?: string,
  ): [{ value: string; ref: number }, { value: string; ref: number }] | null => {
    for (const a of first) {
      for (const b of second) {
        const unit = unitOf(a.value);
        if (a.ref !== b.ref && unit === unitOf(b.value) && (!only || unit === only) && !sameNumbers(a.value, b.value)) return [a, b];
      }
    }
    return null;
  };
  // A longer word that only these two sentences of the whole case share ("notified") ties them to one rule.
  const allQuotes = evidence.map((e) => new Set(tokens(e.quote)));
  const sameRule = (a: number, b: number) => {
    const x = new Set(tokens(evidence.find((e) => e.n === a)?.quote ?? ""));
    const y = new Set(tokens(evidence.find((e) => e.n === b)?.quote ?? ""));
    const shared = [...x].filter((t) => t.length >= 4 && !/^\d/.test(t) && y.has(t));
    const rare = shared.some((t) => t.length >= 6 && allQuotes.filter((q) => q.has(t)).length <= 2);
    return rare && shared.length >= 3;
  };
  pairs: for (let i = 0; i < steps.length; i++) {
    for (let k = i + 1; k < steps.length; k++) {
      const pair =
        differing(figuresOf(steps[i]), figuresOf(steps[k]), relatedTitles(steps[i].title, steps[k].title) ? undefined : "%") ??
        (() => {
          const other = differing(figuresOf(steps[i]), figuresOf(steps[k]));
          return other && sameRule(other[0].ref, other[1].ref) ? other : null;
        })();
      if (!pair || steps[i].conflict?.includes(`[${pair[0].ref}]`)) continue;
      figureNote = m.differentFigures(pair[0].value, pair[0].ref, pair[1].value, pair[1].ref);
      unverified.unshift(figureNote);
      break pairs;
    }
  }

  if (!steps.length) {
    throw new EngineError(m.nothingConfirmed, 502);
  }

  // A recent page is kept only when it is about this case: its title shares a word start with the step titles,
  // and title plus first highlight share two. Place names do not count, or every local news item would match.
  // Most related first, then newest. Never a page the plan already cites.
  const places = stems(`${j.name} ${j.region ?? ""} ${where}`);
  // The topic is what the family wrote plus the case title. Step titles bring in words such as "consumer" and
  // "services" that match any press release, and a publisher's own name matches all of its pages.
  const publishers = stems(evidence.map((e) => `${e.publisher ?? ""} ${hostOf(e.url).replace(/\./g, " ")}`).join(" "));
  const topic = new Set(
    [...stems(`${input.situation} ${head.title ?? ""}`)].filter(
      (t) => !places.has(t) && !ACTION_STEMS.has(t) && !publishers.has(t) && !CATCH_ALL.has(t) && !FILLER.has(t),
    ),
  );
  // A city's own site is news for that city only.
  const elsewhereCity = (url: string) => {
    const city = Object.entries(CITY_SITES).find(([site]) => hostOf(url) === site || hostOf(url).endsWith(`.${site}`))?.[1];
    return Boolean(city) && !new RegExp(city as string, "i").test(`${j.region ?? ""} ${input.situation}`);
  };
  const shared = (text: string) => [...stems(text)].filter((t) => topic.has(t)).length;
  const citedUrls = new Set(evidence.map((e) => e.url.replace(/\/$/, "")));
  // The plan never waits long for this: pointers are a bonus, and a slow search just means none are shown.
  const news = (await Promise.race([freshPages, new Promise<Fresh[]>((resolve) => setTimeout(() => resolve([]), 1200))]))
    .filter((n) => !citedUrls.has(n.url.replace(/\/$/, "")) && !elsewhereCity(n.url) && shared(n.title) >= 1 && shared(n.text) >= 2)
    .filter((n, i, all) => all.findIndex((o) => o.url === n.url || key(o.title) === key(n.title)) === i)
    .sort((a, b) => shared(b.text) - shared(a.text) || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((n) => ({ url: n.url, title: n.title, date: n.date, publisher: publisherOf(n.url) }));
  if (news.length) stage("verify", m.foundNews(news.length));
  const verifyMs = since() - searchMs - readMs;

  // Title, summary and questions are the model's own prose. Any figure in them must be on a page we cite.
  const cited = new Set<string>();
  for (const url of new Set(evidence.map((e) => e.url))) {
    for (const n of pageNumbers(pages.get(url)?.text ?? "")) cited.add(n);
  }
  const saidStems = stems(given);
  // The header shows where the family lives. A place at the end of the title adds nothing,
  // and it is wrong when the situation is about somewhere else (a move to another town).
  const place = [j.region, j.name].filter(Boolean).map((p) => (p as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const placeless = clip(head.title, 140).replace(new RegExp(`(?:[,:]?\\s+(?:in|for|at)\\s+(?:${place})(?:,\\s*(?:${place}))?)+\\s*$`, "i"), "");
  const title = backed(placeless, cited) ?? clip(input.situation, 80);
  // Where sources give two figures, the summary must not state one of them as the answer.
  const disputed = [...steps.map((s) => s.conflict ?? ""), ...unverified.filter((u) => u === figureNote)].flatMap((text) =>
    [...text.matchAll(/["”“]([^"”“]+)["”“]\s*\[\d+\]/g)].map((x) => x[1]),
  );
  const withoutDisputed = (text: string) =>
    text
      .split(/(?<=[.!?])\s+/)
      .filter((part) => !disputed.some((d) => unitOf(d) && tokens(part).includes(unitOf(d)) && numbersIn(d).some((n) => numbersIn(part).includes(n))))
      .join(" ");
  const caseInput: CaseInput = {
    title,
    event: key(title).split(" ").slice(0, 4).join("_").slice(0, 60) || "case",
    language: input.language,
    jurisdiction: { country: j.name, region: j.region },
    summary: backed(withoutDisputed(clip(head.summary, 800)), cited) ?? m.sourcedPlan(clip(input.situation, 200)),
    steps,
    money,
    evidence,
    drafts: [],
    news: news.length ? news : undefined,
    unverified: dedupe(unverified, 6).map((u) => u.slice(0, 300)),
    openQuestions: questions
      .filter((q) => q.trim().endsWith("?") && backed(q, cited) === q.trim())
      // A question whose words are mostly in the family's own message has been answered already.
      .filter((q) => {
        const asked = [...stems(q)];
        return asked.length > 0 && asked.filter((t) => saidStems.has(t)).length / asked.length < 0.6;
      })
      .filter((q, i, all) => all.findIndex((o) => sameThing(o, q) || relatedTitles(o, q)) === i)
      .slice(0, 3)
      .map((q) => q.slice(0, 300)),
  };

  stage("publish", m.building);
  const published = await publishCase(caseInput, origin, pages, {
    ms: since(),
    searches: usage.searches,
    pagesRead: urls.length,
    costDollars: Math.round(usage.costDollars * 1000) / 1000,
    officialDomains: official.length,
    readers,
    events: trailEvents.slice(0, 20),
  });
  emit({ type: "verified", verified: published.evidenceVerified, total: published.evidenceTotal, ms: since() });

  // Chat-ready lines. Only lines whose every citation was confirmed on the page,
  // and the numbers after a line point at the sentences that carry its deadline and amount.
  const failed = new Map(published.failed.map((f) => [f.n, f.reason]));
  const confirmed = (refs: number[]) => refs.length > 0 && refs.every((n) => !failed.has(n));
  const plan = steps
    .filter((s) => confirmed(s.evidence))
    .slice(0, 5)
    .map((s) => {
      const listed = money.find((m) => m.label === s.title && confirmed(m.evidence));
      const amount = listed?.amount;
      const refs = [...new Set([...s.evidence, ...(listed?.evidence ?? [])])];
      if (s.conflict) return `${s.title}: ${m.sourcesDiffer} ${refs.map((n) => `[${n}]`).join("")}`;
      const fact = s.due ? `: ${s.due}${amount ? ` (${amount})` : ""}` : amount ? `: ${amount}` : "";
      return `${s.title}${fact} ${refs.map((n) => `[${n}]`).join("")}`;
    });

  // The verdict is the stored one. Which reading carried the quote is judged the way the store judged it.
  const sentences: ResultEvidence[] = evidence.map((e) => ({
    n: e.n,
    url: e.url,
    title: e.title,
    quote: e.quote,
    sourceType: e.sourceType,
    verification: failed.get(e.n) ?? "verified",
    checkedVia: failed.has(e.n) ? undefined : judge(e.quote, pages.get(e.url) ?? null).checkedVia,
  }));

  return {
    id: published.id,
    url: published.url,
    title,
    plan,
    evidence: sentences,
    evidenceTotal: published.evidenceTotal,
    evidenceVerified: published.evidenceVerified,
    unverified: caseInput.unverified,
    openQuestions: caseInput.openQuestions,
    ms: since(),
    timings: { searchMs, readMs, verifyMs },
    exa: { ...usage, costDollars: Math.round(usage.costDollars * 1000) / 1000 },
    readers,
    jurisdiction: { country: j.name, region: j.region, officialDomains: official.length },
    news,
  };
}
