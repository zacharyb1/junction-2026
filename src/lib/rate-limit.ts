/**
 * Small in-memory rate limit for the public demo: protects the Exa credits.
 * Per server instance, so it is a speed bump, not a guarantee. Requests that
 * carry the valid bot secret are not limited.
 */

const WINDOW_MS = 60_000;
const PER_CLIENT = Number(process.env.DEMO_RATE_PER_MINUTE ?? 4);
const hits = new Map<string, number[]>();

export function allow(req: Request, trusted: boolean): boolean {
  if (trusted) return true;
  const client = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_CLIENT) {
    hits.set(client, recent);
    return false;
  }
  recent.push(now);
  hits.set(client, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
