import { isAuthorised } from "@/lib/cases";
import { cancelSwarm } from "@/lib/swarm-calls";

/** Stops a proposal, or the calls of a running swarm that have not ended yet. */
export async function POST(req: Request, ctx: RouteContext<"/api/swarm/[id]/cancel">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await cancelSwarm(id);
  return Response.json(result, { status: result.status === "not_found" ? 404 : 200 });
}
