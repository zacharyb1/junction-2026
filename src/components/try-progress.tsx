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
  live: "Read live",
  oxylabs: "Live via Oxylabs",
  exa: "Exa's copy",
  none: "Not opened",
};

type State = "running" | "done" | "stopped";

function StateIcon({ state, className = "" }: { state: State; className?: string }) {
  if (state === "running") return <Loader2 className={`animate-spin text-muted-foreground ${className}`} aria-label="Running" />;
  if (state === "stopped") return <CircleAlert className={`text-amber-600 ${className}`} aria-label="Stopped" />;
  return <CircleCheck className={`text-emerald-600 ${className}`} aria-label="Done" />;
}

function searchHeading(searches: Of<"search">[]) {
  const back = searches.filter((s) => s.status !== "running").length;
  if (!searches.length || back < searches.length) {
    return `Searching with Exa${searches.length ? `: ${back} of ${searches.length} back` : ""}`;
  }
  const steps = searches.reduce((sum, s) => sum + s.steps, 0);
  return `${searches.length} Exa search${searches.length === 1 ? "" : "es"} proposed ${count(steps, "step")}`;
}

function SearchRow({ search, busy }: { search: Of<"search">; busy: boolean }) {
  // A search still marked as running after the stream has ended will never report back.
  const state: State = search.status === "done" ? "done" : search.status === "running" && busy ? "running" : "stopped";
  return (
    <li className="flex animate-in gap-2 fade-in">
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
    <li className="flex animate-in items-center gap-2 fade-in">
      <Badge variant={page.official ? "secondary" : "outline"}>{page.official ? "Official" : "Secondary"}</Badge>
      <a href={page.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
        {host}
        {page.title !== host && <span className="text-muted-foreground"> · {page.title}</span>}
      </a>
      <span className={`shrink-0 text-xs ${page.via === "none" ? "text-amber-700" : "text-muted-foreground"}`}>
        {READ_BY[page.via]}
      </span>
    </li>
  );
}

/** Seconds since the research started, counting while it runs. */
export function Elapsed({ busy }: { busy: boolean }) {
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
      {seconds(ms)}
    </span>
  );
}

/**
 * The research as it runs: one row per stage, the Exa searches and the cited pages under theirs.
 * `finished` is true once the case file is back.
 */
export function Timeline({ progress, busy, finished }: { progress: Progress; busy: boolean; finished: boolean }) {
  const started = ORDER.filter((name) => progress.stages.some((s) => s.name === name));
  return (
    <ol className="flex flex-col gap-3">
      {started.map((name, i) => {
        const [first, ...later] = progress.stages.filter((s) => s.name === name);
        const state: State = finished || i < started.length - 1 ? "done" : busy ? "running" : "stopped";
        const confirmed = name === "verify" ? progress.verified : undefined;
        return (
          <li key={name} className="flex animate-in gap-2.5 fade-in">
            <StateIcon state={state} className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <p className="min-w-0 flex-1">
                  {name === "search" ? (
                    searchHeading(progress.searches)
                  ) : confirmed ? (
                    <span className="font-medium text-emerald-800">
                      {confirmed.verified} of {count(confirmed.total, "quote")} confirmed on{" "}
                      {confirmed.total === 1 ? "its page" : "their pages"}
                    </span>
                  ) : (
                    first.detail
                  )}
                </p>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{seconds(first.ms)}</span>
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
