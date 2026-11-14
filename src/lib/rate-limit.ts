/**
 * Small in-memory rate limit for the public demo: protects the Exa credits.
 * Per server instance, so it is a speed bump, not a guarantee. Requests that
 * carry the valid bot secret are not limited.
 *
 * A whole venue can sit behind one address, so the per-client limit is generous
 * and a second limit caps public traffic as a whole.
 */

const WINDOW_MS = 60_000;
const PER_CLIENT = Number(process.env.DEMO_RATE_PER_MINUTE ?? 20);
const PUBLIC_TOTAL = Number(process.env.DEMO_RATE_TOTAL_PER_MINUTE ?? 40);
const hits = new Map<string, number[]>();
let all: number[] = [];

/**
 * The address a request came from, taken from a header the caller cannot write.
 * On Vercel the platform sets `x-vercel-forwarded-for` and `x-real-ip` itself. Elsewhere the last entry of
 * `x-forwarded-for` is the one the nearest proxy appended; everything before it is whatever the caller sent.
 * With no proxy in front (local development) the whole header is the caller's, and only the total limit holds.
 */
export function clientAddress(req: Request): string {
  const first = (name: string) => req.headers.get(name)?.split(",")[0].trim();
  if (process.env.VERCEL) return first("x-vercel-forwarded-for") || first("x-real-ip") || "unknown";
  return req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

export function allow(req: Request, trusted: boolean): boolean {
  if (trusted) return true;
  const client = clientAddress(req);
  const now = Date.now();
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  all = all.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_CLIENT || all.length >= PUBLIC_TOTAL) return false;
  recent.push(now);
  all.push(now);
  // Only a request that was let through is remembered, so refused ones cannot fill the memory.
  if (hits.size > 5000) hits.clear();
  hits.set(client, recent);
  return true;
}
