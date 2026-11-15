"use client";

import { createContext, Fragment, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** How many times the visitor has pressed Replay, and the way to press it. */
const ReplayContext = createContext<{ run: number; paused: boolean; replay: () => void; toggle: () => void }>({ run: 0, paused: false, replay: () => {}, toggle: () => {} });

const lessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Holds the Replay count for one scene, so the button and the stage can sit in different parts of the page. */
export function ReplayProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  return <ReplayContext.Provider value={{ run, paused, replay: () => { setPaused(false); setRun((n) => n + 1); }, toggle: () => setPaused((value) => !value) }}>{children}</ReplayContext.Provider>;
}

/** Visitors can hold a scene to read the source or conversation at their own pace. */
export function PauseButton() {
  const { paused, toggle } = useContext(ReplayContext);
  const Icon = paused ? Play : Pause;
  return <button type="button" className="demo-replay" onClick={toggle} aria-pressed={paused}><Icon size={16} aria-hidden="true" />{paused ? "Resume" : "Pause"}</button>;
}

/** The stage: a new key on every Replay mounts the scene again, which starts its clock and its animations from zero. */
export function ReplayStage({ children }: { children: ReactNode }) {
  const { run } = useContext(ReplayContext);
  // On a phone the heading fills the first screen, so a tap on Replay brings the stage up to where the scene plays.
  useEffect(() => {
    if (run === 0 || !window.matchMedia("(max-width: 899px)").matches) return;
    document.querySelector(".demo-stage")?.scrollIntoView({ block: "start", behavior: lessMotion() ? "auto" : "smooth" });
  }, [run]);
  return <Fragment key={run}>{children}</Fragment>;
}

export function ReplayButton() {
  const { replay } = useContext(ReplayContext);
  return (
    <button type="button" className="demo-replay" onClick={replay}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" />
        <path d="M2.5 2.5v3h3" />
      </svg>
      Replay
    </button>
  );
}

/**
 * The clock every replay runs on: milliseconds since the scene started, stopping at `duration`.
 *
 * With `loop` it starts again at the end, for the screen at the team's table. A visitor who asked their device for
 * less motion sees how the scene ends instead of a timeline that moves by itself; pressing Replay is their own
 * choice to watch it play. The frame is cancelled on unmount and no frame is requested after the end.
 */
export function useReplayClock(duration: number, loop: boolean): number {
  const { run, paused } = useContext(ReplayContext);
  const [now, setNow] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    // ?loop=1 is itself a request to play, so the screen at the table never stands still.
    const still = run === 0 && !loop && lessMotion();
    let frame = 0;
    let last = performance.now();
    let inView = true;
    let active = false;
    const tick = () => {
      if (still) {
        setNow(duration);
        return;
      }
      const time = performance.now();
      elapsed.current += time - last;
      last = time;
      if (elapsed.current > duration && loop) elapsed.current = 0;
      setNow(Math.min(elapsed.current, duration));
      if (elapsed.current < duration || loop) frame = requestAnimationFrame(tick);
    };
    const update = () => {
      const next = !paused && inView && !document.hidden;
      stage?.setAttribute("data-replay-active", String(next));
      if (next === active) return;
      active = next;
      cancelAnimationFrame(frame);
      if (active) { last = performance.now(); frame = requestAnimationFrame(tick); }
    };
    const stage = document.querySelector(".demo-stage");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    if (stage) observer?.observe(stage);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [duration, loop, run, paused]);
  return now;
}

/** Brings the newest line of a transcript into view. It glides only for visitors who have not asked for less motion. */
export function scrollToEnd(list: HTMLElement | null) {
  list?.scrollTo({ top: list.scrollHeight, behavior: lessMotion() ? "auto" : "smooth" });
}
