import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { CaseInput, CasePatch } from "@/lib/case";
import { baseUrl, isAuthorised, loadCase, publishCase, recheckCase, updateCase } from "@/lib/cases";
import { findGifts, GiftInput } from "@/lib/engine/gifts";
import { EngineError, ResearchInput, researchCase } from "@/lib/engine/research";
import { DemoCallInput, getDemoCall, prepareDemoCall, startDemoCall } from "@/lib/demo-calls";

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
      "prepare_demo_call",
      {
        title: "Prepare a demo phone call",
        description: "Prepare a real voice call that AIDaddy makes for the person to the operator's configured test recipient, for any everyday task or important update. " +
          "Purchases, bookings and payments are role-play. Pass relevant preferences from this chat's memory or conversation. " +
          "This does not dial. Show the returned proposal and wait for the person's next reply confirming it; do not start in the same turn. " +
          "If unavailable, report the missing configuration instead of pretending to call.",
        inputSchema: DemoCallInput,
      },
      async (input) => text(await prepareDemoCall(input)),
    );
    server.registerTool(
      "start_demo_call",
      {
        title: "Start the confirmed demo call",
        description: "Use only after the person has replied Yes to the exact prepare_demo_call proposal in a subsequent turn. " +
          "An initial request to call is not confirmation. For changes, prepare and confirm a new proposal. " +
          "Dials only the configured test phone; purchases/payments remain simulated. Never retry an unknown result with a new proposal. " +
          "Where no phone number is set up the result is `ringing` with an answerUrl: the test line rings in a browser. " +
          "Post that link and say that whoever opens it and taps Answer talks to AIDaddy.",
        inputSchema: z.object({ id: z.string(), confirmed: z.boolean().describe("True only after the person confirmed this exact proposal in their next reply.") }),
      },
      async ({ id, confirmed }) => text(await startDemoCall(id, confirmed, origin)),
    );
    server.registerTool(
      "get_demo_call",
      {
        title: "Read a demo call result",
        description: "Read the real calling provider's status and conversation summary. After starting, acknowledge dialing then call this with wait_seconds=60. " +
          "Report finished only when returned; always explain that any purchase or payment was simulated. If still ringing or in progress, offer to check again.",
        inputSchema: z.object({ id: z.string(), wait_seconds: z.number().int().min(0).max(60).default(0) }),
      },
      async ({ id, wait_seconds }) => {
        const until = Date.now() + wait_seconds * 1000;
        let result = await getDemoCall(id);
        while ((result.status === "in_progress" || result.status === "ringing") && Date.now() + 3000 < until) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          result = await getDemoCall(id);
        }
        return text(result);
      },
    );
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
