import { highlightUrl, hostOf } from "@/components/site/sample";
import replay from "@/data/replay.json";

/**
 * The front page replays one real research run, recorded by scripts/make-replay.mjs into src/data/replay.json.
 * This file only reshapes that recording for the page. It adds no numbers of its own.
 */
export type ReplaySearch = {
  focus: string;
  startMs: number;
  doneMs: number;
  /** What the row says once the search is back, for example "4 steps · 4 pages · 5.6 s". */
  outcome: string;
};

export type ReplayPage = { host: string; title: string; ms: number; official: boolean };

export type ReplayQuote = {
  n: number;
  quote: string;
  host: string;
  /** The page, opened at the quoted sentence where the browser supports it. */
  href: string;
  ms: number;
};

export type ReplayData = {
  recordedOn: string;
  message: string;
  place: string;
  stages: { ms: number; detail: string }[];
  searches: ReplaySearch[];
  pages: ReplayPage[];
  quotes: ReplayQuote[];
  endMs: number;
  cost: string;
  verified: number;
  total: number;
};

export type PlanRow = { text: string; sources: { n: number; href: string; host: string }[] };

type Event = {
  type: string;
  ms: number;
  name?: string;
  detail?: string;
  focus?: string;
  status?: string;
  steps?: number;
  pages?: number;
  tookMs?: number;
  url?: string;
  title?: string;
  official?: boolean;
};

const events: Event[] = replay.events;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function stageAt(name: string): number {
  return events.find((event) => event.type === "stage" && event.name === name)?.ms ?? 0;
}

export function replayData(): ReplayData {
  const verifyMs = stageAt("verify");
  const publishMs = stageAt("publish");

  const searches: ReplaySearch[] = [];
  for (const event of events) {
    if (event.type !== "search" || !event.focus) continue;
    const row = searches.find((search) => search.focus === event.focus);
    if (!row) searches.push({ focus: event.focus, startMs: event.ms, doneMs: event.ms, outcome: "" });
    else if (event.status === "done") {
      row.doneMs = event.ms;
      row.outcome = `${plural(event.steps ?? 0, "step")} · ${plural(event.pages ?? 0, "page")} · ${seconds(event.tookMs ?? 0)}`;
    }
  }
  // The fourth search looks for pages published in the last four months. The engine reports when it starts
  // but not when it ends, and it has to be settled before the quotes are checked, so the row closes there.
  const recent = events.find((event) => event.type === "stage" && /last four months/.test(event.detail ?? ""));
  if (recent) {
    searches.push({
      focus: "new on official sites",
      startMs: recent.ms,
      doneMs: verifyMs,
      outcome: replay.result.news.length ? plural(replay.result.news.length, "recent page") : "no recent page added",
    });
  }

  const pages: ReplayPage[] = events
    .filter((event) => event.type === "page" && event.url)
    .map((event) => ({
      host: hostOf(event.url ?? ""),
      title: (event.title ?? "").replace(/\s+/g, " ").trim(),
      ms: event.ms,
      official: Boolean(event.official),
    }));

  // The engine checks all quotes in one stage and reports once. The recording has the start and the end of
  // that stage, so the quotes light up in order across it.
  const evidence = replay.result.evidence.filter((item) => item.verification === "verified");
  const quotes: ReplayQuote[] = evidence.map((item, index) => ({
    n: item.n,
    quote: item.quote,
    host: hostOf(item.url),
    href: highlightUrl(item.url, item.quote) ?? item.url,
    ms: Math.round(verifyMs + ((publishMs - verifyMs) * (index + 1)) / evidence.length),
  }));

  return {
    recordedOn: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" }).format(
      new Date(replay.recordedAt),
    ),
    message: replay.request.situation,
    place: `${replay.request.region}, Finland`,
    stages: events.filter((event) => event.type === "stage" && event.detail).map((event) => ({ ms: event.ms, detail: event.detail ?? "" })),
    searches,
    pages,
    quotes,
    endMs: replay.result.ms,
    cost: `$${replay.result.exa.costDollars.toFixed(3)}`,
    verified: replay.result.evidenceVerified,
    total: replay.result.evidenceTotal,
  };
}

/** The plan lines of the recorded run, with each [n] turned into a link to its source. */
export function planRows(): { title: string; caseHref: string; rows: PlanRow[] } {
  const rows = replay.result.plan.map((line) => {
    const numbers = [...line.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    const sources = numbers.flatMap((n) => {
      const item = replay.result.evidence.find((evidence) => evidence.n === n);
      return item ? [{ n, href: highlightUrl(item.url, item.quote) ?? item.url, host: hostOf(item.url) }] : [];
    });
    return { text: line.replace(/\s*\[\d+\]/g, "").trim(), sources };
  });
  return { title: replay.result.title, caseHref: `/c/${replay.result.id}`, rows };
}

/** The quiet part of the story: messages the gate really left alone in the team's labelled test, and its counts. */
export const quiet = {
  ignored: replay.quiet.ignored,
  trigger: replay.request.situation,
  gate: replay.quiet.gate,
};

/** How many official sites the engine had on file for the recorded run's country. */
export const officialSites: number = replay.result.officialDomains;
