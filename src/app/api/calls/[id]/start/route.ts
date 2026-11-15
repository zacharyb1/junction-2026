import { z } from "zod";
import { baseUrl, mayResearch, readJson } from "@/lib/cases";
import { startDemoCall, webCallsAvailable } from "@/lib/demo-calls";
import { allow } from "@/lib/rate-limit";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const Input = z.object({ confirmed: z.literal(true) });

/** The approval button on the web page: the person read this exact proposal and pressed "Call". */
export async function POST(req: Request, { params }: RouteContext<"/api/calls/[id]/start">) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  if (!allow(req, false)) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  if (!webCallsAvailable()) return json({ error: "Calls are switched off on this server." }, 503);
  if (!Input.safeParse(await readJson(req, 1_000).catch(() => null)).success) return json({ error: "Confirm the call to start it." }, 400);
  const result = await startDemoCall((await params).id, true, baseUrl(req));
  // `next` is advice for the chat model; the page has its own words, so it is left out of the answer.
  return json({ ...result, next: undefined }, result.status === "not_found" ? 404 : 200);
}
