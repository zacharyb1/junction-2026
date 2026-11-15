import { z } from "zod";
import { isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";
import { startSwarm } from "@/lib/swarm-calls";

const Input = z.object({ confirmed: z.literal(true) });

/** Rings every test phone of a proposal the person confirmed on the page. A proposal starts at most once. */
export async function POST(req: Request, ctx: RouteContext<"/api/calls/[id]/start">) {
  if (!mayResearch(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Input.safeParse(await readJson(req, 1_000).catch(() => null));
  if (!parsed.success) return Response.json({ status: "needs_confirmation" }, { status: 400 });
  if (!allow(req, isAuthorised(req))) return Response.json({ error: "The demo is busy. Please try again in a minute." }, { status: 429 });
  const { id } = await ctx.params;
  const result = await startSwarm(id, true);
  const status = result.status === "not_found" ? 404 : result.status === "unavailable" ? 503 : result.status === "busy" ? 429 : 200;
  return Response.json(result, { status });
}
