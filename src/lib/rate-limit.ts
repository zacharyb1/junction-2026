/**
 * Small in-memory rate limit for the public demo: protects the Exa credits.
 * Per server instance, so it is a speed bump, not a guarantee. Requests that
 * carry the valid bot secret are not limited.
 *
 * A whole venue can sit behind one address, so the per-client limit is generous
 * and a second limit caps public traffic as a whole. Two more limits cap a whole day:
 * where the demo is open without the access code, they bound what strangers can spend
 * while nobody is watching. One address may use at most a part of the day's total, so
 * a single address cannot use up the day for everyone else. When the day's total is
 * reached the server says so in its log, because visitors are then turned away until
 * requests age out or the web container is recreated.
 */

const WINDOW_MS = 60_000;
const DAY_MS = 86_400_000;
const PER_CLIENT = Number(process.env.DEMO_RATE_PER_MINUTE ?? 20);
const PUBLIC_TOTAL = Number(process.env.DEMO_RATE_TOTAL_PER_MINUTE ?? 40);
const PER_CLIENT_DAY = Number(process.env.DEMO_RATE_PER_DAY ?? 400);
const PUBLIC_DAY = Number(process.env.DEMO_RATE_TOTAL_PER_DAY ?? 1000);
const hits = new Map<string, number[]>();
/** One counter for each address, started at its first request and started again 24 hours later. */
const days = new Map<string, { since: number; count: number }>();
let all: number[] = [];
let today: number[] = [];
let warnedAt = 0;

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
  today = today.filter((t) => now - t < DAY_MS);
  const day = days.get(client);
  const used = day && now - day.since < DAY_MS ? day.count : 0;
  if (today.length >= PUBLIC_DAY) {
    // At most one line every ten minutes: the log should show the state, not every refused visitor.
    if (now - warnedAt > 600_000) {
      warnedAt = now;
      console.warn(`[rate-limit] the public demo reached its ${PUBLIC_DAY} requests for 24 hours and is turning visitors away. Raise DEMO_RATE_TOTAL_PER_DAY or recreate the web container to start the count again.`);
    }
    return false;
  }
  if (recent.length >= PER_CLIENT || all.length >= PUBLIC_TOTAL || used >= PER_CLIENT_DAY) return false;
  recent.push(now);
  all.push(now);
  today.push(now);
  // Only a request that was let through is remembered, so refused ones cannot fill the memory.
  if (hits.size > 5000) hits.clear();
  hits.set(client, recent);
  if (days.size > 5000) days.clear();
  days.set(client, used && day ? { since: day.since, count: used + 1 } : { since: now, count: 1 });
  return true;
}
