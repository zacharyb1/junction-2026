import Exa from "exa-js";
import { z } from "zod";
import { type CaseInput, type EvidenceInput, LIMITS } from "@/lib/case";
import { publishCase } from "@/lib/cases";
import { contains, overlap, snapQuote, supportFor } from "@/lib/engine/ground";
import { hostOf, isOfficial, type Jurisdiction, publisherOf, resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { type FetchedPage, fetchPages } from "@/lib/verify";

/**
 * The research engine.
 *
 *   situation + country
 *     -> three Exa searches in parallel, each returning a structured checklist
 *        (step, deadline, amount, quoted sentence, source URL) from official domains
 *     -> every cited page is opened again, live
 *     -> quotes are snapped to real sentences; amounts and deadlines must be on the page
 *     -> anything that cannot be pointed at moves to "could not verify"
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
type ExaResult = { url: string; title?: string | null; publishedDate?: string | null };
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
    "Fill `due` only with a booking deadline or opening time the page states, and `amount` only with a price the page states. Never estimate.",
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
const RULES = /\b(benefits?|allowances?|permits?|visa|tax(es)?|fines?|landlord|rent|lease|contract|compensation|refunds?|deadline|law|legal|rights?|cancelled|delayed|pregnan\w*|unemploy\w*|laid off|warranty|insurance|letter)\b/i;

/** Rules and benefits live on official sites. Choices such as restaurants or gifts live on the open web. */
function resolveScope(input: ResearchInput): "official" | "open" {
  if (input.scope !== "auto") return input.scope;
  if (input.document) return "official";
  return CHOICE.test(input.situation) && !RULES.test(input.situation) ? "open" : "official";
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

type Candidate = {
  confidence?: Confidence;
  title: string;
  detail?: string;
  due?: string;
  amount?: string;
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

const EMPTY = /^(ei määrää|ei määräaikaa|ei mainittu|ei ilmoitettu|ei tiedossa|empty|none( stated| specified| given)?|n\/?a|null|unknown|varies|not (specified|stated|applicable|available|mentioned)|no (specific )?(deadline|amount)( stated| specified)?|-+|–|—)$/i;
const JUNK = /[{}\[\]]|"\s*[:,]|citations|confidence\s*:/i;
const VAGUE = /^(as soon as possible|asap|immediately|promptly|without delay|mahdollisimman pian|viipymättä|heti|snarast)$/i;

/** A deadline or amount as the model wrote it, or nothing if it is a placeholder, a formatting leak or too vague to act on. */
function tidy(text: unknown): string | undefined {
  if (typeof text !== "string") return undefined;
  let value = clip(text, 400);
  // Cut long values at a word boundary so nothing ends mid-word.
  if (value.length > 100) value = `${value.slice(0, 100).replace(/\s+\S*$/, "")}…`;
  value = value.replace(/[.;,]+$/, "");
  if (!value || EMPTY.test(value) || JUNK.test(value) || VAGUE.test(value)) return undefined;
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
  if (TIMING.test(amount) && !MONEY.test(amount)) return undefined;
  if (!/\d/.test(amount) && !/free of charge|income/i.test(amount)) return undefined;
  return amount;
}

/** Exa allows 10 requests per second per team. Back off briefly and try again. */
async function withRetry<T>(call: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await call();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /rate limit|429|timeout|ECONNRESET|503|502/i.test(message);
      if (!retryable || i >= attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1100 * (i + 1) + Math.random() * 600));
    }
  }
}

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
  if (UNSUPPORTED_COUNTRIES.has(j.code)) throw new EngineError("This country is not supported.", 400);
  const exa = new Exa(process.env.EXA_API_KEY);
  const usage = { searches: 0, contents: 0, costDollars: 0 };
  const scope = resolveScope(input);
  const official = scope === "official" ? j.officialDomains : [];
  const context = frame(input, j);
  const where = `${j.region ? `${j.region}, ` : ""}${j.name}`;
  const system = scope === "open" ? choicePrompt(j, input.language) : systemPrompt(j, input.language);
  const titles = new Map<string, string>();
  const dates = new Map<string, string>();
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
  const given = `${input.situation}\n${input.document ?? ""}`;

  async function search(focus: Focus, restrict: boolean): Promise<Candidate[]> {
    stage("search", `Exa search on ${restrict && official.length ? "official sites" : "the open web"}: ${focus.name}`);
    usage.searches++;
    const deep = input.depth === "deep";
    const options = {
      type: deep ? "deep" : "auto",
      numResults: 8,
      // The query stays short. The family's full situation and what to extract go in `objective`.
      objective: `${context}\n\nQuestion: ${focus.ask}`.slice(0, 4000),
      systemPrompt: system,
      outputSchema: OUTPUT_SCHEMA,
      // Highlights let Exa fill the fields from page text, not from titles alone.
      contents: { highlights: true },
      userLocation: /^[A-Z]{2}$/.test(j.code) ? j.code : undefined,
      ...(restrict && official.length ? { includeDomains: official } : {}),
    };
    const query = `${clip(input.situation, 300)} ${where}: ${focus.keywords}`;
    const res = (await withRetry(() =>
      exa.search(query, options as never, { timeout: deep ? 120_000 : 45_000 } as never),
    )) as unknown as ExaSearchResponse;
    usage.costDollars += res.costDollars?.total ?? 0;
    for (const r of res.results ?? []) {
      if (r.title) titles.set(r.url, r.title);
      if (r.publishedDate) dates.set(r.url, r.publishedDate.slice(0, 10));
    }
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
        return {
          confidence: s.confidence,
          title: clip(s.title, 140),
          detail: JUNK.test(s.detail ?? "") ? undefined : clip(s.detail, 600) || undefined,
          due,
          amount: realAmount(own(tidy(s.amount)), due),
          quote: clip(s.quote, LIMITS.quote),
          url: s.sourceUrl!.trim(),
          official: isOfficial(s.sourceUrl!, j),
        };
      });
  }

  const asks = scope === "open" ? choiceFocuses() : focuses(input);
  let found: Candidate[];
  try {
    // Results keep the order of `asks`, so the lead focus comes first.
    found = (await Promise.all(asks.map((f) => search(f, true)))).flat();
    // Too little from official sites: widen to the open web once.
    if (found.length < 3 && official.length) {
      found = [...found, ...(await Promise.all(asks.slice(0, 2).map((f) => search(f, false)))).flat()];
    }
  } catch (error) {
    throw new EngineError(`Exa search failed: ${error instanceof Error ? error.message : String(error)}`, 502);
  }
  if (!found.length) throw new EngineError("No sourced steps were found for this situation.", 502);
  const searchMs = since();

  // Official sources first (stable sort keeps the lead focus on top), then merge near-duplicates.
  found.sort((a, b) => Number(b.official) - Number(a.official));
  const merged: Candidate[] = [];
  for (const c of found) {
    const twin = merged.find(
      (m) =>
        sameThing(m.title, c.title) ||
        (m.url === c.url && (key(m.quote) === key(c.quote) || Math.max(overlap(m.title, c.title), overlap(c.title, m.title)) >= 0.5)),
    );
    if (twin) {
      twin.due ??= c.due;
      twin.amount ??= c.amount;
      twin.detail ??= c.detail;
    } else {
      merged.push({ ...c });
    }
  }

  // Open every cited page again, live.
  const urls = [...new Set(merged.map((c) => c.url))];
  stage("read", `Opening ${urls.length} cited pages: our own live request plus Exa Contents`);
  const pages = await fetchPages(urls);
  for (const url of urls) emit({ type: "source", url, title: titles.get(url) ?? hostOf(url), official: isOfficial(url, j) });

  usage.contents += [...pages.values()].filter((p) => p?.exa).length;
  const readMs = since() - searchMs;

  stage("verify", "Checking every quote, amount and deadline against the page text");
  const evidence: EvidenceInput[] = [];
  const unverified: string[] = [];
  const cite = (url: string, quote: string): number => {
    const existing = evidence.find((e) => e.url === url && (contains(e.quote, quote) || contains(quote, e.quote)));
    if (existing) {
      // Keep the longer wording: it carries more of the fact.
      if (quote.length > existing.quote.length) existing.quote = quote.slice(0, LIMITS.quote);
      return existing.n;
    }
    const n = evidence.length + 1;
    evidence.push({
      n,
      url,
      title: clip(titles.get(url), 200) || hostOf(url),
      publisher: publisherOf(url),
      quote: quote.slice(0, LIMITS.quote),
      pageDate: dates.get(url),
      sourceType: isOfficial(url, j) ? "official" : "secondary",
    });
    return n;
  };

  const steps: CaseInput["steps"] = [];
  const money: CaseInput["money"] = [];

  for (const c of merged) {
    if (steps.length >= LIMITS.steps || evidence.length >= LIMITS.evidence - 2) break;
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
    const refs = new Set([cite(c.url, snapped.quote)]);

    // A deadline or amount is kept only if a sentence on a fetched page states it:
    // first the quote itself, then the cited page, then the other official pages we opened.
    const ground = (value: string, label: string): number | null => {
      if (supportFor(value, snapped.quote, 0.5)) return [...refs][0];
      const onPage = supportFor(value, page.text, 0.55, c.title);
      if (onPage) return cite(c.url, onPage.sentence);
      for (const [url, other] of pages) {
        if (!other || url === c.url || !isOfficial(url, j)) continue;
        const elsewhere = supportFor(value, other.text, 0.7, c.title);
        if (elsewhere) return cite(url, elsewhere.sentence);
      }
      unverified.push(`${c.title}: the ${label} "${value}" is not stated on the pages I opened.`);
      return null;
    };

    let due = c.due;
    if (due) {
      const n = ground(due, "deadline");
      if (n === null) due = undefined;
      else refs.add(n);
    }

    steps.push({ title: c.title, detail: c.detail, due, status: "todo", confidence: c.confidence, evidence: [...refs] });

    if (c.amount && money.length < LIMITS.money) {
      const n = ground(c.amount, "amount");
      if (n !== null) money.push({ label: c.title, amount: c.amount, evidence: [n] });
    }
  }

  if (!steps.length) {
    throw new EngineError("Sources were found, but no claim could be confirmed on the cited pages.", 502);
  }
  const verifyMs = since() - searchMs - readMs;

  const title = clip(head.title, 140) || clip(input.situation, 80);
  const caseInput: CaseInput = {
    title,
    event: key(title).split(" ").slice(0, 4).join("_").slice(0, 60) || "case",
    language: input.language,
    jurisdiction: { country: j.name, region: j.region },
    summary: clip(head.summary, 800) || `Sourced plan for: ${clip(input.situation, 200)}`,
    steps,
    money,
    evidence,
    drafts: [],
    unverified: dedupe(unverified, 10).map((u) => u.slice(0, 300)),
    openQuestions: dedupe(questions, 3).map((q) => q.slice(0, 300)),
  };

  stage("publish", "Building the case file");
  const published = await publishCase(caseInput, origin, pages, {
    ms: since(),
    searches: usage.searches,
    pagesRead: urls.length,
    costDollars: Math.round(usage.costDollars * 1000) / 1000,
    officialDomains: official.length,
    events: trailEvents.slice(0, 20),
  });

  // Chat-ready lines. Only lines whose every citation was confirmed on the page.
  const failed = new Set(published.failed.map((f) => f.n));
  const plan = steps
    .filter((s) => s.evidence.length && s.evidence.every((n) => !failed.has(n)))
    .slice(0, 5)
    .map((s) => {
      const amount = money.find((m) => m.label === s.title)?.amount;
      const fact = s.due ? `: ${s.due}${amount ? ` (${amount})` : ""}` : amount ? `: ${amount}` : "";
      return `${s.title}${fact} ${s.evidence.map((n) => `[${n}]`).join("")}`;
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
    jurisdiction: { country: j.name, region: j.region, officialDomains: official.length },
  };
}
