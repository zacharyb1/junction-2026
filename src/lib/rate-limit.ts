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

export function allow(req: Request, trusted: boolean): boolean {
  if (trusted) return true;
  const client = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  all = all.filter((t) => now - t < WINDOW_MS);
  hits.set(client, recent);
  if (recent.length >= PER_CLIENT || all.length >= PUBLIC_TOTAL) return false;
  recent.push(now);
  all.push(now);
  if (hits.size > 5000) hits.clear();
  return true;
}
