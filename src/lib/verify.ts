import type { Evidence, EvidenceInput, Verification } from "@/lib/case";

/**
 * Quote verifier. For every cited source we open the page again, from our own
 * server, and check that the quoted sentence is really there. The agent cannot
 * mark its own homework.
 */

const DIRECT_TIMEOUT_MS = 6000;
const EXA_TIMEOUT_MS = 9000;
const WINDOW = 5;
export const VERIFY_THRESHOLD = 0.8;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/[^\p{L}\p{N}%€$£.,'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

/** Our own request to the page: the truest "live" check, and free. */
async function fetchDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; casefile-verifier/1.0)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        "accept-language": "en,fi;q=0.8,sv;q=0.6",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/text|html|xml|json/.test(type)) return null;
    const text = htmlToText(await res.text());
    return text.trim().length > 200 ? text : null;
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
  try {
    const res = await fetch("https://api.exa.ai/contents", {
      method: "POST",
      signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({ urls, text: true }),
    });
    if (!res.ok) return out;
    const data = (await res.json()) as { results?: { url?: string; id?: string; text?: string }[] };
    for (const r of data.results ?? []) {
      const url = r.url ?? r.id;
      if (url && r.text && r.text.trim().length > 200) out.set(url, r.text);
    }
  } catch {
    // Exa being slow must never block a case. Our own reading still counts.
  }
  return out;
}

/** Two independent readings of one page. Either may be missing. */
export type FetchedPage = { direct: string | null; exa: string | null; text: string } | null;

/**
 * Read every URL two ways at once: our own live request, and Exa Contents.
 * Repeated URLs are fetched once.
 */
export async function fetchPages(urls: string[]): Promise<Map<string, FetchedPage>> {
  const unique = [...new Set(urls)];
  const [direct, exa] = await Promise.all([Promise.all(unique.map((u) => fetchDirect(u))), fetchViaExa(unique)]);
  return new Map(
    unique.map((url, i) => {
      const d = direct[i];
      const e = exa.get(url) ?? exa.get(url.replace(/\/$/, "")) ?? null;
      return [url, d || e ? { direct: d, exa: e, text: [d, e].filter(Boolean).join("\n") } : null];
    }),
  );
}

export function judge(
  quote: string,
  page: FetchedPage,
): { verification: Verification; match: number; checkedVia?: "live" | "exa" } {
  if (!page) return { verification: "unreachable", match: 0 };
  const round = (n: number) => Math.round(n * 100) / 100;
  const live = page.direct ? quoteMatch(quote, page.direct) : 0;
  if (live >= VERIFY_THRESHOLD) return { verification: "verified", match: round(live), checkedVia: "live" };
  const viaExa = page.exa ? quoteMatch(quote, page.exa) : 0;
  if (viaExa >= VERIFY_THRESHOLD) return { verification: "verified", match: round(viaExa), checkedVia: "exa" };
  return { verification: "not_found", match: round(Math.max(live, viaExa)) };
}

/**
 * Verify evidence items. Pass `pages` when the caller has just fetched the
 * pages itself, so nothing is downloaded twice.
 */
export async function verifyEvidence(
  items: EvidenceInput[],
  pages?: Map<string, FetchedPage>,
): Promise<Evidence[]> {
  const fetchedAt = new Date().toISOString();
  const missing = items.map((i) => i.url).filter((u) => !pages?.has(u));
  const fetched = missing.length ? await fetchPages(missing) : new Map<string, FetchedPage>();
  return items.map((item) => {
    const page = pages?.get(item.url) ?? fetched.get(item.url) ?? null;
    return { ...item, fetchedAt, ...judge(item.quote, page) };
  });
}
