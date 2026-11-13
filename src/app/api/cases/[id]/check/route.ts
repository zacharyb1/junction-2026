import { latestCheck, type SourceCheck, verifiedCount } from "@/lib/case";
import { loadCase, recheckSources } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 60;

const COOLDOWN_MS = 10 * 60_000;

/**
 * The "Check the sources again" button on the case page. Whoever holds the unguessable link may ask.
 * Reading the pages costs Exa credits, so a case is read at most once in 10 minutes,
 * and real readings count against the public rate limit.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]/check">) {
  const { id } = await ctx.params;
  const found = await loadCase(id);
  if (!found) return Response.json({ error: "not found" }, { status: 404 });

  const answer = (check: SourceCheck | null, fresh: boolean, c = found) =>
    Response.json({
      id,
      fresh,
      checkedAt: check?.at ?? null,
      changed: check?.changed ?? [],
      unreachable: check?.unreachable ?? [],
      evidenceTotal: c.evidence.length,
      evidenceVerified: verifiedCount(c),
    });

  // A new case counts as checked when it was published. An answer from the store costs nothing, so it is not limited.
  const last = latestCheck(found);
  if (!last || Date.now() - new Date(last.at).getTime() < COOLDOWN_MS) return answer(last, false);
  if (!allow(req, false)) {
    return Response.json({ error: "Too many checks right now. Please try again in a minute." }, { status: 429 });
  }
  try {
    const result = await recheckSources(found, "page");
    // Not fresh when the case was updated during the reading: that check is dropped and the stored one comes back.
    return answer(result.check, result.check.at !== last.at, result.case);
  } catch {
    return Response.json({ error: "The check did not run. Please try again in a minute." }, { status: 502 });
  }
}
