import { latestCheck, type SourceCheck, verifiedCount } from "@/lib/case";
import { loadCase, type RecheckResult, recheckSources } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 60;

const COOLDOWN_MS = 10 * 60_000;
// Readings under way on this server instance. A second click on the same case joins the first instead of fetching again.
const running = new Map<string, Promise<RecheckResult>>();

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
  let reading = running.get(id);
  if (!reading) {
    if (!allow(req, false)) {
      return Response.json({ error: "Too many checks right now. Please try again in a minute." }, { status: 429 });
    }
    reading = recheckSources(found, "page").finally(() => running.delete(id));
    running.set(id, reading);
  }
  try {
    const result = await reading;
    // Not fresh when the case was updated during the reading: that check is dropped and the stored one comes back.
    return answer(result.check, result.check.at !== last.at, result.case);
  } catch {
    return Response.json({ error: "The check did not run. Please try again in a minute." }, { status: 502 });
  }
}
