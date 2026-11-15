"use client";

import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TryResult } from "@/components/try-result";
import { Core } from "@/components/hud/core";
import { browserEffects } from "@/components/listen/effects";
import { INITIAL, type Job, type Line, ListeningPost, type Snapshot } from "@/components/listen/post";
import { useAccessCode } from "@/components/site/access-code";
import { DESKS } from "@/lib/listen";

const COUNTRIES = [
  ["FI", "Finland"],
  ["SE", "Sweden"],
  ["EE", "Estonia"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["NL", "Netherlands"],
  ["IT", "Italy"],
  ["IE", "Ireland"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
] as const;

const STATUS: Record<Snapshot["status"], string> = {
  off: "Not listening",
  listening: "Listening on this device",
  paused: "Paused",
  denied: "Microphone blocked",
  unsupported: "This browser cannot listen",
  trouble: "Trying to listen",
};

const TAGS: Record<Line["tag"], string> = {
  small: "Small talk. Stays on this device.",
  event: "A matter for AIDaddy. Sent to research.",
  repeat: "Already on it.",
  rest: "Resting: enough research for this half hour.",
};

function outcome(job: Job): string {
  if (job.state === "collecting") return "Listening for more";
  if (job.state === "working") return "Working";
  if (job.state === "nothing") return "Nothing to do";
  if (job.state === "failed") return "Could not finish";
  if (job.call === "ringing") return "Calling you";
  if (job.call === "answered") return "Called you";
  if (job.call === "missed") return "Missed call";
  if (job.call === "declined") return "Call declined";
  return "Pinged you";
}

/** One matter a desk took on: what was heard, what the desk is doing, and the plan with its sources. */
function JobCard({ job, post, busy }: { job: Job; post: ListeningPost; busy: boolean }) {
  return (
    <li className="listen-job" data-state={job.state} data-how={job.how}>
      <p className="listen-job-head">
        <span>{DESKS[job.desk].name} · heard at {new Date(job.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span className="listen-job-outcome">{outcome(job)}</span>
      </p>
      <p className="listen-job-heard">“{job.heard}”</p>
      {job.progress ? <p className="listen-job-progress">{job.progress}</p> : null}
      {job.result ? (
        <>
          <TryResult result={job.result} />
          <button type="button" className="hud-btn" disabled={busy} onClick={() => post.read(job.id)}>
            Hear it
          </button>
        </>
      ) : null}
    </li>
  );
}

/** AIDaddy calling: a ring, then the plan read aloud. Shown over the whole page, like a phone call. */
function Call({ job, speaking, post }: { job: Job; speaking: boolean; post: ListeningPost }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  useEffect(() => { dialog.current?.querySelector("button")?.focus(); }, [speaking]);
  return (
    <dialog ref={dialog} className="listen-call" aria-labelledby="listen-call-title" onCancel={(event) => { event.preventDefault(); if (speaking) post.hangUp(); else post.decline(job.id); }}>
      <div className="listen-call-box">
        <Core state="active" className="listen-call-core" />
        <h2 id="listen-call-title">AIDaddy {speaking ? "is telling you" : "is calling"}</h2>
        <p className="listen-call-about">{job.result?.title}</p>
        <p className="listen-call-heard">It heard: “{job.heard}”</p>
        {speaking ? (
          <button type="button" className="hud-btn listen-call-end" onClick={() => post.hangUp()}>
            Hang up
          </button>
        ) : (
          <div className="listen-call-buttons">
            <button type="button" className="hud-btn hud-btn--primary" onClick={() => post.answer(job.id)}>
              Answer
            </button>
            <button type="button" className="hud-btn" onClick={() => post.decline(job.id)}>
              Not now
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

/**
 * The listening post (/listen): one device, left open, that hears the household and comes back with a plan.
 *
 * It listens only after Start is pressed and only while this page is open and on screen. The browser turns speech
 * into text; the rules in src/lib/listen.ts decide here which sentence is a matter for AIDaddy; only that sentence
 * and its close neighbours go to the research Engine. See post.ts for the whole flow.
 */
export function ListenPost({ needsCode }: { needsCode: boolean }) {
  // One post per page. It touches the browser only when something is pressed.
  const [post] = useState(() => new ListeningPost(browserEffects()));
  const state = useSyncExternalStore(post.subscribe, post.getSnapshot, () => INITIAL);
  const code = useAccessCode();
  const [typed, setTyped] = useState("");

  const on = state.status !== "off" && state.status !== "denied" && state.status !== "unsupported";
  const working = state.jobs.some((job) => job.state === "collecting" || job.state === "working");
  const calling = state.jobs.find((job) => job.id === (state.ringing ?? state.speaking));
  const blocked = needsCode && !code;

  const start = () => {
    post.change({ code });
    post.start();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!typed.trim()) return;
    post.change({ code });
    post.type(typed);
    setTyped("");
  };

  return (
    <div className="listen">
      <section className="hud-panel listen-main" aria-labelledby="listen-status">
        <Core state={working ? "active" : "idle"} className={`listen-core${on ? "" : " is-off"}`} />
        <div className="listen-main-text">
          <p id="listen-status" className="listen-status" data-status={state.status} role="status">
            <i aria-hidden="true" /> {STATUS[state.status]}
          </p>
          {state.note ? <p className="listen-note">{state.note}</p> : null}
          {blocked ? <p className="listen-note">This site needs its access code first. Open this page from the team&apos;s QR code.</p> : null}
          <div className="hud-actions">
            {on ? (
              <button type="button" className="hud-btn" onClick={() => post.stop()}>
                Stop listening
              </button>
            ) : (
              <button type="button" className="hud-btn hud-btn--primary" onClick={start} disabled={blocked}>
                Start listening on this device
              </button>
            )}
            {state.pings === "ask" ? (
              <button type="button" className="hud-btn" onClick={() => void post.allowPings()}>
                Allow notifications
              </button>
            ) : null}
          </div>
          <div className="listen-settings">
            <label>
              Spoken language
              <select value={state.settings.language} onChange={(event) => post.change({ language: event.target.value === "fi" ? "fi" : "en" })}>
                <option value="en">English</option>
                <option value="fi">Finnish</option>
              </select>
            </label>
            <label>
              Country
              <select value={state.settings.country} onChange={(event) => post.change({ country: event.target.value })}>
                {COUNTRIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              City
              <input value={state.settings.city} maxLength={80} placeholder="for example Espoo" onChange={(event) => post.change({ city: event.target.value })} />
            </label>
          </div>
        </div>
      </section>

      <div className="listen-grid">
        <section className="hud-panel" aria-labelledby="listen-heard">
          <p className="hud-panel-title">
            <span id="listen-heard">Heard on this device</span>
            <span>cleared when you close the page</span>
          </p>
          <div className="listen-heard">
            {state.lines.length === 0 && !state.interim ? (
              <p className="listen-empty">Nothing yet. Press Start and talk, or type a sentence below.</p>
            ) : (
              <ol>
                {state.lines.slice(-10).map((line) => (
                  <li key={line.id} data-tag={line.tag}>
                    <p>{line.text}</p>
                    <span>{TAGS[line.tag]}</span>
                  </li>
                ))}
              </ol>
            )}
            {state.interim ? <p className="listen-interim">{state.interim}…</p> : null}
            {state.lines.length > 0 ? <button type="button" className="hud-btn" onClick={() => post.forget()}>Forget what was heard</button> : null}
            <form onSubmit={submit} className="listen-type">
              <label htmlFor="listen-typed">Or type what was said</label>
              <div>
                <input
                  id="listen-typed"
                  value={typed}
                  maxLength={300}
                  placeholder="Our flight to Lisbon was cancelled"
                  onChange={(event) => setTyped(event.target.value)}
                />
                <button type="submit" className="hud-btn" disabled={blocked || !typed.trim()}>
                  Say it
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="listen-results" aria-labelledby="listen-desks">
          <p className="hud-panel-title">
            <span id="listen-desks">Desks at work</span>
            <span>a call for a deadline, a ping for the rest</span>
          </p>
          {state.jobs.length === 0 ? (
            <p className="listen-empty listen-empty--desks">
              Nothing yet. When someone mentions a letter, a deadline, a life event or a plan that has rules, a desk looks up the official pages and comes back here.
            </p>
          ) : (
            <ul className="listen-jobs">
              {[...state.jobs].reverse().map((job) => (
                <JobCard key={job.id} job={job} post={post} busy={state.ringing !== null || state.speaking !== null} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {calling ? <Call job={calling} speaking={state.speaking === calling.id} post={post} /> : null}
    </div>
  );
}
