import { mayResearch } from "@/lib/cases";
import { getSwarm } from "@/lib/swarm-calls";

/** A call round's progress and, once every call ended, the answers side by side, for the Get it done page. */
export async function GET(req: Request, ctx: RouteContext<"/api/quote-calls/[id]">) {
  if (!mayResearch(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await getSwarm(id);
  return Response.json(result, { status: result.status === "not_found" ? 404 : 200 });
}
