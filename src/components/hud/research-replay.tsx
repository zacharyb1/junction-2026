"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Core } from "@/components/hud/core";
import type { ReplayData } from "@/components/hud/data";
import { useFirstView, useReducedMotion } from "@/components/hud/hooks";

/** The clock on screen moves in steps of this size. Smooth enough to read, light enough for a phone. */
const FRAME_MS = 50;

/**
 * Plays back one real research run at the speed it happened.
 *
 * Every search, page and quote comes from src/data/replay.json (see data.ts). The clock is the run's own:
 * a search row fills over the time that search really took, and a page appears when it was really read.
 * Without JavaScript, or with reduced motion, the finished run is shown.
 */
export function ResearchReplay({ data, children }: { data: ReplayData; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Time on the recorded clock. It starts at the end, so the server's page shows the finished run.
  const [now, setNow] = useState(data.endMs);
  const [run, setRun] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const play = useCallback(() => {
    setPicked(null);
    setNow(0);
    setRun((count) => count + 1);
  }, []);
  useFirstView(ref, play, !reduced);

  useEffect(() => {
    if (run === 0) return;
    const started = performance.now();
    let frame = 0;
    let last = -FRAME_MS;
    const tick = (time: number) => {
      const elapsed = time - started;
      if (elapsed >= data.endMs) {
        setNow(data.endMs);
        return;
      }
      if (elapsed - last >= FRAME_MS) {
        last = elapsed;
        setNow(elapsed);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, data.endMs]);

  const done = now >= data.endMs;
  const stage = [...data.stages].reverse().find((item) => item.ms <= now);
  const pagesIn = data.pages.filter((page) => page.ms <= now).length;
  const checked = data.quotes.filter((quote) => quote.ms <= now);
  const searchesBack = data.searches.filter((search) => search.doneMs <= now).length;
  const latest = checked[checked.length - 1];
  const showing = data.quotes.find((quote) => quote.n === picked) ?? latest;

  return (
    <div ref={ref} className="hud-panel hud-replay" data-done={done}>
      <p className="hud-sr">
        Recorded on {data.recordedOn}: {data.searches.length} Exa searches, {data.pages.length} official pages read, {data.verified} of{" "}
        {data.total} quotes found on their pages, in {(data.endMs / 1000).toFixed(1)} seconds, for {data.cost}.
      </p>

      <div className="hud-replay-head">
        <Core state={done ? "done" : "active"} className="hud-core--tiny" />
        <div className="hud-replay-ask">
          <p className="hud-label hud-label--amber">In the family chat · {data.place}</p>
          <p className="hud-replay-message">{data.message}</p>
        </div>
        <p className="hud-clock" aria-hidden="true">
          {(now / 1000).toFixed(1)}
          <span> s</span>
        </p>
      </div>

      <p className="hud-status-line" aria-hidden="true">
        <span>&gt;</span> {done ? `Done. ${data.verified} of ${data.total} quotes found on their pages.` : (stage?.detail ?? "Starting")}
      </p>

      <div className="hud-replay-grid" aria-hidden="true">
        <section>
          <h3 className="hud-label">Exa search · {searchesBack}/{data.searches.length}</h3>
          <ul className="hud-searches">
            {data.searches.map((search) => {
              const span = Math.max(1, search.doneMs - search.startMs);
              const progress = Math.min(1, Math.max(0, (now - search.startMs) / span));
              const state = now < search.startMs ? "waiting" : progress < 1 ? "running" : "done";
              return (
                <li key={search.focus} data-state={state}>
                  <span className="hud-search-name">{search.focus}</span>
                  <span className="hud-bar">
                    <span style={{ transform: `scaleX(${progress})` }} />
                  </span>
                  <span className="hud-search-out">{state === "done" ? search.outcome : state === "running" ? "searching" : "queued"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="hud-label">Pages opened · {pagesIn}/{data.pages.length}</h3>
          <ul className="hud-pages">
            {data.pages.map((page) => (
              <li key={page.host + page.title} data-shown={page.ms <= now}>
                <span className="hud-page-host">{page.host}</span>
                <span className="hud-page-title">{page.title}</span>
                <span className="hud-page-tags">{page.official ? "official · read live" : "read live"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="hud-quotes">
        <h3 className="hud-label hud-label--green" aria-hidden="true">
          Quotes found on the page · {checked.length}/{data.quotes.length}
        </h3>
        <ul className="hud-chips">
          {data.quotes.map((quote) => (
            <li key={quote.n}>
              <button
                type="button"
                className="hud-chip"
                data-shown={quote.ms <= now}
                aria-pressed={showing?.n === quote.n}
                aria-label={`Quote ${quote.n}, from ${quote.host}`}
                disabled={quote.ms > now}
                onClick={() => setPicked(quote.n)}
              >
                {quote.n}
              </button>
            </li>
          ))}
        </ul>
        <div className="hud-quote" aria-live={done ? "polite" : "off"}>
          {showing ? (
            <>
              <blockquote>“{showing.quote}”</blockquote>
              <p>
                <span className="hud-tick" aria-hidden="true">
                  ✓
                </span>{" "}
                Found on the live page ·{" "}
                <a href={showing.href} target="_blank" rel="noopener noreferrer">
                  {showing.host}, at this sentence ↗
                </a>
              </p>
            </>
          ) : (
            <p className="hud-quote-wait">Each quote is looked up on its own page before it may stay in the plan.</p>
          )}
        </div>
      </section>

      <dl className="hud-totals" aria-hidden="true">
        <div>
          <dt>Exa searches</dt>
          <dd>{searchesBack}</dd>
        </div>
        <div>
          <dt>Pages read</dt>
          <dd>{pagesIn}</dd>
        </div>
        <div>
          <dt>Quotes found</dt>
          <dd>
            {checked.length}/{data.total}
          </dd>
        </div>
        <div>
          <dt>Exa cost</dt>
          <dd>{done ? data.cost : "…"}</dd>
        </div>
      </dl>

      <div className="hud-replay-foot">
        <p>A real run, recorded on {data.recordedOn} and played back at its own speed.</p>
        <div className="hud-actions">
          {reduced ? null : (
            <button type="button" className="hud-btn" onClick={play}>
              Replay
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
