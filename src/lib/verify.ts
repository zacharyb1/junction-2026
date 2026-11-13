import { lookup } from "node:dns/promises";
import type { Evidence, EvidenceInput, Verification } from "@/lib/case";
import { normalise, numbersIn } from "@/lib/text";

export { normalise };

/**
 * Quote verifier. For every cited source we open the page again, from our own
 * server, and check that the quoted sentence is really there. The agent cannot
 * mark its own homework.
 */

const DIRECT_TIMEOUT_MS = 6000;
const EXA_TIMEOUT_MS = 9000;
// Oxylabs says 150 s is a safe default and 10 s may fail. We wait 25 s: this reader is a fallback, not the main path.
const OXYLABS_TIMEOUT_MS = Number(process.env.OXYLABS_TIMEOUT_MS ?? 25_000);
const OXYLABS_MAX_PAGES = 6;
const MAX_PAGE_BYTES = 3_000_000;
const EXA_BATCH = 4;
const WINDOW = 5;
export const VERIFY_THRESHOLD = 0.8;

/** HTML to text. Block elements become line breaks so sentences do not run together. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|td|th|section|article|header|footer|blockquote|dd|dt|summary|details)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

/** Share of the quote's five-word windows that occur in the page, 0 to 1. */
export function quoteMatch(quote: string, page: string): number {
  const q = normalise(quote);
  const p = normalise(page);
  if (!q || !p) return 0;
  if (p.includes(q)) return 1;
  const words = q.split(" ");
  if (words.length < WINDOW) return 0;
  let hits = 0;
  const total = words.length - WINDOW + 1;
  for (let i = 0; i < total; i++) {
    if (p.includes(words.slice(i, i + WINDOW).join(" "))) hits++;
  }
  return hits / total;
}

const PRIVATE_HOST =
  /^(localhost|.*\.(local|localhost|internal|lan|home|corp)|\[.*\]|0\.\d+\.\d+\.\d+|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+)$/i;
const PRIVATE_ADDRESS = /^(0\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

/**
 * Cited URLs come from a language model and from callers of the API, so our own request
 * only goes to public web addresses: http or https, default port, no private or loopback host.
 */
export async function isPublicUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.port || url.username || url.password) return false;
  if (PRIVATE_HOST.test(url.hostname)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return true;
  try {
    const { address } = await lookup(url.hostname);
    return !PRIVATE_ADDRESS.test(address);
  } catch {
    // No DNS from here (for example behind a proxy). The request itself decides.
    return true;
  }
}

/** Read at most `max` bytes, so one huge file cannot exhaust the function's memory. */
async function readCapped(res: Response, max = MAX_PAGE_BYTES): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size >= max) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Our own request to the page: the truest "live" check, and free. Redirects are followed by hand so each hop is checked. */
async function fetchDirect(url: string): Promise<string | null> {
  try {
    const signal = AbortSignal.timeout(DIRECT_TIMEOUT_MS);
    let target = url;
    for (let hop = 0; hop < 5; hop++) {
      if (!(await isPublicUrl(target))) return null;
      const res = await fetch(target, {
        signal,
        redirect: "manual",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; casefile-verifier/1.0)",
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
          "accept-language": "en,fi;q=0.8,sv;q=0.6",
        },
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (location) {
        await res.body?.cancel().catch(() => {});
        target = new URL(location, target).toString();
        continue;
      }
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "";
      if (!/text|html|xml|json/.test(type)) return null;
      const text = htmlToText(await readCapped(res));
      return text.trim().length > 200 ? text : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Exa Contents for a batch of URLs in one request. Reads PDFs, pages that build
 * their text with JavaScript, and sites that refuse our own request.
 */
async function fetchViaExa(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const key = process.env.EXA_API_KEY;
  if (!key || !urls.length) return out;
  // Small batches in parallel: one slow page can only hold up its own batch.
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += EXA_BATCH) batches.push(urls.slice(i, i + EXA_BATCH));
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch("https://api.exa.ai/contents", {
          method: "POST",
          signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
          headers: { "content-type": "application/json", "x-api-key": key },
          body: JSON.stringify({ urls: batch, text: true }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results?: { url?: string; id?: string; text?: string }[] };
        for (const r of data.results ?? []) {
          const url = r.url ?? r.id;
          if (url && r.text && r.text.trim().length > 200) out.set(url, r.text.slice(0, MAX_PAGE_BYTES));
        }
      } catch {
        // Exa being slow must never block a case. Our own reading still counts.
      }
    }),
  );
  return out;
}

/**
 * Oxylabs Web API, POST /v1/scrape: a live read through their unblocker, for pages that refuse
 * our own request (many government sites sit behind a bot challenge). Skipped without OXYLABS_API_KEY.
 * Docs: https://developers.oxylabs.io/products/web-api/scrape.md
 */
async function fetchViaOxylabs(url: string): Promise<string | null> {
  const key = process.env.OXYLABS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${process.env.OXYLABS_BASE_URL ?? "https://webapi.oxylabs.io"}/v1/scrape`, {
      method: "POST",
      signal: AbortSignal.timeout(OXYLABS_TIMEOUT_MS),
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, output: ["markdown"] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; results?: { markdown?: string | null }[] };
    if (typeof data.status === "number" && data.status >= 400) return null;
    const text = data.results?.[0]?.markdown;
    return text && text.trim().length > 200 ? text : null;
  } catch {
    return null;
  }
}

/** Up to three independent readings of one page. Any may be missing. */
export type FetchedPage = { direct: string | null; exa: string | null; oxylabs: string | null; text: string } | null;

export type ReadOptions = {
  /**
   * When to spend an Oxylabs read on a page our own request could not open:
   * "unread" (default): only if Exa has no copy either, so the claim would otherwise be dropped.
   * "blocked": always, to get a live reading. Used by the change watch and deep research.
   */
  oxylabs?: "unread" | "blocked";
  /** Change watch: a quote last confirmed live must still be on a live reading. */
  recheck?: boolean;
};

/**
 * Read every URL two ways at once: our own live request, and Exa Contents.
 * Pages our own request could not open get a third, live reading through Oxylabs when a key is set.
 * Repeated URLs are fetched once.
 */
export async function fetchPages(urls: string[], options: ReadOptions = {}): Promise<Map<string, FetchedPage>> {
  const unique = [...new Set(urls)];
  const [direct, exa] = await Promise.all([Promise.all(unique.map((u) => fetchDirect(u))), fetchViaExa(unique)]);
  const exaFor = (url: string) => exa.get(url) ?? exa.get(url.replace(/\/$/, "")) ?? null;

  const wanted = unique
    .filter((url, i) => !direct[i] && (options.oxylabs === "blocked" || !exaFor(url)))
    .slice(0, OXYLABS_MAX_PAGES);
  const oxylabs = new Map<string, string | null>(
    await Promise.all(wanted.map(async (url) => [url, await fetchViaOxylabs(url)] as [string, string | null])),
  );

  return new Map(
    unique.map((url, i) => {
      const d = direct[i];
      const e = exaFor(url);
      const o = oxylabs.get(url) ?? null;
      return [url, d || e || o ? { direct: d, exa: e, oxylabs: o, text: [d, o, e].filter(Boolean).join("\n") } : null];
    }),
  );
}

/** How many pages each reader managed to open. */
export function readerCounts(pages: Map<string, FetchedPage>) {
  const all = [...pages.values()];
  return {
    live: all.filter((p) => p?.direct).length,
    exa: all.filter((p) => p?.exa).length,
    oxylabs: all.filter((p) => p?.oxylabs).length,
  };
}

/**
 * How much of the quote is on this reading, 0 to 1. A quote that is not there word for word
 * can still pass on wording alone (line breaks, footnote marks), but never with a number the page does not have.
 */
function matchOn(quote: string, text: string | null): number {
  if (!text) return 0;
  const match = quoteMatch(quote, text);
  if (match >= 1 || match < VERIFY_THRESHOLD) return match;
  const onPage = new Set(numbersIn(text));
  return numbersIn(quote).every((n) => onPage.has(n)) ? match : VERIFY_THRESHOLD - 0.01;
}

/**
 * `liveFirst`: the quote was last confirmed on a live reading. If a live reading exists now and the
 * sentence is gone from it, the page changed, whatever Exa's older copy still says.
 */
export function judge(
  quote: string,
  page: FetchedPage,
  liveFirst = false,
): { verification: Verification; match: number; checkedVia?: "live" | "exa" | "oxylabs" } {
  if (!page) return { verification: "unreachable", match: 0 };
  const round = (n: number) => Math.round(n * 100) / 100;
  const live = matchOn(quote, page.direct);
  if (live >= VERIFY_THRESHOLD) return { verification: "verified", match: round(live), checkedVia: "live" };
  const viaOxylabs = matchOn(quote, page.oxylabs);
  if (viaOxylabs >= VERIFY_THRESHOLD) {
    return { verification: "verified", match: round(viaOxylabs), checkedVia: "oxylabs" };
  }
  if (liveFirst && (page.direct || page.oxylabs)) {
    return { verification: "not_found", match: round(Math.max(live, viaOxylabs)) };
  }
  const viaExa = matchOn(quote, page.exa);
  if (viaExa >= VERIFY_THRESHOLD) return { verification: "verified", match: round(viaExa), checkedVia: "exa" };
  // The readings can each hold part of a long quote (different line breaks, cut-off text).
  // The engine grounds against all of them together, so the verdict here must as well.
  const readings = [page.direct, page.oxylabs, page.exa].filter(Boolean).length;
  const both = readings > 1 ? matchOn(quote, page.text) : 0;
  if (both >= VERIFY_THRESHOLD) {
    const via = live >= viaOxylabs && live >= viaExa ? "live" : viaOxylabs >= viaExa ? "oxylabs" : "exa";
    return { verification: "verified", match: round(both), checkedVia: via };
  }
  return { verification: "not_found", match: round(Math.max(live, viaOxylabs, viaExa, both)) };
}

/**
 * Verify evidence items. Pass `pages` when the caller has just fetched the
 * pages itself, so nothing is downloaded twice.
 */
export async function verifyEvidence(
  items: EvidenceInput[],
  pages?: Map<string, FetchedPage>,
  options: ReadOptions = {},
): Promise<Evidence[]> {
  const fetchedAt = new Date().toISOString();
  const missing = items.map((i) => i.url).filter((u) => !pages?.has(u));
  const fetched = missing.length ? await fetchPages(missing, options) : new Map<string, FetchedPage>();
  return items.map((item) => {
    const page = pages?.get(item.url) ?? fetched.get(item.url) ?? null;
    const prior = (item as Partial<Evidence>).checkedVia;
    const liveFirst = Boolean(options.recheck) && (prior === "live" || prior === "oxylabs");
    return { ...item, fetchedAt, ...judge(item.quote, page, liveFirst) };
  });
}
