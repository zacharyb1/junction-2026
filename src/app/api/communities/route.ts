import { isAuthorised, mayResearch, readJson } from "@/lib/cases";
import { CommunityInput, findCommunities } from "@/lib/engine/communities";
import { EngineError } from "@/lib/engine/research";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 120;

const json = (body: unknown, status: number) => Response.json(body, { status });

/** Finds forums, groups and podcasts about a household's question, for the Communities tab of /assistant. */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = CommunityInput.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return json({ error: "invalid input", issues: parsed.error.issues }, 400);
  if (!allow(req, isAuthorised(req))) return json({ error: "The demo is busy. Please try again in a minute." }, 429);
  try {
    return json(await findCommunities(parsed.data), 200);
  } catch (error) {
    if (error instanceof EngineError) return json({ error: error.message }, error.status);
    console.error("community search failed", error);
    return json({ error: "community search failed" }, 500);
  }
}
