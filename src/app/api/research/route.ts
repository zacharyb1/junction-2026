import { baseUrl, isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { EngineError, type EngineEvent, ResearchInput, researchCase } from "@/lib/engine/research";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 300;

const json = (body: unknown, status: number) => Response.json(body, { status });

/** The engine's own errors are written for the caller. Anything else can name files or services, so it stays in the log. */
function failure(error: unknown): { message: string; status: number } {
  if (error instanceof EngineError) return { message: error.message, status: error.status };
  console.error("research failed", error);
  return { message: "research failed", status: 500 };
}

/**
 * Run the research engine. Same operation as the `research_case` MCP tool.
 * Send `Accept: text/event-stream` to watch the stages live (used by /try).
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const trusted = isAuthorised(req);

  const parsed = ResearchInput.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return json({ error: "invalid input", issues: parsed.error.issues }, 400);
  // A request that fails validation costs nothing, so only valid ones count against the limit.
  if (!allow(req, trusted)) return json({ error: "The demo is busy. Please try again in a minute." }, 429);
  // Deep research costs several times more. The public demo code buys the fast mode and the Exa Agent mode,
  // which costs about the same as the fast one and only takes longer.
  if (!trusted && parsed.data.depth === "deep") parsed.data.depth = "fast";
  const origin = baseUrl(req);

  if (!(req.headers.get("accept") ?? "").includes("text/event-stream")) {
    try {
      return json(await researchCase(parsed.data, origin), 200);
    } catch (error) {
      const { message, status } = failure(error);
      return json({ error: message }, status);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")}\n\n`,
          ),
        );
      try {
        const result = await researchCase(parsed.data, origin, (e: EngineEvent) => send(e.type, e));
        send("done", result);
      } catch (error) {
        send("error", { error: failure(error).message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
