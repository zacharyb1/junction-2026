/**
 * Finds local companies that can do a household job (a leaking tap, a babysitter, a move), so a busy family gets a
 * shortlist to call instead of an evening of searching.
 *
 * One Exa search with a structured output names the companies, their phone numbers and any price they list. A
 * company is kept only when its name is on the page it cites; a price is kept only when its line is on that page.
 */
import Exa from "exa-js";
import { z } from "zod";
import { pageNumbers, snapQuote } from "@/lib/engine/ground";
import { resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { EngineError } from "@/lib/engine/research";
import { includesWhole, numbersIn } from "@/lib/text";

export const HelperInput = z.object({
  job: z.string().trim().min(5).max(300).describe("The job in plain words, e.g. “kitchen tap is leaking”."),
  city: z.string().trim().min(2).max(60).default("Helsinki"),
  country: z.string().trim().min(2).max(60).default("FI"),
});
export type HelperInput = z.input<typeof HelperInput>;

export type Helper = {
  name: string;
  service: string;
  /** The phone number as the page writes it. Empty when the page gives none. */
  phone: string;
  /** A price the company lists, as the page writes it ("call-out €49, then €65/h"). Empty when none. */
  price: string;
  /** The page's own line with that price. Empty when there is no price. */
  priceQuote: string;
  url: string;
  site: string;
};

export type HelperSearch = { job: string; city: string; helpers: Helper[]; dropped: number; costDollars: number; ms: number };

export type ProposedHelper = { name?: string; service?: string; phone?: string; price?: string; priceQuote?: string; url?: string };

const siteOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** A phone number the page really shows: its digits, without spaces, are on the page. */
function phoneOnPage(phone: string, page: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 6 && page.replace(/[\s()-]/g, "").includes(digits.replace(/^\+358/, "0").slice(-7));
}

/**
 * Keeps a company only when its page names it; keeps its phone and price only when the page shows them. What we show
 * is the page's wording, not the model's.
 */
export function groundHelper(h: ProposedHelper, page: string | undefined): Helper | null {
  if (!h.name || !h.url || !page) return null;
  const name = h.name.trim();
  if (!includesWhole(page, name.split(/\s+/)[0])) return null;
  let price = "";
  let priceQuote = "";
  if (h.price && h.priceQuote) {
    const quote = snapQuote(h.priceQuote, page);
    const figures = numbersIn(h.price);
    const onPage = pageNumbers(page);
    if (quote && figures.length && figures.every((f) => onPage.has(f) && numbersIn(quote.quote).includes(f))) {
      price = h.price.trim();
      priceQuote = quote.quote;
    }
  }
  const phone = h.phone && phoneOnPage(h.phone, page) ? h.phone.trim() : "";
  return { name, service: h.service?.trim() ?? "", phone, price, priceQuote, url: h.url, site: siteOf(h.url) };
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    helpers: {
      type: "array",
      description: "Local companies or professionals from the search results that do this job.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Company or professional name as the page writes it" },
          service: { type: "string", description: "What they do, in a few words" },
          phone: { type: "string", description: "Phone number exactly as the page writes it. Empty if none." },
          price: { type: "string", description: "A price they list for this kind of job, exactly as written. Empty if none." },
          priceQuote: { type: "string", description: "The line on the page with that price, copied word for word. Empty if none." },
          url: { type: "string", description: "Exact URL of the company's page the details come from" },
        },
        required: ["name", "service", "url"],
      },
    },
  },
  required: ["helpers"],
};

type SearchResponse = { results?: { url: string; text?: string | null }[]; output?: { content?: unknown }; costDollars?: { total?: number } };

/** Searches for local companies that do the job, and keeps the ones their own pages back. At most 5. */
export async function findHelpers(raw: HelperInput): Promise<HelperSearch> {
  const started = Date.now();
  const input = HelperInput.parse(raw);
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);
  const j = resolveJurisdiction(input.country, input.city);
  if (!j.code) throw new EngineError(`Unknown country: ${input.country}`, 400);
  const exa = new Exa(process.env.EXA_API_KEY);
  const res = (await exa.search(`${input.job}: local company in ${input.city} to call, prices and phone number`.slice(0, 300), {
    type: "auto",
    objective: `A household in ${input.city}, ${j.name} needs this done: ${input.job}. Find local companies or professionals in ${input.city} who do it, with their own pages: name, phone number, and any price they list (call-out fee, hourly rate, fixed price). Rank each company's own page first; exclude directories, marketplaces and articles.`,
    systemPrompt:
      "Return only companies whose own page appears in the search results. Copy names, phone numbers and prices exactly as that page writes them; never invent or estimate them. Leave phone and price empty when the page has none.",
    outputSchema: OUTPUT_SCHEMA,
    contents: { text: true },
    userLocation: j.code,
  } as never)) as unknown as SearchResponse;

  const pages = new Map((res.results ?? []).map((r) => [r.url, r.text ?? ""]));
  const proposed = ((): ProposedHelper[] => {
    const c = res.output?.content;
    try {
      const o = (typeof c === "string" ? JSON.parse(c) : c) as { helpers?: ProposedHelper[] } | null;
      return o?.helpers ?? [];
    } catch {
      return [];
    }
  })();
  const helpers: Helper[] = [];
  let dropped = 0;
  for (const h of proposed) {
    const kept = groundHelper(h, h.url ? pages.get(h.url) : undefined);
    if (!kept || helpers.some((x) => x.site === kept.site)) dropped++;
    else if (helpers.length < 5) helpers.push(kept);
  }
  return { job: input.job, city: input.city, helpers, dropped, costDollars: Math.round((res.costDollars?.total ?? 0) * 1000) / 1000, ms: Date.now() - started };
}
