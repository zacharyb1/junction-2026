"use client";

import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { EngineEvent } from "@/lib/engine/research";

type Of<T extends EngineEvent["type"]> = Extract<EngineEvent, { type: T }>;
type StageName = Of<"stage">["name"];

/** What the engine has reported so far, in the shape the timeline draws. */
export type Progress = {
  stages: Of<"stage">[];
  /** One entry per search, replaced when the search returns. */
  searches: Of<"search">[];
  pages: Of<"page">[];
  verified?: Of<"verified">;
};

export const NO_PROGRESS: Progress = { stages: [], searches: [], pages: [] };

export function advance(p: Progress, e: EngineEvent): Progress {
  switch (e.type) {
    case "stage":
      return { ...p, stages: [...p.stages, e] };
    case "search": {
      // The same question can run twice: on official sites, then on the open web.
      const same = (s: Of<"search">) => s.focus === e.focus && s.web === e.web;
      return { ...p, searches: p.searches.some(same) ? p.searches.map((s) => (same(s) ? e : s)) : [...p.searches, e] };
    }
    case "page":
      return { ...p, pages: [...p.pages.filter((page) => page.url !== e.url), e] };
    case "verified":
      return { ...p, verified: e };
    default:
      // "source" repeats what the page events already said.
      return p;
  }
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ORDER: StageName[] = ["plan", "search", "read", "verify", "publish"];

const READ_BY: Record<Of<"page">["via"], string> = {
  live: "read live",
  oxylabs: "live via Oxylabs",
  exa: "Exa's copy",
  none: "not opened",
};

type State = "running" | "done" | "stopped";

// role="img" makes every screen reader read the label: on a bare <svg> some of them skip it.
function StateIcon({ state, className = "" }: { state: State; className?: string }) {
  if (state === "running") {
    return <Loader2 className={`animate-spin text-muted-foreground motion-reduce:animate-none ${className}`} role="img" aria-label="Running" />;
  }
  if (state === "stopped") return <CircleAlert className={`text-(--hud-amber) ${className}`} role="img" aria-label="Stopped" />;
  return <CircleCheck className={`text-(--hud-green) ${className}`} role="img" aria-label="Done" />;
}

function searchHeading(searches: Of<"search">[]) {
  const back = searches.filter((s) => s.status !== "running").length;
  if (!searches.length || back < searches.length) {
    return `Searching with Exa${searches.length ? `: ${back} of ${searches.length} back` : ""}`;
  }
  // A failed search says so in its own row.
  const done = searches.filter((s) => s.status === "done");
  if (!done.length) return "No Exa search came back";
  const steps = done.reduce((sum, s) => sum + s.steps, 0);
  return `${done.length} Exa search${done.length === 1 ? "" : "es"} proposed ${count(steps, "step")}`;
}

/** "8 cited pages: 6 read live, 2 Exa's copy" */
function readHeading(pages: Of<"page">[]) {
  const readers = (Object.keys(READ_BY) as Of<"page">["via"][])
    .map((via) => [pages.filter((p) => p.via === via).length, READ_BY[via]] as const)
    .filter(([n]) => n > 0);
  return `${count(pages.length, "cited page")}: ${readers.map(([n, how]) => `${n} ${how}`).join(", ")}`;
}

function SearchRow({ search, busy }: { search: Of<"search">; busy: boolean }) {
  // A search still marked as running after the stream has ended will never report back.
  const state: State = search.status === "done" ? "done" : search.status === "running" && busy ? "running" : "stopped";
  return (
    <li className="flex animate-in gap-2 fade-in motion-reduce:animate-none">
      <StateIcon state={state} className="mt-0.5 size-3.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span>
          {search.focus}{" "}
          <span className="text-xs text-muted-foreground">{search.web === "official" ? "official sites" : "open web"}</span>
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {search.status === "done"
            ? `${count(search.steps, "step")} · ${count(search.pages, "page")} · ${seconds(search.tookMs)}`
            : search.status === "failed"
              ? "failed, skipped"
              : busy
                ? "searching"
                : "stopped"}
        </span>
      </div>
    </li>
  );
}

function PageRow({ page }: { page: Of<"page"> }) {
  const host = hostOf(page.url);
  return (
    <li className="flex animate-in items-center gap-2 fade-in motion-reduce:animate-none">
      <Badge variant={page.official ? "secondary" : "outline"}>{page.official ? "Official" : "Secondary"}</Badge>
      {/* "relative" keeps the hidden words inside the cut-off line. Without it they sit past its end and widen the page. */}
      <a href={page.url} target="_blank" rel="noreferrer" className="relative min-w-0 flex-1 truncate py-0.5 hover:underline">
        {host}
        {page.title !== host && <span className="text-muted-foreground"> · {page.title}</span>}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <span className={`shrink-0 text-xs ${page.via === "none" ? "text-(--hud-amber)" : "text-muted-foreground"}`}>
        {READ_BY[page.via]}
      </span>
    </li>
  );
}

/** Seconds since the research started, counting while it runs. `final` is the engine's own total, once it is known. */
export function Elapsed({ busy, final }: { busy: boolean; final?: number }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const began = Date.now();
    const timer = setInterval(() => setMs(Date.now() - began), 100);
    return () => clearInterval(timer);
  }, [busy]);
  // Hidden from screen readers: a live region must not announce every tick.
  return (
    <span aria-hidden className="font-mono text-xs tabular-nums text-muted-foreground">
      {seconds(final ?? ms)}
    </span>
  );
}

/**
 * The research as it runs: one row per stage, the Exa searches and the cited pages under theirs.
 * `finished` is true once the case file is back.
 */
export function Timeline({ progress, busy, finished }: { progress: Progress; busy: boolean; finished: boolean }) {
  const started = ORDER.filter((name) => progress.stages.some((s) => s.name === name));
  const startOf = (name: StageName) => progress.stages.find((s) => s.name === name)?.ms ?? 0;
  return (
    <ol className="flex flex-col gap-3">
      {started.map((name, i) => {
        const [first, ...later] = progress.stages.filter((s) => s.name === name);
        const state: State = finished || i < started.length - 1 ? "done" : busy ? "running" : "stopped";
        const confirmed = name === "verify" ? progress.verified : undefined;
        // A stage ends when the next one starts. The last one ends when the case is stored.
        const end = i < started.length - 1 ? startOf(started[i + 1]) : (progress.verified?.ms ?? first.ms);
        const took = end - first.ms;
        return (
          <li key={name} className="flex animate-in gap-2.5 fade-in motion-reduce:animate-none">
            <StateIcon state={state} className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <p className="min-w-0 flex-1">
                  {name === "search" ? (
                    searchHeading(progress.searches)
                  ) : confirmed ? (
                    <span className="font-medium text-(--hud-green)">
                      {confirmed.verified} of {count(confirmed.total, "quote")} confirmed on{" "}
                      {confirmed.total === 1 ? "its page" : "their pages"}
                    </span>
                  ) : name === "read" && state === "done" && progress.pages.length > 0 ? (
                    readHeading(progress.pages)
                  ) : name === "publish" && finished ? (
                    "Case file ready"
                  ) : (
                    first.detail
                  )}
                </p>
                {/* How long the stage took, like the search rows. Not worth a number when it was instant. */}
                {state === "done" && took >= 50 && (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{seconds(took)}</span>
                )}
              </div>
              {name === "search" && progress.searches.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {progress.searches.map((s) => (
                    <SearchRow key={`${s.web} ${s.focus}`} search={s} busy={busy} />
                  ))}
                </ul>
              )}
              {name === "read" && progress.pages.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {progress.pages.map((page) => (
                    <PageRow key={page.url} page={page} />
                  ))}
                </ul>
              )}
              {name !== "search" &&
                later.map((s, n) => (
                  <p key={n} className="text-xs text-muted-foreground">
                    {s.detail}
                  </p>
                ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
