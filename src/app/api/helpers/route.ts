import { isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { findHelpers, HelperInput } from "@/lib/engine/helpers";
import { EngineError } from "@/lib/engine/research";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 120;

const json = (body: unknown, status: number) => Response.json(body, { status });

/** Finds local companies for a household job, for the "Get it done" tab of /assistant. Same access rules as /api/research. */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = HelperInput.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return json({ error: "invalid input", issues: parsed.error.issues }, 400);
  if (!allow(req, isAuthorised(req))) return json({ error: "The demo is busy. Please try again in a minute." }, 429);
  try {
    return json(await findHelpers(parsed.data), 200);
  } catch (error) {
    if (error instanceof EngineError) return json({ error: error.message }, error.status);
    console.error("helper search failed", error);
    return json({ error: "helper search failed" }, 500);
  }
}
