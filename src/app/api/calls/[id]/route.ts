import { getDemoCall } from "@/lib/demo-calls";

type Result = Awaited<ReturnType<typeof getDemoCall>>;
/** The page asks every few seconds. One answer is reused for two seconds, so many open tabs are still one provider request. */
const recent = new Map<string, { at: number; result: Result }>();

/**
 * The state of one call, for the page of the person who asked for it. The id is the key: it is 24 random
 * characters that only that page and the bot's chat have seen. The full phone number is never returned.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/calls/[id]">) {
  const { id } = await params;
  const cached = recent.get(id);
  const fresh = cached && Date.now() - cached.at < 2000;
  const result = fresh ? cached.result : await getDemoCall(id, { transcript: true });
  if (!fresh && result.status !== "not_found") {
    if (recent.size > 500) recent.clear();
    recent.set(id, { at: Date.now(), result });
  }
  return Response.json(result, { status: result.status === "not_found" ? 404 : 200, headers: { "cache-control": "no-store" } });
}
