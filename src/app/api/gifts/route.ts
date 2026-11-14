import { isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { findGifts, GiftInput } from "@/lib/engine/gifts";
import { EngineError } from "@/lib/engine/research";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 120;

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Finds gifts with prices from shop pages for someone the family knows (issue 30). Same access rules as
 * `/api/research`: the bot's secret or the demo code, and the same rate limit.
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = GiftInput.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return json({ error: "invalid input", issues: parsed.error.issues }, 400);
  if (!allow(req, isAuthorised(req))) return json({ error: "The demo is busy. Please try again in a minute." }, 429);
  try {
    return json(await findGifts(parsed.data), 200);
  } catch (error) {
    if (error instanceof EngineError) return json({ error: error.message }, error.status);
    console.error("gift search failed", error);
    return json({ error: "gift search failed" }, 500);
  }
}
