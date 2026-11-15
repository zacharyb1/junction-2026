/**
 * Finds where other people talk about a household's problem (forum threads, Facebook and Reddit groups, podcasts),
 * so a parent can read what worked for others and ask them, instead of facing it alone.
 *
 * Two Exa searches run at once, one for discussions and groups and one for podcasts and talks. A community is kept
 * only when the line we show from it is on its page.
 */
import Exa from "exa-js";
import { z } from "zod";
import { snapQuote } from "@/lib/engine/ground";
import { resolveJurisdiction } from "@/lib/engine/jurisdiction";
import { EngineError } from "@/lib/engine/research";

export const CommunityInput = z.object({
  question: z.string().trim().min(5).max(300).describe("The problem in plain words, e.g. “my toddler will not sleep”."),
  city: z.string().trim().min(2).max(60).default("Helsinki"),
  country: z.string().trim().min(2).max(60).default("FI"),
});
export type CommunityInput = z.input<typeof CommunityInput>;

export const KINDS = ["Forum", "Facebook group", "Reddit", "Podcast", "Blog", "Video", "Other"] as const;
export type Kind = (typeof KINDS)[number];

export type Community = {
  title: string;
  kind: Kind;
  /** What people there say or ask, as one line from the page. */
  quote: string;
  /** Why it helps with this question, in a few words. */
  why: string;
  url: string;
  site: string;
};

export type CommunitySearch = { question: string; communities: Community[]; dropped: number; costDollars: number; ms: number };

export type ProposedCommunity = { title?: string; kind?: string; quote?: string; why?: string; url?: string };

const siteOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The kind of a community from its address first (facebook.com is a Facebook group whatever the model said). */
export function kindOf(url: string, said?: string): Kind {
  const site = siteOf(url);
  if (/facebook\.com/.test(site)) return "Facebook group";
  if (/reddit\.com/.test(site)) return "Reddit";
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(site)) return "Video";
  if (/spotify\.com|podcasts\.apple\.com|podbean|anchor\.fm|areena\.yle\.fi/.test(site)) return "Podcast";
  if (/vauva\.fi|kaksplus\.fi|suomi24\.fi|forum|keskustelu|palsta/.test(url)) return "Forum";
  return KINDS.find((k) => k.toLowerCase() === said?.trim().toLowerCase()) ?? "Other";
}

/** Keeps a community only when the line shown from it is the page's own wording. */
export function groundCommunity(c: ProposedCommunity, page: string | undefined): Community | null {
  if (!c.title || !c.quote || !c.url || !page) return null;
  const quote = snapQuote(c.quote, page);
  if (!quote) return null;
  return { title: c.title.trim(), kind: kindOf(c.url, c.kind), quote: quote.quote, why: c.why?.trim() ?? "", url: c.url, site: siteOf(c.url) };
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    communities: {
      type: "array",
      description: "Places in the search results where people discuss this problem or share experience of it.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Name of the group, thread, podcast episode or page" },
          kind: { type: "string", description: `One of: ${KINDS.join(", ")}` },
          quote: { type: "string", description: "One line from the page showing what people there say or ask, copied word for word" },
          why: { type: "string", description: "Why it helps with this question, in a few words" },
          url: { type: "string", description: "Exact URL of the page" },
        },
        required: ["title", "kind", "quote", "url"],
      },
    },
  },
  required: ["communities"],
};

type SearchResponse = { results?: { url: string; text?: string | null }[]; output?: { content?: unknown }; costDollars?: { total?: number } };

/** Searches discussions and podcasts about the question at once and keeps the ones their pages back. At most 8. */
export async function findCommunities(raw: CommunityInput): Promise<CommunitySearch> {
  const started = Date.now();
  const input = CommunityInput.parse(raw);
  if (!process.env.EXA_API_KEY) throw new EngineError("EXA_API_KEY is not configured on the server.", 500);
  const j = resolveJurisdiction(input.country, input.city);
  if (!j.code) throw new EngineError(`Unknown country: ${input.country}`, 400);
  const exa = new Exa(process.env.EXA_API_KEY);

  const searches = [
    {
      query: `${input.question}: parents discussing it, forum thread, Facebook group, Reddit, ${input.city} ${j.name}`,
      goal: `Places where parents and families discuss this, ideally in ${input.city} or ${j.name}: forum threads, Facebook groups, Reddit threads, local parent groups. People's own experience first.`,
    },
    {
      query: `${input.question}: podcast episode or talk by experts or parents`,
      goal: "Podcast episodes, radio programmes or talks about this, by experts or by parents who went through it.",
    },
  ];
  let cost = 0;
  let dropped = 0;
  const lists = await Promise.all(
    searches.map(async (s) => {
      try {
        const res = (await exa.search(s.query.slice(0, 300), {
          type: "auto",
          objective: `${s.goal}\nThe question: ${input.question}\nRank pages where people talk about this problem first. Exclude shops and generic articles.`,
          systemPrompt: "Return only pages in the search results. Copy the quote word for word from that page and give its exact URL. Never invent a group, a thread or an episode.",
          outputSchema: OUTPUT_SCHEMA,
          contents: { text: true },
          userLocation: j.code,
        } as never)) as unknown as SearchResponse;
        cost += res.costDollars?.total ?? 0;
        const pages = new Map((res.results ?? []).map((r) => [r.url, r.text ?? ""]));
        const c = res.output?.content;
        const proposed = ((typeof c === "string" ? JSON.parse(c) : c) as { communities?: ProposedCommunity[] } | null)?.communities ?? [];
        const kept: Community[] = [];
        for (const p of proposed) {
          const g = groundCommunity(p, p.url ? pages.get(p.url) : undefined);
          if (!g) dropped++;
          else kept.push(g);
        }
        return kept;
      } catch (error) {
        console.error("community search failed", error instanceof Error ? error.message : error);
        return [];
      }
    }),
  );
  const communities: Community[] = [];
  for (let i = 0; i < 5; i++) for (const list of lists) if (list[i] && !communities.some((c) => c.url === list[i].url)) communities.push(list[i]);
  return { question: input.question, communities: communities.slice(0, 8), dropped, costDollars: Math.round(cost * 1000) / 1000, ms: Date.now() - started };
}
