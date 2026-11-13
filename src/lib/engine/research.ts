import Exa from "exa-js";
import { z } from "zod";
import { type CaseInput, type EvidenceInput, LIMITS } from "@/lib/case";
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
import { numbersIn, tokens } from "@/lib/text";
import { type FetchedPage, fetchPages, readerCounts } from "@/lib/verify";

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
  depth: z.enum(["fast", "deep"]).default("fast").describe("fast: about 6 to 12 seconds. deep: more questions and Exa deep search."),
  scope: z
    .enum(["auto", "official", "open"])
    .default("auto")
    .describe(
      "official: rules, benefits, deadlines, rights; search official sites first. open: choices such as restaurants, trips, gifts, services; search the open web. auto: decide from the wording.",
    ),
});
export type ResearchInput = z.infer<typeof ResearchInput>;

export type EngineEvent =
  | { type: "stage"; name: "plan" | "search" | "read" | "verify" | "publish"; detail: string; ms: number }
  | { type: "source"; url: string; title: string; official: boolean };

export type ResearchResult = {
  id: string;
  url: string;
  title: string;
  plan: string[];
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
type ExaResult = { url: string; title?: string | null };
type Grounding = { field: string; citations?: { url: string; title?: string }[]; confidence?: string };
type ExaSearchResponse = {
  results?: ExaResult[];
  output?: { content?: unknown; grounding?: Grounding[] };
  costDollars?: { total?: number };
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

const NOTHING_MESSAGE =
  "I could not find anything to research in that message. Describe what happened in a sentence or two, for example: “Our landlord wants to raise the rent by 15 percent from next month.”";

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
    `When the authority publishes the page in ${lang}, cite that version of the page.`,
    "Include only steps that directly help with this exact situation. Skip general information about neighbouring topics, and anything the sources do not cover.",
    "At most five steps. Five well-sourced steps beat ten vague ones.",
    `Write title, summary, step titles, details and questions in ${lang}. Keep quotes in the original language.`,
  ].join(" ");
}

function frame(input: ResearchInput, j: Jurisdiction): string {
  const where = `${j.region ? `${j.region}, ` : ""}${j.name}`;
  return [
    `Situation of a family living in ${where}: ${input.situation}`,
    input.household ? `About the household: ${input.household}` : "",
    input.document ? `They received this document:\n"""\n${input.document.slice(0, 3000)}\n"""` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type Focus = { name: string; ask: string; keywords: string; lead?: boolean };

const CHOICE = /\b(restaurants?|dinner|lunch|brunch|caf[eé]s?|bars?|anniversary|birthday|party|gifts?|presents?|hotels?|trip|holiday|vacation|weekend|date night|things to do|activit(y|ies)|concerts?|babysitters?|plumbers?|electricians?|movers?|moving compan(y|ies)|cleaners?|gyms?|recipes?)\b/i;
const RULES =
  /\b(benefits?|allowances?|permits?|visas?|tax(es)?|fines?|landlords?|rent|leases?|contracts?|compensation|refunds?|deadlines?|laws?|legal|rights?|cancel\w*|delayed|pregnan\w*|unemploy\w*|laid off|warranty|insurance|letters?|passports?|stolen|theft|lost|police|embassy|consulate|emergency|accident|hospital|sick|illness|died|death|divorce|marri(ed|age)|baby|daycare|schools?|moving|relocat\w*|residen\w*|citizen\w*|parking|invoices?|debts?|eviction|employers?|boss|salary|wages?|entitled|membership|customs|broke\w*|damaged?|complain\w*|refus\w*|charged|allowed)\b/i;
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

function choiceFocuses(): Focus[] {
  return [
    {
      name: "options that fit",
      lead: true,
      keywords: "best options that match every requirement",
      ask: "Which specific places, providers or options fit this request best? One option per step. Every requirement in the request must be met by the option, and the quote must show that it is.",
    },
    {
      name: "practical details",
      keywords: "opening hours, booking, prices, address",
      ask: "For options that fit the request: opening hours on the requested day, how to book, price level and address. One option per step.",
    },
  ];
}

function focuses(input: ResearchInput): Focus[] {
  const doc = Boolean(input.document);
  const list: Focus[] = [
    {
      name: "actions and deadlines",
      lead: true,
      keywords: doc ? "rules, tenant or consumer rights, how to object, deadlines" : "what to do, applications, notifications, deadlines",
      ask: doc
        ? "Is what the document demands allowed under the current rules? What can the family do, in what order, and by when must they respond, object or appeal?"
        : "What must they do, in what order, and by when? Cover applications, notifications to employers or authorities, appointments and deadlines.",
    },
    {
      name: "money and entitlements",
      keywords: "amounts, benefits, compensation, entitlements, conditions",
      ask: doc
        ? "Which limits, compensation, fees or rights apply to this situation? List only items with a stated amount, percentage, cap or number of days."
        : "Which benefits, compensation, paid leave or other entitlements can they get? List only items with a stated amount, rate, percentage or number of days, and the conditions.",
    },
    {
      name: "how and where to apply",
      keywords: "how to apply, which authority, forms, required documents",
      ask: "For each application or notification: which authority, online service or form is used, and which documents or certificates are needed?",
    },
  ];
  if (input.depth === "deep") {
    list.push({
      name: "exceptions and missed deadlines",
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

const EMPTY = /^(['"`´\s]*|ei määrää|ei määräaikaa|ei mainittu|ei ilmoitettu|ei tiedossa|empty|none( stated| specified| given)?|n\/?a|null|unknown|varies|not (specified|stated|applicable|available|mentioned)|no (specific )?(deadline|amount)( stated| specified)?|-+|–|—)$/i;
const JUNK = /[{}\[\]]|"\s*[:,]|citations|confidence\s*:/i;
const VAGUE = /^(as soon as possible|asap|immediately|promptly|without delay|mahdollisimman pian|viipymättä|heti|snarast)$/i;

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

const sameThing = (a: string, b: string) => Math.max(overlap(a, b), overlap(b, a)) >= 0.6;

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
  return /\d/.test(amount) && (MONEY.test(amount) || unitOf(amount)) ? amount : undefined;
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

const UNITS = ["%", "€", "$", "£", "day", "week", "month", "year"];
/** What a value measures: "35 %" and "40 %" can contradict each other, "35 %" and "160 days" cannot. */
const unitOf = (value: string) => tokens(value).find((t) => UNITS.includes(t)) ?? "";
const sameNumbers = (a: string, b: string) => numbersIn(a).sort().join(" ") === numbersIn(b).sort().join(" ");

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
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);

  const j = resolveJurisdiction(input.country, input.region);
  if (!j.code) {
    throw new EngineError(`Unknown country "${input.country}". Use an English country name or a two-letter code.`, 400);
  }
  if (UNSUPPORTED_COUNTRIES.has(j.code)) throw new EngineError("This country is not supported.", 400);
  const exa = new Exa(process.env.EXA_API_KEY);
  const usage = { searches: 0, contents: 0, costDollars: 0 };
  const scope = resolveScope(input);
  const official = scope === "official" ? j.officialDomains : [];
  const context = frame(input, j);
  const where = `${j.region ? `${j.region}, ` : ""}${j.name}`;
  const system = scope === "open" ? choicePrompt(j, input.language) : systemPrompt(j, input.language);
  const titles = new Map<string, string>();
  const trailEvents: { ms: number; detail: string }[] = [];
  const stage = (name: Extract<EngineEvent, { type: "stage" }>["name"], detail: string) => {
    trailEvents.push({ ms: since(), detail });
    emit({ type: "stage", name, detail, ms: since() });
  };

  stage(
    "plan",
    scope === "open"
      ? `Pinned to ${where}. This is a choice, not a rule, so searching the open web and labelling each source.`
      : official.length
        ? `Pinned to ${j.name}. Searching ${official.length} official sites first.`
        : `Pinned to ${j.name}. No official site list for this country yet, so searching the open web and labelling each source.`,
  );

  let head: RawOutput = {};
  const questions: string[] = [];
  const given = `${input.situation}\n${input.document ?? ""}\n${input.household ?? ""}`;

  async function search(focus: Focus, restrict: boolean): Promise<Candidate[]> {
    stage("search", `Exa search on ${restrict && official.length ? "official sites" : "the open web"}: ${focus.name}`);
    usage.searches++;
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
    )) as unknown as ExaSearchResponse;
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
    return (out?.steps ?? [])
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
  }

  // One failed search must not sink the case: the others still carry it.
  let lastError: unknown;
  const run = async (list: Focus[], restrict: boolean): Promise<Candidate[]> => {
    const settled = await Promise.allSettled(list.map((f) => search(f, restrict)));
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failures.length) {
      lastError = failures[0].reason;
      stage("search", `${failures.length} of ${list.length} searches failed and were skipped`);
    }
    // Results keep the order of `list`, so the lead focus comes first.
    return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  };

  const asks = scope === "open" ? choiceFocuses() : focuses(input);
  let found = await run(asks, true);
  // Too little from official sites: widen to the open web once.
  if (found.length < 3 && official.length) found = [...found, ...(await run(asks.slice(0, 2), false))];
  if (!found.length) {
    if (lastError) {
      throw new EngineError(`Exa search failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`, 502);
    }
    // Nothing to research, or nothing found. Not a server fault, so the caller gets a message it can show.
    throw new EngineError(NOTHING_MESSAGE, 422);
  }
  // Small talk or gibberish still returns pages, and a plan built from them would be an invented situation.
  // If no word of the message comes back in anything the search wrote or quoted, there was nothing to research.
  if (!input.document) {
    const written = found.map((c) => `${c.title} ${c.detail ?? ""} ${c.quote}`).join(" ");
    if (!echoes(input.situation, `${head.title ?? ""} ${head.summary ?? ""} ${written}`)) {
      throw new EngineError(NOTHING_MESSAGE, 422);
    }
  }
  const searchMs = since();

  // Official sources first (stable sort keeps the lead focus on top), then merge near-duplicates.
  // Each deadline and amount keeps the page it came from, so merging steps never moves a fact to another source.
  found.sort((a, b) => Number(b.official) - Number(a.official));
  const merged: Candidate[] = [];
  for (const c of found) {
    const twin = merged.find(
      (m) =>
        sameThing(m.title, c.title) ||
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

  // Open every cited page again, live.
  const urls = [...new Set(merged.flatMap((c) => [c.url, ...c.facts.map((f) => f.url)]))];
  stage("read", `Opening ${urls.length} cited pages: our own live request plus Exa Contents`);
  // Fast mode spends an Oxylabs read only on pages nothing else could open. Deep mode reads every blocked page live.
  const pages = await fetchPages(urls, { oxylabs: input.depth === "deep" ? "blocked" : "unread" });
  const readers = readerCounts(pages);
  if (readers.oxylabs) stage("read", `Read ${readers.oxylabs} blocked pages live through the Oxylabs Web API`);
  for (const url of urls) emit({ type: "source", url, title: titles.get(url) ?? hostOf(url), official: isOfficial(url, j) });

  usage.contents += [...pages.values()].filter((p) => p?.exa).length;
  const readMs = since() - searchMs;

  stage("verify", "Checking every quote, amount and deadline against the page text");
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
      title: clip(titles.get(url), 200) || hostOf(url),
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
    if (fact.url === c.url && supportFor(fact.value, quote, 0.5)) return main;
    const page = pages.get(fact.url);
    if (!page) return null;
    if (fact.url !== c.url || fact.quote !== c.quote) {
      const own = snapQuote(fact.quote, page.text);
      if (own && supportFor(fact.value, own.quote, 0.5)) return cite(fact.url, own.quote);
    }
    const anchor = `${c.title} ${c.detail ?? ""} ${quote} ${fact.quote}`;
    const onPage = supportFor(fact.value, page.text, 0.55, anchor);
    if (onPage && sharedWords(onPage.sentence, anchor, fact.value) >= 2) return cite(fact.url, onPage.sentence);
    return null;
  };

  type StepDraft = CaseInput["steps"][number];
  const steps: StepDraft[] = [];
  const money: CaseInput["money"] = [];
  const dueRef = new Map<StepDraft, number>();

  for (const c of merged) {
    if (steps.length >= LIMITS.steps || evidence.length >= LIMITS.evidence - 1) break;
    const page: FetchedPage = pages.get(c.url) ?? null;
    if (!page) {
      unverified.push(`${c.title}: the cited page could not be opened (${hostOf(c.url)}).`);
      continue;
    }
    const snapped = snapQuote(c.quote, page.text);
    if (!snapped) {
      unverified.push(`${c.title}: the quoted sentence was not found on ${hostOf(c.url)}.`);
      continue;
    }
    const onPage = pageNumbers(page.text);
    if (unbackedNumbers(c.title, onPage, known).length) {
      unverified.push(`${c.title}: this figure is not on ${hostOf(c.url)}, so the step is left out.`);
      continue;
    }
    let quote = snapped.quote;
    let main = cite(c.url, quote);
    if (main === null) break;

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
      if (target.conflict || sameNumbers(first, second) || !unitOf(first) || unitOf(first) !== unitOf(second)) return;
      target.conflict = `Two figures found: "${first}" [${firstRef}] and "${second}" [${secondRef}]. Check which one applies to you.`.slice(0, 400);
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
        const listed = money.find((m) => m.label === target.title);
        if (!listed) {
          if (money.length < LIMITS.money) money.push({ label: target.title, amount: fact.value, evidence: [n] });
        } else if (sameNumbers(listed.amount, fact.value)) {
          if (listed.evidence.length < 3 && !listed.evidence.includes(n)) listed.evidence.push(n);
        } else {
          differ(listed.amount, listed.evidence[0], fact.value, n);
        }
      }
    }
    // Report a figure as missing only if it is concrete and the step does not already show it from another source.
    const shown = [target.due, money.find((m) => m.label === target.title)?.amount].filter((v): v is string => Boolean(v));
    for (const fact of missing) {
      if (/\d/.test(fact.value) && !shown.some((v) => sameNumbers(v, fact.value))) {
        unverified.push(`${c.title}: "${fact.value}" is not stated on ${hostOf(fact.url)}, so it is left out.`);
      }
    }
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

  // Percentages are where sources contradict each other most often: last year's rate and this year's.
  // Two steps with different percentages are pointed out, so nobody reads one of them as the whole truth.
  const rates = money.filter((m) => unitOf(m.amount) === "%" && numbersIn(m.amount).length === 1);
  for (let i = 0; i < rates.length; i++) {
    const other = rates.slice(i + 1).find((m) => !sameNumbers(m.amount, rates[i].amount));
    if (other) {
      unverified.unshift(
        `Different rates appear: "${rates[i].amount}" [${rates[i].evidence[0]}] and "${other.amount}" [${other.evidence[0]}]. They may apply to different years or cases, so read both quotes.`,
      );
      break;
    }
  }

  if (!steps.length) {
    throw new EngineError("Sources were found, but no claim could be confirmed on the cited pages.", 502);
  }
  const verifyMs = since() - searchMs - readMs;

  // Title, summary and questions are the model's own prose. Any figure in them must be on a page we cite.
  const cited = new Set<string>();
  for (const url of new Set(evidence.map((e) => e.url))) {
    for (const n of pageNumbers(pages.get(url)?.text ?? "")) cited.add(n);
  }
  const title = backed(clip(head.title, 140), cited) ?? clip(input.situation, 80);
  const caseInput: CaseInput = {
    title,
    event: key(title).split(" ").slice(0, 4).join("_").slice(0, 60) || "case",
    language: input.language,
    jurisdiction: { country: j.name, region: j.region },
    summary: backed(clip(head.summary, 800), cited) ?? `Sourced plan for: ${clip(input.situation, 200)}`,
    steps,
    money,
    evidence,
    drafts: [],
    unverified: dedupe(unverified, 6).map((u) => u.slice(0, 300)),
    openQuestions: dedupe(questions.filter((q) => backed(q, cited) === q.trim()), 3).map((q) => q.slice(0, 300)),
  };

  stage("publish", "Building the case file");
  const published = await publishCase(caseInput, origin, pages, {
    ms: since(),
    searches: usage.searches,
    pagesRead: urls.length,
    costDollars: Math.round(usage.costDollars * 1000) / 1000,
    officialDomains: official.length,
    readers,
    events: trailEvents.slice(0, 20),
  });

  // Chat-ready lines. Only lines whose every citation was confirmed on the page,
  // and the numbers after a line point at the sentences that carry its deadline and amount.
  const failed = new Set(published.failed.map((f) => f.n));
  const confirmed = (refs: number[]) => refs.length > 0 && refs.every((n) => !failed.has(n));
  const plan = steps
    .filter((s) => confirmed(s.evidence))
    .slice(0, 5)
    .map((s) => {
      const listed = money.find((m) => m.label === s.title && confirmed(m.evidence));
      const amount = listed?.amount;
      const fact = s.due ? `: ${s.due}${amount ? ` (${amount})` : ""}` : amount ? `: ${amount}` : "";
      const refs = [...new Set([...s.evidence, ...(listed?.evidence ?? [])])];
      return `${s.title}${fact} ${refs.map((n) => `[${n}]`).join("")}`;
    });

  return {
    id: published.id,
    url: published.url,
    title,
    plan,
    evidenceTotal: published.evidenceTotal,
    evidenceVerified: published.evidenceVerified,
    unverified: caseInput.unverified,
    openQuestions: caseInput.openQuestions,
    ms: since(),
    timings: { searchMs, readMs, verifyMs },
    exa: { ...usage, costDollars: Math.round(usage.costDollars * 1000) / 1000 },
    readers,
    jurisdiction: { country: j.name, region: j.region, officialDomains: official.length },
  };
}
