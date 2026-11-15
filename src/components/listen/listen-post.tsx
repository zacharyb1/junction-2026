"use client";

import { type FormEvent, useState, useSyncExternalStore } from "react";
import { browserEffects } from "@/components/listen/effects";
import { type Alarm, INITIAL, type Job, type Line, ListeningPost, type Settings, type Snapshot } from "@/components/listen/post";
import { useAccessCode } from "@/components/site/access-code";
import { Core } from "@/components/site/core";
import { TryResult } from "@/components/try-result";
import { emergencyNumber, emergencyWords, SOURCES } from "@/lib/emergency";
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

const MIC_TEXT: Record<Snapshot["status"], string> = {
  off: "The microphone is off. Nothing is heard.",
  listening: "Listening on this device. Small talk stays here.",
  paused: "Paused.",
  denied: "The microphone is blocked.",
  unsupported: "This browser cannot listen.",
  trouble: "Trying to listen.",
};

const TAGS: Record<Line["tag"], string> = {
  small: "Let pass: small talk",
  event: "Noticed: a matter for AIDaddy",
  repeat: "Let pass: already on it",
  rest: "Let pass: enough research for this half hour",
  emergency: "Emergency: AIDaddy spoke up",
};

const field = "h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base outline-none transition-colors focus-visible:border-ring md:text-sm";

const noticed = (line: Line) => line.tag === "event" || line.tag === "emergency";

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** How AIDaddy came back about a finished matter. */
function cameBack(job: Job): string {
  if (job.call === "ringing") return "AIDaddy is calling about this.";
  if (job.call === "answered") return "AIDaddy called, and you answered.";
  if (job.call === "missed") return "AIDaddy called. Nobody answered.";
  if (job.call === "declined") return "AIDaddy called. You said not now.";
  return "AIDaddy pinged you about this.";
}

/** One matter a desk took on: what was heard, what the desk is doing, and the plan with its sources. */
function Matter({ job, post, busy }: { job: Job; post: ListeningPost; busy: boolean }) {
  return (
    <article className="grid grid-cols-1 gap-3">
      <div className="site-row site-row--amber">
        <p className="site-eyebrow site-eyebrow--amber">
          Heard at {clock(job.at)} · {DESKS[job.desk].name}
        </p>
        <p>“{job.heard}”</p>
        {job.state === "collecting" ? <p className="site-status mt-1">Listening for what comes next.</p> : null}
        {job.state === "working" ? <p className="site-status mt-1">Looking it up: {job.progress}</p> : null}
        {job.state === "nothing" ? <p className="site-status mt-1">Nothing to look up in that. AIDaddy stays quiet.</p> : null}
        {job.state === "failed" ? <p className="site-status mt-1">The research did not run: {job.progress}</p> : null}
        {job.state === "done" ? <p className="site-status mt-1">{cameBack(job)}</p> : null}
      </div>
      {job.result ? (
        <>
          <TryResult result={job.result} />
          <button type="button" className="site-btn site-btn--compact justify-self-start" disabled={busy} onClick={() => post.read(job.id)}>
            Hear it
          </button>
        </>
      ) : null}
    </article>
  );
}

/** AIDaddy calling: a ring, then the plan read aloud. Shown over the whole page, like a phone call. */
function Call({ job, speaking, post }: { job: Job; speaking: boolean; post: ListeningPost }) {
  return (
    <div className="listen-call" role="dialog" aria-modal="true" aria-labelledby="listen-call-title">
      <div className="listen-call-box">
        <Core state="active" className="listen-call-core" />
        <p className="site-eyebrow site-eyebrow--amber">{speaking ? "On the call" : "Incoming call"}</p>
        <h2 id="listen-call-title" className="site-h2">
          AIDaddy {speaking ? "is telling you" : "is calling"}
        </h2>
        <p className="listen-call-about">{job.result?.title}</p>
        <p className="site-note">It heard: “{job.heard}”</p>
        {speaking ? (
          <button type="button" className="site-btn listen-call-wide" onClick={() => post.hangUp()}>
            Hang up
          </button>
        ) : (
          <div className="listen-call-buttons">
            <button type="button" className="site-btn site-btn--primary" onClick={() => post.answer(job.id)}>
              Answer
            </button>
            <button type="button" className="site-btn" onClick={() => post.decline(job.id)}>
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * An emergency AIDaddy heard: it says at once what to do, and shows the same words. The words are fixed and follow
 * the Finnish Red Cross (src/lib/emergency.ts). AIDaddy cannot call the emergency number; the button opens the phone.
 */
function Emergency({ alarm, settings, post }: { alarm: Alarm; settings: Settings; post: ListeningPost }) {
  const number = emergencyNumber(settings.country);
  const words = emergencyWords(alarm.kind, settings.language, number);
  const source = SOURCES[alarm.kind];
  return (
    <div className="listen-call" role="alertdialog" aria-modal="true" aria-labelledby="listen-alarm-title">
      <div className="listen-call-box listen-alarm">
        <p className="site-eyebrow listen-alarm-eyebrow">{alarm.speaking ? "AIDaddy is telling you what to do" : "Emergency"}</p>
        <h2 id="listen-alarm-title" className="listen-alarm-number">
          Call {number} now
        </h2>
        <p className="site-note">It heard: “{alarm.heard}”</p>
        <ol className="listen-alarm-steps">
          {words.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <a className="site-btn listen-alarm-call listen-call-wide" href={`tel:${number}`}>
          Open the phone to call {number}
        </a>
        <div className="listen-call-buttons">
          {alarm.speaking ? (
            <button type="button" className="site-btn" onClick={() => post.hangUp()}>
              Stop talking
            </button>
          ) : (
            <button type="button" className="site-btn" onClick={() => post.again()}>
              Say it again
            </button>
          )}
          <button type="button" className="site-btn" onClick={() => post.dismiss()}>
            Close
          </button>
        </div>
        <p className="site-note">
          AIDaddy cannot call for you. These are first aid words from{" "}
          <a href={source.url} target="_blank" rel="noreferrer" className="underline">
            {source.name}
          </a>
          , not a diagnosis.
        </p>
      </div>
    </div>
  );
}

/**
 * The listening page (/listen): one device, left open, that hears the household and comes back with a plan.
 *
 * It listens only after Start is pressed and only while this page is open and on screen. The browser turns speech
 * into text; the rules in src/lib/listen.ts decide here which sentence is a matter for AIDaddy; only that sentence
 * and its close neighbours go to the research Engine. A result comes back as a call when the plan has a deadline or
 * the matter is urgent, and as a ping otherwise. An emergency is answered at once, aloud, with fixed first aid words.
 * See post.ts for the whole flow.
 */
export function ListenPost({ needsCode }: { needsCode: boolean }) {
  // One post per page. It touches the browser only when something is pressed.
  const [post] = useState(() => new ListeningPost(browserEffects()));
  const state = useSyncExternalStore(post.subscribe, post.getSnapshot, () => INITIAL);
  const code = useAccessCode();
  const [typed, setTyped] = useState("");

  const on = state.status === "listening" || state.status === "paused" || state.status === "trouble";
  const working = state.jobs.some((job) => job.state === "working");
  const collecting = state.jobs.some((job) => job.state === "collecting");
  const calling = state.jobs.find((job) => job.id === (state.ringing ?? state.speaking));
  const blocked = needsCode && !code;
  const busy = state.ringing !== null || state.speaking !== null;

  const stateWord = working ? "Looking it up" : collecting ? "Noticed something" : state.status === "listening" ? "Listening" : on ? "Paused" : "Off";
  const stateTone = working ? "text-primary" : collecting || (on && state.status !== "listening") ? "text-(--hud-amber)" : on ? "text-(--hud-green)" : undefined;

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
    <>
      <div className="grid grid-cols-1 gap-6">
        <section className="site-panel" aria-labelledby="listen-title">
          <div className="site-panel-title">
            <h2 id="listen-title">Microphone</h2>
            <span className={stateTone} role="status">
              {stateWord}
            </span>
          </div>
          <div className="site-panel-body grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4">
              <Core state={working ? "active" : state.jobs.some((job) => job.state === "done") ? "done" : "idle"} className="hud-core--tiny" />
              <div className="min-w-0 flex-1">
                <p>{state.note || MIC_TEXT[state.status]}</p>
                {state.interim ? <p className="site-status mt-1 line-clamp-2 text-muted-foreground">… {state.interim}</p> : null}
              </div>
            </div>
            <div className="site-actions">
              {on ? (
                <button type="button" className="site-btn site-btn--amber" onClick={() => post.stop()}>
                  Stop listening
                </button>
              ) : (
                <button type="button" className="site-btn site-btn--primary" onClick={start} disabled={blocked}>
                  Start listening
                </button>
              )}
              {state.pings === "ask" ? (
                <button type="button" className="site-btn" onClick={() => void post.allowPings()}>
                  Allow notifications
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Country
                <select className={field} value={state.settings.country} onChange={(event) => post.change({ country: event.target.value })}>
                  {COUNTRIES.map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                City
                <input className={field} value={state.settings.city} onChange={(event) => post.change({ city: event.target.value })} placeholder="Espoo" maxLength={80} />
              </label>
              <label className="grid gap-1 text-sm">
                Spoken language
                <select className={field} value={state.settings.language} onChange={(event) => post.change({ language: event.target.value === "fi" ? "fi" : "en" })}>
                  <option value="en">English</option>
                  <option value="fi">Finnish</option>
                </select>
              </label>
            </div>
            <form className="grid gap-2" onSubmit={submit}>
              <label htmlFor="listen-typed" className="text-sm">
                No microphone, or a loud room? Type a sentence the way it would be said.
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="listen-typed"
                  className={`${field} min-w-0 flex-1`}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="Our flight to Lisbon was cancelled."
                  maxLength={300}
                  autoComplete="off"
                />
                <button type="submit" className="site-btn" disabled={blocked || !typed.trim()}>
                  Say it
                </button>
              </div>
            </form>
            {blocked ? <p className="site-row site-row--amber site-status">This site needs its access code first. Open this page from the team&apos;s QR code.</p> : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4" aria-labelledby="matters-title" aria-live="polite">
          <h2 id="matters-title" className="site-h2">
            What AIDaddy did without being asked
          </h2>
          {state.jobs.length === 0 ? (
            <p className="site-note">
              Nothing yet. When someone mentions a letter, a deadline, a life event or a plan that has rules, a desk looks up the official
              pages and comes back here: a call when the plan has a deadline or the matter is urgent, a ping for everything else.
            </p>
          ) : null}
          {[...state.jobs].reverse().map((job) => (
            <Matter key={job.id} job={job} post={post} busy={busy} />
          ))}
        </section>
      </div>

      <div className="site-rail">
        <section className="site-panel" aria-labelledby="heard-title">
          <div className="site-panel-title">
            <h2 id="heard-title">Heard in the room</h2>
            <span>Stays on this page</span>
          </div>
          <div className="site-panel-body grid grid-cols-1 gap-3">
            {state.lines.length === 0 ? <p className="site-note">Nothing yet.</p> : null}
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {state.lines.slice(-10).map((line) => (
                <li key={line.id} className={noticed(line) ? "site-row site-row--amber" : "site-row"}>
                  <p className={noticed(line) ? "site-eyebrow site-eyebrow--amber" : "site-eyebrow site-eyebrow--dim"}>{TAGS[line.tag]}</p>
                  <p className={noticed(line) ? undefined : "text-muted-foreground"}>{line.text}</p>
                </li>
              ))}
            </ul>
            {state.lines.length > 0 ? (
              <button type="button" className="site-btn site-btn--compact justify-self-start" onClick={() => post.forget()}>
                Forget what was heard
              </button>
            ) : null}
          </div>
        </section>
        <section className="site-panel" aria-labelledby="rules-title">
          <div className="site-panel-title">
            <h2 id="rules-title">What happens to the sound</h2>
          </div>
          <ul className="site-panel-body grid grid-cols-1 gap-3 text-sm">
            <li>Your browser turns speech into text. Chrome, Edge and Safari use their maker&apos;s speech service for that. AIDaddy&apos;s server receives no sound.</li>
            <li>Small talk stays on this page. Only a sentence AIDaddy notices, with the two sentences before and after it, is sent to the research engine.</li>
            <li>It listens while this page is open and in front. Press stop, or close the page, and nothing is heard. It hears everyone near the device, so tell the people in the room.</li>
            <li>What was heard is gone when the page closes. A plan is kept as a case file under a link nobody can guess.</li>
            <li>
              In an emergency (a seizure, someone who does not wake up or is not breathing, choking, a cry for an ambulance) AIDaddy speaks up at once,
              without being asked: call the emergency number first, then the Finnish Red Cross first aid steps. Those words are fixed and stored on
              this page; nothing is sent. AIDaddy cannot call the emergency number for you.
            </li>
            <li>The call rings on this device. It cannot ring a phone number or reach your other devices.</li>
            <li>At most five matters in half an hour, and the same matter not twice in twenty minutes, so a lively room cannot spend the research credit.</li>
            <li>AIDaddy looks things up and tells you. It never sends, files, books or pays.</li>
          </ul>
        </section>
      </div>

      {calling && !state.alarm ? <Call job={calling} speaking={state.speaking === calling.id} post={post} /> : null}
      {state.alarm ? <Emergency alarm={state.alarm} settings={state.settings} post={post} /> : null}
    </>
  );
}
