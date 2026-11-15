/**
 * Finds hidden opportunities for a household: money, support, free tickets and events it never thought to look for,
 * from what we know about it (where it lives, who is in it, work, interests), so the family is told before it asks.
 *
 * The profile becomes several searches at once, one per "lens" (interests, situation, children, money people miss).
 * Each Exa search proposes opportunities with a sentence from their page; an opportunity is kept only when that
 * sentence is really on the page it cites, the same rule plans and products follow.
 */
import Exa from "exa-js";
import { z } from "zod";
import { pageNumbers, snapQuote } from "@/lib/engine/ground";
import { resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { EngineError } from "@/lib/engine/research";
import { numbersIn } from "@/lib/text";

export const HouseholdProfile = z.object({
  city: z.string().trim().min(2).max(60).describe("Where the household lives, e.g. Helsinki."),
  country: z.string().trim().min(2).max(60).default("FI").describe("ISO code or English name."),
  members: z
    .array(z.string().trim().min(2).max(80))
    .max(10)
    .default([])
    .describe("One line per person, e.g. “Anna, 34, works in IT”, “Sem, 6”."),
  situation: z
    .array(z.string().trim().min(2).max(120))
    .max(10)
    .default([])
    .describe("What is going on now, e.g. “Mikko lost his job”, “renting”, “baby due in May”."),
  interests: z.array(z.string().trim().min(2).max(60)).max(12).default([]).describe("e.g. “jazz”, “bouldering”, “board games”."),
});
export type HouseholdProfile = z.input<typeof HouseholdProfile>;

export type Opportunity = {
  title: string;
  /** What it is worth or costs, as the page writes it: "€400", "free", "50 % off". */
  value: string;
  /** Why this household: which fact about it this answers. */
  why: string;
  /** A date it must be used or applied by, as the page writes it. Empty when none. */
  deadline: string;
  /** The page's own sentence that states the opportunity. */
  quote: string;
  url: string;
  source: string;
  /** Which search found it: interests, situation, children or money. */
  lens: Lens["name"];
};

export type OpportunityScan = { opportunities: Opportunity[]; searches: number; dropped: number; costDollars: number; ms: number };

// ---- Lenses ------------------------------------------------------------------

export type Lens = { name: "interests" | "situation" | "children" | "money"; query: string; goal: string };

const CHILD = /\b(\d{1,2})\b/;

/**
 * The searches a profile asks for, so the family hears about things it was not looking for: one per interest group,
 * one for the household's situation, one for children when there are any, and one for money people often miss.
 */
export function lensesFor(raw: HouseholdProfile): Lens[] {
  const p = HouseholdProfile.parse(raw);
  const where = p.city;
  const lenses: Lens[] = [];
  if (p.interests.length) {
    lenses.push({
      name: "interests",
      query: `free or discounted ${p.interests.slice(0, 4).join(", ")} events, tickets and offers in ${where} this month`,
      goal: `Events, free tickets, discounts and offers in ${where} for people who like ${p.interests.join(", ")}, happening soon.`,
    });
  }
  if (p.situation.length) {
    lenses.push({
      name: "situation",
      query: `${p.situation.slice(0, 3).join(", ")}: benefits, allowances and support you can apply for in ${where}`,
      goal: `Money, benefits, allowances, services and support a household in ${where} is entitled to because: ${p.situation.join("; ")}. Official sources first.`,
    });
  }
  const kids = p.members.filter((m) => Number(m.match(CHILD)?.[1] ?? 99) < 18);
  if (kids.length) {
    lenses.push({
      name: "children",
      query: `free activities, hobby vouchers and support for children (${kids.join(", ")}) in ${where}`,
      goal: `Free or subsidised activities, hobby vouchers, camps and family support in ${where} for children: ${kids.join("; ")}.`,
    });
  }
  lenses.push({
    name: "money",
    query: `refunds, compensations, deductions and grants households in ${where} often miss`,
    goal: `Money that households in ${where} are often entitled to but do not claim: refunds, compensations, tax deductions, grants. Official sources first.`,
  });
  return lenses;
}

// ---- Grounding ---------------------------------------------------------------

export type ProposedOpportunity = { title?: string; value?: string; why?: string; deadline?: string; quote?: string; url?: string };

/** The model writes `""`, "Empty" or "none" for a field the page does not fill. Those are no value at all. */
export const blank = (value: string | undefined) => {
  const v = (value ?? "").trim();
  return /^("{2}|'{2}|empty|none|n\/?a|null|-|—)$/i.test(v) ? "" : v;
};

const sourceOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Keeps an opportunity only when its page backs it: the quoted sentence is the page's own, and every figure in its
 * value ("€400", "50 %") is on that page. What we show is the page's wording, not the model's.
 */
export function groundOpportunity(o: ProposedOpportunity, page: string | undefined, lens: Lens["name"]): Opportunity | null {
  if (!o.title || !o.quote || !o.url || !page) return null;
  const quote = snapQuote(o.quote, page);
  if (!quote) return null;
  const value = blank(o.value);
  const onPage = pageNumbers(page);
  if (!numbersIn(value).every((n) => onPage.has(n))) return null;
  return {
    title: o.title.trim(),
    value,
    why: blank(o.why),
    deadline: blank(o.deadline),
    quote: quote.quote,
    url: o.url,
    source: sourceOf(o.url),
    lens,
  };
}

// ---- Search ------------------------------------------------------------------

// Seven properties, nesting depth two: inside Exa's limits for structured search output.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      description: "Concrete opportunities from the search results that this household can use now.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "What it is, in a few words, e.g. “Free jazz concert at Savoy, 22 Nov”" },
          value: { type: "string", description: "What it is worth or costs, exactly as the page writes it (“€400”, “free”). Empty if the page gives none." },
          why: { type: "string", description: "Which fact about the household this answers, in a few words" },
          deadline: { type: "string", description: "Date to apply or use it by, exactly as the page writes it. Empty if none." },
          quote: { type: "string", description: "The sentence on the page that states the opportunity, copied word for word" },
          url: { type: "string", description: "Exact URL of the page the quote was copied from" },
        },
        required: ["title", "why", "quote", "url"],
      },
    },
  },
  required: ["opportunities"],
};

type SearchResponse = { results?: { url: string; text?: string | null }[]; output?: { content?: unknown }; costDollars?: { total?: number } };

const parse = (content: unknown): { opportunities?: ProposedOpportunity[] } | null => {
  if (content && typeof content === "object") return content as { opportunities?: ProposedOpportunity[] };
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content) as { opportunities?: ProposedOpportunity[] };
  } catch {
    return null;
  }
};

/** Runs every lens of the profile at once and returns the opportunities their own pages back, at most 4 per lens. */
export async function findOpportunities(raw: HouseholdProfile): Promise<OpportunityScan> {
  const started = Date.now();
  const profile = HouseholdProfile.parse(raw);
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);
  const j = resolveJurisdiction(profile.country, profile.city);
  if (!j.code) throw new EngineError(`Unknown country: ${profile.country}`, 400);
  const exa = new Exa(process.env.EXA_API_KEY);
  const about = [
    `Lives in ${profile.city}, ${j.name}.`,
    profile.members.length ? `Household: ${profile.members.join("; ")}.` : "",
    profile.situation.length ? `Now: ${profile.situation.join("; ")}.` : "",
    profile.interests.length ? `Likes: ${profile.interests.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lenses = lensesFor(profile);
  let cost = 0;
  let dropped = 0;
  const found = await Promise.all(
    lenses.map(async (lens) => {
      try {
        const res = (await exa.search(lens.query.slice(0, 300), {
          type: "auto",
          objective: `${lens.goal}\nThe household:\n${about}\nRank pages that state one concrete opportunity (a benefit, a grant, a free ticket, an event, a discount) with its terms first. Exclude generic advice and listicles.`.slice(0, 4000),
          systemPrompt:
            "Return only opportunities stated on a page in the search results. Copy the quote word for word from that page and give that page's exact URL. Copy value and deadline exactly as the same page writes them; never estimate or invent them. Prefer things this household would not have thought to look for.",
          outputSchema: OUTPUT_SCHEMA,
          contents: { text: true },
          userLocation: j.code,
        } as never)) as unknown as SearchResponse;
        cost += res.costDollars?.total ?? 0;
        const pages = new Map((res.results ?? []).map((r) => [r.url, r.text ?? ""]));
        const kept: Opportunity[] = [];
        for (const o of parse(res.output?.content)?.opportunities ?? []) {
          const g = groundOpportunity(o, o.url ? pages.get(o.url) : undefined, lens.name);
          if (!g) dropped++;
          else if (kept.length < 4) kept.push(g);
        }
        return kept;
      } catch (error) {
        // One lens failing leaves the others standing.
        console.error("opportunity lens failed", lens.name, error instanceof Error ? error.message : error);
        return [];
      }
    }),
  );

  // Interleave the lenses so the list opens with one finding of each kind, and drop the same page found twice.
  const opportunities: Opportunity[] = [];
  for (let i = 0; i < 4; i++) {
    for (const list of found) {
      const o = list[i];
      if (o && !opportunities.some((x) => x.url === o.url)) opportunities.push(o);
    }
  }
  return { opportunities, searches: lenses.length, dropped, costDollars: Math.round(cost * 1000) / 1000, ms: Date.now() - started };
}
