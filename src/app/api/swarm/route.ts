import { isAuthorised, readJson } from "@/lib/cases";
import { prepareSwarm, swarmConfiguration, SwarmInput } from "@/lib/swarm-calls";

/**
 * Swarm calls (docs/SWARM_CALLS.md). These ring real phones, so every route needs the server secret:
 * only the bot runtime and the operator may use them.
 * GET reports whether swarms are set up; POST prepares a proposal that dials nobody yet.
 */
export function GET(req: Request) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  return Response.json(swarmConfiguration());
}

export async function POST(req: Request) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = SwarmInput.safeParse(await readJson(req, 20_000).catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const result = await prepareSwarm(parsed.data);
  return Response.json(result, { status: result.status === "unavailable" ? 503 : result.status === "proposed" ? 201 : 200 });
}
