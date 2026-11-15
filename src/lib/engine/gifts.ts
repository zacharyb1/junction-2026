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
import { isPublicUrl } from "@/lib/verify";

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
  /** The product page's own preview image, as Exa read it. Absent when the page has none. */
  image?: string;
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

/** Enough checked products to offer a real choice (AIDaddy posts up to 6). Below it the search tries again. */
export const ENOUGH_IDEAS = 5;
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

// Words of a line about what delivery or pickup costs, in English, Finnish, Swedish and German.
const SHIPPING = /deliver|shipping|postage|pickup|pick-up|toimitus|nouto|postikulu|frakt|leverans|versand|lieferung/i;

// How a pharmacy page marks a medicine that needs a prescription, in Finnish, Swedish and English.
const PRESCRIPTION = /reseptilääke|vaatii reseptin|reseptivalmiste|receptbelagd|kräver recept|prescription[- ]only|prescription required|requires a prescription/i;

// Path parts of pages that list or write about many products: a guide, a blog, a category, a search.
const NOT_ONE_PRODUCT = /\/(blogs?|news|articles?|guides?|gift-guides?|collections?|categor(y|ies)|catalogue|catalog|sets|select|shopping|search|tag|tags|c|kategoria|tuoteryhma)(\/|$)/i;

/**
 * True when a URL can be the page of one product, so the person lands on the thing itself, not on a gift guide or a
 * shop's category page where the price we checked belongs to just one of many items.
 */
export function productPage(url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname.replace(/\/+$/, "");
  } catch {
    return false;
  }
  // A shop's front page or a language root ("/en") is not a product.
  if (path.split("/").filter(Boolean).length === 0 || /^\/[a-z]{2}(-[a-z]{2})?$/i.test(path)) return false;
  return !NOT_ONE_PRODUCT.test(path);
}

/**
 * Keeps a proposed product only when its URL is one product's page and that page backs the price: the price's
 * figures are on the page, and the quoted sentence is the page's own. A product over the budget is not kept. The
 * delivery sentence is kept only when it is on the page too.
 */
export function groundIdea(
  idea: ProposedIdea,
  page: string | undefined,
  today: string,
  occasion?: string,
  budget?: number,
): GiftIdea | null {
  const { name, price, priceQuote, url } = idea;
  if (!name || !price || !priceQuote || !url || !page || !productPage(url)) return null;
  const value = priceValue(price);
  if (value === null || (budget !== undefined && value > budget)) return null;
  const figures = numbersIn(price);
  const onPage = pageNumbers(page);
  if (!figures.length || !figures.every((f) => onPage.has(f))) return null;
  const quote = snapQuote(priceQuote, page);
  if (!quote || !figures.every((f) => numbersIn(quote.quote).includes(f))) return null;
  // "Pickup 4,90 €" is on the page too, but it is what delivery costs, not what the product costs.
  if (SHIPPING.test(quote.quote)) return null;
  // A prescription-only medicine cannot be bought from the link, so it is never offered.
  if (PRESCRIPTION.test(page)) return null;
  const delivery = idea.delivery ? snapQuote(idea.delivery, page) : null;
  if (delivery && SHIPPING.test(delivery.quote) && figures.every((f) => numbersIn(delivery.quote).includes(f))) return null;

  const out: GiftIdea = { name, why: idea.why ?? "", price, priceQuote: quote.quote, url, shop: shopOf(url) };
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

// ---- Product images ----------------------------------------------------------

/**
 * Images of products the search found, by product URL, so the /chat page can show a picture next to a product link
 * whatever the model wrote. In memory only: a restart forgets them, and the chat then shows the link alone.
 */
// One map per server process. On globalThis because the MCP route and the image route can each load their own copy of
// this module (always in development, after any edit), and they must see the same pictures.
const shared = globalThis as typeof globalThis & { __giftImages?: Map<string, string> };
const IMAGES = (shared.__giftImages ??= new Map<string, string>());
const MAX_IMAGES = 1000;

// A shop's icon or logo stands in for a product photo on many pages. It shows the shop, not the gift.
const NOT_A_PRODUCT = /favicon|mstile|apple-touch|logo|[/_-]icons?[/_.-]|sprite|placeholder|no[-_]?image/i;

/** True for an image that can be a photo of the product, false for a shop's icon or logo. */
export const productPicture = (image: string) => !NOT_A_PRODUCT.test(new URL(image).pathname);

function rememberImage(url: string, image: string) {
  if (!productPicture(image)) return;
  IMAGES.delete(url);
  IMAGES.set(url, image);
  // The oldest entry goes first.
  if (IMAGES.size > MAX_IMAGES) IMAGES.delete(IMAGES.keys().next().value!);
}

/** The image of a product the search found, or undefined for any other URL. */
export const imageFor = (url: string) => IMAGES.get(url);

/** The preview image a page names in its head (`og:image`, then `twitter:image`), as an absolute https URL. */
export function metaImage(html: string, base: string): string | undefined {
  for (const name of ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]) {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i"))?.[0];
    const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      const url = new URL(content.replace(/&amp;/g, "&"), base);
      if (url.protocol === "https:") return url.toString();
    } catch {
      // A broken URL in the page: try the next tag.
    }
  }
  return undefined;
}

/**
 * Reads the product page's own preview image when Exa returned none. Only public addresses, redirects followed by
 * hand so each hop is checked, the first 300 KB only (the head is at the top), 5 seconds in all.
 */
async function pageImage(url: string): Promise<string | undefined> {
  try {
    const signal = AbortSignal.timeout(5000);
    let target = url;
    for (let hop = 0; hop < 5; hop++) {
      if (!(await isPublicUrl(target))) return undefined;
      const res = await fetch(target, {
        signal,
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (compatible; casefile-verifier/1.0)", accept: "text/html" },
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (location) {
        await res.body?.cancel().catch(() => {});
        target = new URL(location, target).toString();
        continue;
      }
      if (!res.ok || !res.body || !/html/.test(res.headers.get("content-type") ?? "")) return undefined;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < 300_000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      await reader.cancel().catch(() => {});
      return metaImage(new TextDecoder().decode(Buffer.concat(chunks)), target);
    }
  } catch {
    // A page that does not answer in time simply has no picture.
  }
  return undefined;
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
  results?: { url: string; text?: string | null; image?: string | null }[];
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
      objective: `${goal}${budget}\nReturn product pages: one product per page, with its price and a way to buy it. Exclude gift guides, blog posts, listicles, category and search pages, and marketplaces of used goods.${skip}`.slice(0, 4000),
      systemPrompt:
        "Return only products whose own product page appears in the search results; each url is the page of that one product, never a list, guide or category page. Copy the price and the price sentence word for word from that page; never estimate, convert or invent a price. Copy the delivery sentence only when the same page states a delivery time.",
      outputSchema: OUTPUT_SCHEMA,
      contents: { text: true },
      userLocation: j.code,
    } as never)) as unknown as SearchResponse;
    cost += res.costDollars?.total ?? 0;

    const pages = new Map((res.results ?? []).map((r) => [r.url, r.text ?? ""]));
    // Only an https image from the same search result: a picture of exactly the page we checked.
    const images = new Map((res.results ?? []).flatMap((r) => (r.image && /^https:\/\//.test(r.image) ? [[r.url, r.image] as const] : [])));
    for (const idea of parse(res.output?.content)?.ideas ?? []) {
      if (idea.url) seen.add(idea.url);
      const kept = groundIdea(idea, idea.url ? pages.get(idea.url) : undefined, today, input.occasion, input.budget);
      if (!kept) dropped++;
      else if (!ideas.some((i) => i.url === kept.url)) {
        const image = images.get(kept.url);
        ideas.push(image ? { ...kept, image } : kept);
      }
    }
    if (ideas.length >= ENOUGH_IDEAS) break;
  }

  // A product without Exa's image gets the one its own page names, read in parallel. Then the chat can show each one.
  await Promise.all(
    ideas.map(async (idea, i) => {
      const exa = idea.image && productPicture(idea.image) ? idea.image : undefined;
      const image = exa ?? (await pageImage(idea.url));
      if (!image || !productPicture(image)) {
        if (idea.image) ideas[i] = { ...idea, image: undefined };
        return;
      }
      ideas[i] = { ...idea, image };
      rememberImage(idea.url, image);
    }),
  );

  // Products that arrive in time come first; the late ones stay visible, marked, so the family sees why.
  ideas.sort((a, b) => Number(Boolean(a.late)) - Number(Boolean(b.late)));
  return {
    recipient: input.recipient,
    // More than 8 is more than anyone reads in a chat.
    ideas: ideas.slice(0, 8),
    dropped,
    attempts,
    costDollars: Math.round(cost * 1000) / 1000,
    ms: Date.now() - started,
  };
}
