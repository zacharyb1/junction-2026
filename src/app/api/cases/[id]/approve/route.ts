import { z } from "zod";
import { approveCaseAction, loadCase, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

const Input = z.object({ index: z.number().int().min(0).max(100) });

/**
 * The family's click on a proposal that waits in the case's action log (issue #27).
 * Whoever holds the unguessable case link may approve. AIDaddy still sends nothing: the answer
 * carries the draft so the family can send or hand it in themselves.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]/approve">) {
  const { id } = await ctx.params;
  const parsed = Input.safeParse(await readJson(req, 1_000).catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  if (!(await loadCase(id))) return Response.json({ error: "not found" }, { status: 404 });
  if (!allow(req, false)) return Response.json({ error: "Too many clicks right now. Please try again in a minute." }, { status: 429 });

  const approved = await approveCaseAction(id, parsed.data.index);
  if (!approved) return Response.json({ error: "Nothing waits for a click there." }, { status: 409 });
  return Response.json(approved);
}
