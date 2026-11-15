import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { CaseInput, CasePatch } from "@/lib/case";
import { baseUrl, isAuthorised, loadCase, publishCase, recheckCase, updateCase } from "@/lib/cases";
import { findGifts, GiftInput } from "@/lib/engine/gifts";
import { findOpportunities, HouseholdProfile } from "@/lib/engine/opportunities";
import { EngineError, ResearchInput, researchCase } from "@/lib/engine/research";
import { cancelSwarm, getSwarm, prepareSwarm, startSwarm, SwarmInput } from "@/lib/swarm-calls";

export const maxDuration = 300;

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/**
 * MCP server for the agent. Hermes connects here over Streamable HTTP:
 *   mcp_servers.casefile.url = https://<app>/api/mcp
 *   headers.Authorization   = Bearer <CASEFILE_SECRET>
 */
function handlerFor(origin: string) {
  return createMcpHandler((server) => {
    server.registerTool(
      "research_case",
      {
        title: "Research a life event",
        description:
          "Research what a family must do after a life event or an official letter, and get back a finished case file. " +
          "The server searches official sites for the family's country with Exa, opens every cited page again, " +
          "keeps only claims whose quote, amount and deadline are on the page, and publishes the case. " +
          "Returns the case url, up to 5 chat-ready plan lines with citation numbers, how many quotes were verified, " +
          "what could not be verified, and open questions for the family. Typically 10 to 40 seconds. " +
          "Use this first for any life-admin question. Pass the user's own words as `situation`.",
        inputSchema: ResearchInput,
      },
      async (input) => {
        try {
          return text(await researchCase(input, origin));
        } catch (error) {
          const message = error instanceof Error ? error.message : "research failed";
          const hint = error instanceof EngineError && error.status === 502 ? " Tell the user you could not verify this, or retry with more detail." : "";
          return { ...text(`research_case failed: ${message}.${hint}`), isError: true };
        }
      },
    );

    server.registerTool(
      "find_products",
      {
        title: "Find products with prices",
        description:
          "Find products to buy online, gifts included, with prices checked on each shop's own product page. " +
          "Pass `prompt` with what to look for in plain words (\"electric kettle under 40 euros\", \"gift for Sem who likes cars\"), " +
          "or `recipient` with `clues` (one fact each) for a gift. Add `occasion` (YYYY-MM-DD) to have late deliveries marked, " +
          "and `budget` to drop anything dearer. Returns up to 8 products with name, price, the price line quoted from the " +
          "page, delivery, arrival date when the page states days, and the shop URL. Typically 3 to 15 seconds. " +
          "Use this for any request to find, compare, choose or buy a product or a gift.",
        inputSchema: GiftInput,
      },
      async (input) => {
        try {
          return text(await findGifts(input));
        } catch (error) {
          const message = error instanceof Error ? error.message : "product search failed";
          return { ...text(`find_products failed: ${message}. Tell the user you could not find products right now.`), isError: true };
        }
      },
    );

    server.registerTool(
      "find_opportunities",
      {
        title: "Find hidden opportunities for a household",
        description:
          "Find money, support, free tickets, events and discounts a household did not think to look for, from what is " +
          "known about it: `city`, `members` (one line each, with ages), `situation` (what is going on: a lost job, a " +
          "baby on the way, renting) and `interests` (jazz, bouldering). Runs several searches at once and keeps only " +
          "findings whose sentence is on the page it cites. Returns title, value, why it fits, deadline, the quoted " +
          "sentence and the URL. Typically 10 to 30 seconds. Use it when the household changes, or to check in unasked.",
        inputSchema: HouseholdProfile,
      },
      async (input) => {
        try {
          return text(await findOpportunities(input));
        } catch (error) {
          const message = error instanceof Error ? error.message : "opportunity scan failed";
          return { ...text(`find_opportunities failed: ${message}.`), isError: true };
        }
      },
    );

    server.registerTool(
      "case_publish",
      {
        title: "Publish case file",
        description:
          "Create the case file for a life event or task and get its shareable URL. " +
          "Call this once the research is done. Every amount, deadline or rule must point to an evidence item " +
          "whose quote is copied word for word from the page. The server re-fetches each page and checks the quote. " +
          "Returns the url, how many quotes were verified, and which citation numbers failed.",
        inputSchema: CaseInput,
      },
      async (input) => text(await publishCase(input, origin)),
    );

    server.registerTool(
      "case_update",
      {
        title: "Update case file",
        description:
          "Add or change steps, money lines, evidence or drafts on an existing case. " +
          "Use it to fix quotes that failed verification, to attach a draft the user approved, or to mark a step done. " +
          "Items are matched by evidence number, step title, money label or draft title.",
        inputSchema: z.object({ id: z.string().describe("Case id returned by case_publish."), patch: CasePatch }),
      },
      async ({ id, patch }) => {
        const result = await updateCase(id, patch, origin);
        return result ? text(result) : text(`No case with id ${id}.`);
      },
    );

    server.registerTool(
      "case_get",
      {
        title: "Read case file",
        description: "Return the stored case as JSON, including verification status of each source.",
        inputSchema: z.object({ id: z.string() }),
      },
      async ({ id }) => text((await loadCase(id)) ?? `No case with id ${id}.`),
    );

    server.registerTool(
      "case_recheck",
      {
        title: "Re-check sources",
        description:
          "Fetch every cited page of a case again and report citation numbers whose quote is no longer on the page. " +
          "Use it in the daily change watch. An empty `changed` list means nothing changed, so stay silent. " +
          "`unreachable` lists pages that did not open this time. That is not a change: say nothing about them.",
        inputSchema: z.object({ id: z.string() }),
      },
      async ({ id }) => {
        const result = await recheckCase(id);
        return result
          ? text({ id, changed: result.changed, unreachable: result.unreachable, url: `${origin}/c/${id}` })
          : text(`No case with id ${id}.`);
      },
    );

    server.registerTool(
      "prepare_swarm_call",
      {
        title: "Prepare calls to several recipients at once",
        description:
          "Prepare one task to be asked of several people at the same time by phone, so their answers can be compared " +
          "(\"ask the three test shops whether they have it in stock\"). AIDaddy's voice agent makes every call. " +
          "Recipients come only from the operator's list; pass their names in `recipients` or omit it to call everyone. " +
          "Nothing rings yet. Show the returned task, preferences and recipients, say purchases and payments are simulated, " +
          "and wait for a new Yes before start_swarm_call.",
        inputSchema: SwarmInput,
      },
      async (input) => text(await prepareSwarm(input)),
    );

    server.registerTool(
      "start_swarm_call",
      {
        title: "Start a confirmed swarm of calls",
        description:
          "Ring every recipient of a prepared swarm at once. Only after the person confirmed that exact proposal in a new " +
          "message; set `confirmed` to true. A proposal starts at most once: never call this again to retry.",
        inputSchema: z.object({ id: z.string(), confirmed: z.boolean() }),
      },
      async ({ id, confirmed }) => text(await startSwarm(id, confirmed)),
    );

    server.registerTool(
      "get_swarm_call",
      {
        title: "Read a swarm's results",
        description:
          "Progress of a swarm of calls and, when every call ended, each recipient's answer side by side in `comparison`. " +
          "Results come from the calls themselves. Set `transcript` for what was said.",
        inputSchema: z.object({ id: z.string(), transcript: z.boolean().optional() }),
      },
      async ({ id, transcript }) => text(await getSwarm(id, { transcript })),
    );

    server.registerTool(
      "cancel_swarm_call",
      {
        title: "Cancel a swarm of calls",
        description: "Cancel a prepared swarm, or stop the calls of a running one that have not ended. Use when the person says stop.",
        inputSchema: z.object({ id: z.string() }),
      },
      async ({ id }) => text(await cancelSwarm(id)),
    );
  });
}

async function handle(req: Request) {
  if (!isAuthorised(req)) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorised: send Authorization: Bearer <CASEFILE_SECRET>" }, id: null },
      { status: 401 },
    );
  }
  return handlerFor(baseUrl(req))(req);
}

export { handle as GET, handle as POST, handle as DELETE };
