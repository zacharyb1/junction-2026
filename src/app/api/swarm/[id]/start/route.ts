import { z } from "zod";
import { isAuthorised, readJson } from "@/lib/cases";
import { startSwarm } from "@/lib/swarm-calls";

const Input = z.object({ confirmed: z.literal(true) });

/** Dials every recipient of a confirmed proposal at once. A proposal starts at most once. */
export async function POST(req: Request, ctx: RouteContext<"/api/swarm/[id]/start">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Input.safeParse(await readJson(req, 1_000).catch(() => null));
  if (!parsed.success) return Response.json({ status: "needs_confirmation", error: 'Send {"confirmed": true} after the person said yes.' }, { status: 400 });
  const { id } = await ctx.params;
  const result = await startSwarm(id, true);
  const status = result.status === "not_found" ? 404 : result.status === "unavailable" ? 503 : result.status === "busy" ? 429 : 200;
  return Response.json(result, { status });
}
