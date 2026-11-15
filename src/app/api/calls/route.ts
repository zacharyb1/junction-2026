import { mayResearch, readJson } from "@/lib/cases";
import { DemoCallInput, prepareDemoCall, webCallsAvailable } from "@/lib/demo-calls";
import { allow } from "@/lib/rate-limit";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * The web page's first step: write down what AIDaddy would say on the call. Nothing rings yet.
 * The visitor reads the proposal and starts it with POST /api/calls/<id>/start.
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  if (!allow(req, false)) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  if (!webCallsAvailable()) return json({ error: "Calls are switched off on this server." }, 503);
  const parsed = DemoCallInput.safeParse(await readJson(req, 10_000).catch(() => null));
  if (!parsed.success) return json({ error: "Describe the call in 3 to 1,200 characters. Preferences take up to 800." }, 400);
  // `next` is advice for the chat model; the page has its own words, so it is left out of the answer.
  return json({ ...(await prepareDemoCall(parsed.data)), next: undefined });
}
