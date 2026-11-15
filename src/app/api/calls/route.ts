import { z } from "zod";
import { isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { prepareSwarm, swarmConfiguration } from "@/lib/swarm-calls";
import { allow } from "@/lib/rate-limit";

const Input = z.object({ task: z.string().trim().min(3).max(1200) });

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Calls for quotes from the Get it done page: the same swarm as the bot's (src/lib/swarm-calls.ts), reached with the
 * demo's access instead of the server secret, so the page can put a household job to the team's test phones.
 *
 * Only the operator's list in SWARM_CALL_RECIPIENTS is ever called, never a company found on the web; the swarm's
 * hourly limit and one-start guard hold. GET says whether calls are set up; POST proposes and dials nobody.
 */
export function GET(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const { ready, recipients, maxCalls, recorded } = swarmConfiguration();
  return json({ ready, recipients, maxCalls, recorded }, 200);
}

export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = Input.safeParse(await readJson(req, 5_000).catch(() => null));
  if (!parsed.success) return json({ error: "Say what the job is in 3 to 1,200 characters." }, 400);
  if (!allow(req, isAuthorised(req))) return json({ error: "The demo is busy. Please try again in a minute." }, 429);
  const result = await prepareSwarm({ task: parsed.data.task });
  return json(result, result.status === "unavailable" ? 503 : result.status === "proposed" ? 201 : 200);
}
