import { isAuthorised } from "@/lib/cases";
import { getSwarm } from "@/lib/swarm-calls";

/** A swarm's progress and, once every call ended, the answers side by side. `?transcript=1` adds what was said. */
export async function GET(req: Request, ctx: RouteContext<"/api/swarm/[id]">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await getSwarm(id, { transcript: new URL(req.url).searchParams.get("transcript") === "1" });
  return Response.json(result, { status: result.status === "not_found" ? 404 : 200 });
}
