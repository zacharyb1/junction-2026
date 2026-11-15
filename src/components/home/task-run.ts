"use client";

/**
 * One "Get it done" run for a household job, so the phone and desktop screens play the same run: the recorded job (a
 * leaking kitchen tap) replays its scripted run; any other job first finds real companies through /api/helpers, and
 * their calls and quotes are then simulated.
 */

import { useEffect, useState } from "react";
import type { HelperSearch } from "@/lib/engine/helpers";
import { DEMO_FIRMS, DEMO_JOB, type Firm, firmsFromHelpers, HOUSEHOLD, isDemoJob, type TaskFrame, taskFrame } from "@/lib/home-demo";

type Run = { job: string; mode: "demo" } | { job: string; mode: "live"; status: "searching" | "ready" | "error"; firms: Firm[]; error: string };

const TICK_MS = 950;
const DEMO_PITCH: Record<string, string> = { Wirmax: "Tue 16:00 · listed €60, got 15% off" };

const runFor = (job: string): Run => (isDemoJob(job) ? { job, mode: "demo" } : { job, mode: "live", status: "searching", firms: [], error: "" });

export type TaskRun = {
  job: string;
  /** True for a real company search, whose calls are simulated. */
  live: boolean;
  frame: TaskFrame;
  searchingLive: boolean;
  failed: boolean;
  error: string;
  headline: string;
  /** The best fit's time, and the line under its name. */
  slot: string;
  pitch: string;
  start: (job: string) => void;
};

export function useTaskRun(initial: string | undefined, code: string): TaskRun {
  const [run, setRun] = useState<Run>(() => runFor(initial?.trim() || DEMO_JOB));
  const [t, setT] = useState(0);

  const live = run.mode === "live";
  const firms = run.mode === "demo" ? DEMO_FIRMS : run.firms;
  const ticking = run.mode === "demo" || run.status === "ready";

  // One tick every 0.95 s: search (1–6), calls (7–16), pick (17+), about 17 s in all.
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setT((x) => (x >= 18 ? x : x + 1)), TICK_MS);
    return () => clearInterval(id);
  }, [ticking, run]);

  // A live job looks for real companies first; the clock starts once they are found.
  useEffect(() => {
    if (run.mode !== "live" || run.status !== "searching") return;
    let gone = false;
    fetch("/api/helpers", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-code": code },
      body: JSON.stringify({ job: run.job, city: HOUSEHOLD.city, country: HOUSEHOLD.country }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (HelperSearch & { error?: string }) | null;
        if (!res.ok || !body?.helpers) throw new Error(res.status === 401 ? "this demo needs its access code (open /home?code=…)" : (body?.error ?? `search failed (${res.status})`));
        if (gone) return;
        const found = firmsFromHelpers(body.helpers);
        setRun({ ...run, status: found.length ? "ready" : "error", firms: found, error: found.length ? "" : "no companies with a page that lists their service" });
      })
      .catch((e: unknown) => {
        if (!gone) setRun({ ...run, status: "error", error: e instanceof Error ? e.message : "search failed" });
      });
    return () => {
      gone = true;
    };
  }, [run, code]);

  const frame = taskFrame(t, firms, live ? HOUSEHOLD.city : "Kallio", live ? "companies" : "plumbers");
  const searchingLive = live && run.status === "searching";
  const failed = live && run.status === "error";
  const best = frame.best;
  return {
    job: run.job,
    live,
    frame,
    searchingLive,
    failed,
    error: run.mode === "live" ? run.error : "",
    headline: searchingLive ? `Searching companies in ${HOUSEHOLD.city}…` : failed ? "No search this time" : frame.headline,
    slot: best ? best.result.split(" · ")[0] : "",
    pitch: best ? (DEMO_PITCH[best.name] && !live ? DEMO_PITCH[best.name] : `${best.result}${best.listed ? ` · listed ${best.listed}` : ""}`) : "",
    start: (job: string) => {
      setT(0);
      setRun(runFor(job));
    },
  };
}
