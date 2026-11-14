import { highlightUrl, hostOf } from "@/components/landing/sample";
import recording from "@/data/autopilot-check.json";
import type { EngineEvent, ResearchResult } from "@/lib/engine/research";

/**
 * The one real part of the /autopilot demo: the lawyer's check.
 *
 * The page sends one fixed question to the Engine (`POST /api/research`), which searches official sites
 * with Exa, opens every page it cites and keeps only the quotes it finds there. When the page has no access
 * code, or the check fails, it shows a recorded run of the same question instead and says so.
 * The recording is written by scripts/make-autopilot-check.mjs.
 */

/** The question the lawyer asks. The live check sends exactly what the recording asked. */
export const QUESTION = recording.request;

export type CheckedQuote = { n: number; quote: string; host: string; href: string };

/** The fields of a citation the page needs. A recording is plain JSON, so `verification` is read as text. */
type Cited = { n: number; url: string; quote: string; verification: string };

/** The quotes of a run that the Engine found on their pages. A quote it could not find is never shown. */
export function checkedQuotes(evidence: Cited[]): CheckedQuote[] {
  return evidence
    .filter((item) => item.verification === "verified")
    .map((item) => ({ n: item.n, quote: item.quote, host: hostOf(item.url), href: highlightUrl(item.url, item.quote) ?? item.url }));
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : word.endsWith("ch") ? "es" : "s"}`;

/** One line that says what a run did, from the Engine's own counts. */
export function summary(run: Pick<ResearchResult, "evidenceVerified" | "evidenceTotal" | "exa" | "ms">): string {
  return `${plural(run.exa.searches, "Exa search")}, ${run.evidenceVerified} of ${plural(run.evidenceTotal, "quote")} found on the cited pages, ${(run.ms / 1000).toFixed(1)} s`;
}

export const RECORDED = {
  on: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" }).format(
    new Date(recording.recordedAt),
  ),
  quotes: checkedQuotes(recording.evidence),
  summary: summary(recording),
};

/** What the page shows while the check runs: the Engine's own words for each stage, and each page as it is opened. */
export function progressLine(event: EngineEvent): string | null {
  if (event.type === "stage") return event.detail;
  if (event.type === "page") return event.via === "none" ? `Could not open ${hostOf(event.url)}` : `Opened ${hostOf(event.url)}`;
  if (event.type === "verified") return `${event.verified} of ${plural(event.total, "quote")} found on the cited pages`;
  return null;
}

/**
 * Read the Engine's event stream (`Accept: text/event-stream` on `POST /api/research`).
 * Hands every progress event to `onEvent` and resolves with the result of the `done` event.
 * Rejects with the Engine's message on an `error` event, and when the stream closes before either,
 * so a broken run shows as a failure and never as a check that passed.
 */
export async function readResearchStream(body: ReadableStream<Uint8Array>, onEvent: (event: EngineEvent) => void): Promise<ResearchResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new Error("The connection closed before the check finished.");
    buffer += decoder.decode(value, { stream: true });
    let split: number;
    while ((split = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const name = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.+)$/m)?.[1];
      if (!name || !data) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(data);
      } catch {
        continue; // a block that is not JSON carries nothing to show
      }
      if (name === "done") {
        await reader.cancel().catch(() => {});
        return payload as ResearchResult;
      }
      if (name === "error") {
        await reader.cancel().catch(() => {});
        throw new Error((payload as { error?: string }).error || "The check failed.");
      }
      onEvent(payload as EngineEvent);
    }
  }
}

/** Why the Engine refused before any research started, in words the visitor can act on. */
export function refusal(status: number, message?: string): string {
  if (status === 401) return "That access code is not valid.";
  if (status === 429) return "The demo is busy.";
  return message || `The Engine answered ${status}.`;
}
