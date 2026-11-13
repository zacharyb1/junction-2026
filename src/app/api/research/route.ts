import { baseUrl, isAuthorised, mayResearch } from "@/lib/cases";
import { EngineError, type EngineEvent, ResearchInput, researchCase } from "@/lib/engine/research";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 300;

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Run the research engine. Same operation as the `research_case` MCP tool.
 * Send `Accept: text/event-stream` to watch the stages live (used by /try).
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  if (!allow(req, isAuthorised(req))) return json({ error: "rate limited, try again in a minute" }, 429);

  const parsed = ResearchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid input", issues: parsed.error.issues }, 400);
  const origin = baseUrl(req);

  if (!(req.headers.get("accept") ?? "").includes("text/event-stream")) {
    try {
      return json(await researchCase(parsed.data, origin), 200);
    } catch (error) {
      const status = error instanceof EngineError ? error.status : 500;
      return json({ error: error instanceof Error ? error.message : "research failed" }, status);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const result = await researchCase(parsed.data, origin, (e: EngineEvent) => send(e.type, e));
        send("done", result);
      } catch (error) {
        send("error", { error: error instanceof Error ? error.message : "research failed" });
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
