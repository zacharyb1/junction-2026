/**
 * Finds gifts someone can buy online, from what we know about the person, so the family gets real products with
 * prices instead of generic ideas (issue 30).
 *
 * One Exa search with a structured output names the products, prices, shops and delivery wording. Every product is
 * then checked against the text of its own shop page: a product whose price is not on that page is dropped, and a
 * delivery time counts only when the page states it. Arrival dates are worked out here from the page's own wording,
 * never by the model, so "too late for the birthday" is our arithmetic on a quoted sentence.
 */
import Exa from "exa-js";
import { z } from "zod";
import { pageNumbers, snapQuote } from "@/lib/engine/ground";
import { resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { EngineError } from "@/lib/engine/research";
import { numbersIn } from "@/lib/text";

export const GiftInput = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .optional()
      .describe("What to look for, in plain words, e.g. “climbing chalk bag under 40 euros”. Use it or `clues`."),
    recipient: z.string().trim().min(1).max(60).optional().describe("Who the gift is for, e.g. Mikko."),
    clues: z
      .array(z.string().trim().min(3).max(200))
      .min(1)
      .max(8)
      .optional()
      .describe("What we know about them, one fact per item, e.g. “his chalk bag ripped”, “goes bouldering”."),
  occasion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Date of the birthday or event, YYYY-MM-DD. Products that arrive later are marked late."),
  country: z.string().trim().min(2).max(60).default("FI").describe("Where it is delivered: ISO code or English name."),
  budget: z.number().positive().max(10_000).optional().describe("Highest price in the local currency."),
  })
  .refine((v) => v.prompt || v.clues?.length, { message: "Send `prompt` or `clues`.", path: ["prompt"] });
export type GiftInput = z.input<typeof GiftInput>;

export type GiftIdea = {
  name: string;
  why: string;
  /** The price exactly as the shop page writes it. */
  price: string;
  /** The sentence on the shop page that states the price. */
  priceQuote: string;
  url: string;
  shop: string;
  /** The page's own sentence about delivery, when it has one. */
  delivery?: string;
  /** Latest arrival worked out from `delivery`, YYYY-MM-DD. */
  arrivesBy?: string;
  /** True when `arrivesBy` falls after the occasion. Absent when either date is unknown. */
  late?: boolean;
};

export type GiftResult = {
  /** Absent for a prompt-only search. */
  recipient?: string;
  ideas: GiftIdea[];
  /** Products the search proposed whose own page did not back them, over all attempts. */
  dropped: number;
  /** Exa searches it took to reach enough products, at most MAX_ATTEMPTS. */
  attempts: number;
  costDollars: number;
  ms: number;
};

/** Enough checked products to offer a real choice. Below it the search tries again. */
export const ENOUGH_IDEAS = 3;
export const MAX_ATTEMPTS = 3;

// ---- Delivery dates ----------------------------------------------------------

const DAY_WORDS = /\b(working|business|arki)?\s*(days?|päivä\w*|päiv\w*|arkipäivä\w*|dagar|vardagar|tage|werktage)\b/i;
const WORKING = /working|business|arki|vardag|werktag/i;
// "30 days to return" is not a delivery time. The sentence has to be about delivery.
const ABOUT_DELIVERY = /deliver|\bship|dispatch|arriv|\bsen[dt]\b|toimit|postitet|lähetet|leverans|levereras|liefer|versand/i;

/**
 * The longest delivery time a sentence states, in days: "Delivery in 2–4 working days" is 4 working days.
 * Null when the sentence names no number of days or is not about delivery.
 */
export function deliveryDays(sentence: string): { days: number; working: boolean } | null {
  if (!ABOUT_DELIVERY.test(sentence)) return null;
  const match = sentence.match(new RegExp(`(\\d{1,2})(?:\\s*[-–]\\s*(\\d{1,2}))?\\s*${DAY_WORDS.source}`, "i"));
  if (!match) return null;
  const days = Number(match[2] ?? match[1]);
  if (!days || days > 60) return null;
  return { days, working: WORKING.test(match[0]) };
}

/** `from` plus `days`, skipping Saturdays and Sundays when they are working days. Dates are YYYY-MM-DD in UTC. */
export function addDays(from: string, days: number, working: boolean): string {
  const date = new Date(`${from}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (!working || (weekday !== 0 && weekday !== 6)) left--;
  }
  return date.toISOString().slice(0, 10);
}

// ---- Grounding ---------------------------------------------------------------

export type ProposedIdea = { name?: string; why?: string; price?: string; priceQuote?: string; delivery?: string; url?: string };

const shopOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The amount a price states: "1 234,50 €" is 1234.5. Null when it has no figure. */
export function priceValue(price: string): number | null {
  const match = price.match(/\d{1,3}(?:[  ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/);
  if (!match) return null;
  const value = Number(match[0].replace(/[  ]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/**
 * Keeps a proposed product only when its own page backs the price: the price's figures are on the page, and the
 * quoted sentence is the page's own. A product over the budget is not kept. The delivery sentence is kept only when
 * it is on the page too.
 */
export function groundIdea(
  idea: ProposedIdea,
  page: string | undefined,
  today: string,
  occasion?: string,
  budget?: number,
): GiftIdea | null {
  const { name, price, priceQuote, url } = idea;
  if (!name || !price || !priceQuote || !url || !page) return null;
  const value = priceValue(price);
  if (value === null || (budget !== undefined && value > budget)) return null;
  const figures = numbersIn(price);
  const onPage = pageNumbers(page);
  if (!figures.length || !figures.every((f) => onPage.has(f))) return null;
  const quote = snapQuote(priceQuote, page);
  if (!quote || !figures.every((f) => numbersIn(quote.quote).includes(f))) return null;

  const out: GiftIdea = { name, why: idea.why ?? "", price, priceQuote: quote.quote, url, shop: shopOf(url) };
  const delivery = idea.delivery ? snapQuote(idea.delivery, page) : null;
  if (delivery) {
    out.delivery = delivery.quote;
    const span = deliveryDays(delivery.quote);
    if (span) {
      out.arrivesBy = addDays(today, span.days, span.working);
      if (occasion) out.late = out.arrivesBy > occasion;
    }
  }
  return out;
}

// ---- Search ------------------------------------------------------------------

// Eight properties, nesting depth two: inside Exa's limits for structured search output.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      description: "Products from the search results that can be bought online and suit the person.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name as the shop writes it" },
          why: { type: "string", description: "Which part of the request or which clue about the person this product answers, in a few words" },
          price: { type: "string", description: "Price exactly as written on the product page, with its currency" },
          priceQuote: { type: "string", description: "The sentence or line on the product page that states the price, copied word for word" },
          delivery: { type: "string", description: "The page's sentence about delivery time, copied word for word. Empty if the page has none." },
          url: { type: "string", description: "Exact URL of the product page" },
        },
        required: ["name", "why", "price", "priceQuote", "url"],
      },
    },
  },
  required: ["ideas"],
};

type SearchResponse = {
  results?: { url: string; text?: string | null }[];
  output?: { content?: unknown };
  costDollars?: { total?: number };
};

const parse = (content: unknown): { ideas?: ProposedIdea[] } | null => {
  if (content && typeof content === "object") return content as { ideas?: ProposedIdea[] };
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content) as { ideas?: ProposedIdea[] };
  } catch {
    return null;
  }
};

/**
 * The query for each attempt, so a retry asks differently instead of repeating a search that came back thin.
 * A prompt is asked as written, then as a shop search, then for product pages with a price. Clues are asked all
 * together first, then one at a time.
 */
export function giftQueries(input: { prompt?: string; clues?: string[] }, country: string): string[] {
  const queries = input.prompt
    ? [input.prompt, `buy online in ${country}: ${input.prompt}`, `${input.prompt}, product page with price, ${country} shop`]
    : [
        `gift ideas to buy online in ${country}: ${(input.clues ?? []).join(", ")}`,
        ...(input.clues ?? []).map((c) => `buy online in ${country}, product for someone who ${c}`),
      ];
  return queries.slice(0, MAX_ATTEMPTS).map((q) => q.slice(0, 300));
}

/** Searches shops with Exa until enough products have a price their own page backs, at most MAX_ATTEMPTS times. */
export async function findGifts(raw: GiftInput, today = new Date().toISOString().slice(0, 10)): Promise<GiftResult> {
  const started = Date.now();
  const input = GiftInput.parse(raw);
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);
  const j = resolveJurisdiction(input.country);
  if (!j.code) throw new EngineError(`Unknown country: ${input.country}`, 400);

  const who = input.recipient ?? "the person";
  // What the search is for: the prompt as written, or the person and what we know about them.
  const goal = input.prompt
    ? `Find product pages in online shops that deliver to ${j.name} for: ${input.prompt}`
    : `Find product pages in online shops that deliver to ${j.name}, for a gift to ${who}.\nWhat we know about ${who}:\n${(input.clues ?? []).map((c) => `- ${c}`).join("\n")}`;
  const budget = input.budget ? `\nPrice at most ${input.budget}.` : "";
  const exa = new Exa(process.env.EXA_API_KEY);
  const ideas: GiftIdea[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  let cost = 0;
  let attempts = 0;

  for (const query of giftQueries(input, j.name)) {
    attempts++;
    // A retry is told which pages it already returned, so it looks further instead of repeating them.
    const skip = seen.size ? `\nDo not return these pages again:\n${[...seen].slice(0, 20).join("\n")}` : "";
    const res = (await exa.search(query, {
      type: "auto",
      objective: `${goal}${budget}\nRank pages where one product can be bought, with its price on the page, first. Exclude blog posts, listicles and marketplaces of used goods.${skip}`.slice(0, 4000),
      systemPrompt:
        "Return only products whose own page appears in the search results. Copy the price and the price sentence word for word from that page; never estimate, convert or invent a price. Copy the delivery sentence only when the same page states a delivery time.",
      outputSchema: OUTPUT_SCHEMA,
      contents: { text: true },
      userLocation: j.code,
    } as never)) as unknown as SearchResponse;
    cost += res.costDollars?.total ?? 0;

    const pages = new Map((res.results ?? []).map((r) => [r.url, r.text ?? ""]));
    for (const idea of parse(res.output?.content)?.ideas ?? []) {
      if (idea.url) seen.add(idea.url);
      const kept = groundIdea(idea, idea.url ? pages.get(idea.url) : undefined, today, input.occasion, input.budget);
      if (!kept) dropped++;
      else if (!ideas.some((i) => i.url === kept.url)) ideas.push(kept);
    }
    if (ideas.length >= ENOUGH_IDEAS) break;
  }

  // Products that arrive in time come first; the late ones stay visible, marked, so the family sees why.
  ideas.sort((a, b) => Number(Boolean(a.late)) - Number(Boolean(b.late)));
  return {
    recipient: input.recipient,
    ideas,
    dropped,
    attempts,
    costDollars: Math.round(cost * 1000) / 1000,
    ms: Date.now() - started,
  };
}
