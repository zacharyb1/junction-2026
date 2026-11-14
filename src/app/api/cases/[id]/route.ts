import { CasePatch } from "@/lib/case";
import { baseUrl, isAuthorised, loadCase, readJson, recheckCase, updateCase } from "@/lib/cases";

export const maxDuration = 60;

/** Read a case. The id is unguessable, so reads need no secret. */
export async function GET(_req: Request, ctx: RouteContext<"/api/cases/[id]">) {
  const { id } = await ctx.params;
  const found = await loadCase(id);
  return found ? Response.json(found) : Response.json({ error: "not found" }, { status: 404 });
}

/** Update steps, drafts or evidence. New evidence is verified again. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/cases/[id]">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = CasePatch.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid patch", issues: parsed.error.issues }, { status: 400 });
  }
  const result = await updateCase(id, parsed.data, baseUrl(req));
  return result ? Response.json(result) : Response.json({ error: "not found" }, { status: 404 });
}

/** Re-fetch every cited page and report quotes that disappeared. Used by the change watch. */
export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await recheckCase(id);
  if (!result) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ id, changed: result.changed, unreachable: result.unreachable, url: `${baseUrl(req)}/c/${id}` });
}
