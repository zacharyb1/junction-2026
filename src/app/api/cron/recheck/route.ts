import { timingSafeEqual } from "node:crypto";
import { latestCheck } from "@/lib/case";
import { isAuthorised, loadCase, recheckSources } from "@/lib/cases";
import { listCases } from "@/lib/store";

export const maxDuration = 300;

const WATCH_DAYS = 14;
const MAX_PER_RUN = 15;
// One slow case can take half a minute. No new case is started this late, so the run ends inside maxDuration.
const BUDGET_MS = 240_000;
// A case read this recently is left alone: Vercel can deliver a cron event twice, and the family may just have checked.
const FRESH_MS = 60 * 60_000;

/** Vercel sends "Authorization: Bearer <CRON_SECRET>" to cron routes when that variable is set on the project. */
function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/**
 * The daily source re-check. Opens every cited page of the cases that were published or updated in the
 * last 14 days, one case after another, and stores the result on each case for its page to show.
 */
export async function GET(req: Request) {
  if (!isCron(req) && !isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const started = Date.now();
  const since = new Date(started - WATCH_DAYS * 24 * 60 * 60 * 1000);

  // Longest unwritten first. A re-check saves the case, which sends it to the back of the queue,
  // so with more than 15 cases to watch every one still gets its turn.
  const queue = (await listCases({ since, limit: 10_000 })).reverse();
  const cases: { id: string; changed: number[]; unreachable: number[] }[] = [];
  let seen = 0;
  let failed = 0;
  for (const { id } of queue) {
    if (cases.length >= MAX_PER_RUN || Date.now() - started > BUDGET_MS) break;
    seen++;
    try {
      const c = await loadCase(id);
      // Only re-checks kept this file fresh: the content is older than the watch. Or there is nothing to check.
      if (!c || !c.evidence.length || new Date(c.updatedAt) < since) continue;
      if (started - new Date(latestCheck(c)?.at ?? 0).getTime() < FRESH_MS) continue;
      const result = await recheckSources(c, "cron");
      cases.push({ id, changed: result.changed, unreachable: result.unreachable });
    } catch {
      // One case that fails must not stop the others.
      failed++;
    }
  }

  return Response.json({
    checked: cases.length,
    // Cases where this run found a quote gone that the last run still saw.
    withChanges: cases.filter((c) => c.changed.length).length,
    failed,
    // Looked at and left alone: content older than the watch, nothing cited, or read within the last hour.
    skipped: seen - cases.length - failed,
    // Cases in the watch that this run did not reach. They are first in line tomorrow.
    waiting: queue.length - seen,
    ms: Date.now() - started,
    cases,
  });
}
