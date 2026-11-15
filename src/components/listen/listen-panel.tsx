"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { progressLine, readResearchStream, refusal } from "@/components/autopilot/check";
import { useAccessCode } from "@/components/site/access-code";
import { Core } from "@/components/site/core";
import { TryResult } from "@/components/try-result";
import type { ResearchResult } from "@/lib/engine/research";
import { hear, MAX_WAIT_MS, sameMatter, SESSION_LIMIT, SETTLE_MS, situation, spell, tidy, type Verdict } from "@/lib/listen";

/**
 * The listening page: AIDaddy follows the talk in the room and acts without being asked.
 *
 * The browser's own speech recognition turns sound into sentences. Each sentence goes through the local
 * decisions in src/lib/listen.ts. Small talk stays on this page. A noticed matter becomes one research
 * question for the Engine (`POST /api/research`, the same call as /try), and the plan with its sources
 * appears here. Nothing is sent on anyone's behalf: the page only researches and shows.
 */

// The browser's speech recognition, as far as this page uses it. TypeScript's DOM library does not describe it.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionMaker = new () => Recognition;

function recognitionMaker(): RecognitionMaker | null {
  const scope = window as unknown as { SpeechRecognition?: RecognitionMaker; webkitSpeechRecognition?: RecognitionMaker };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

const subscribe = () => () => {};
const canHear = () => Boolean(recognitionMaker());

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

/** The languages the room may speak: what the browser listens for, and what the plan is written in. */
const SPEECH = [
  ["en-US", "English", "en"],
  ["fi-FI", "Suomi", "fi"],
] as const;

// 44 px tall, so a thumb hits it, and 16 px text on a phone, so iOS does not zoom into the field.
const field = "h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base outline-none transition-colors focus-visible:border-ring md:text-sm";

type Mic = "off" | "on" | "blocked" | "trouble";
type Line = { id: number; text: string; noticed: boolean; why: Verdict["why"] | "same thought" };
type Matter = {
  id: number;
  asked: string;
  time: string;
  state: "running" | "done" | "nothing" | "failed";
  line?: string;
  result?: ResearchResult;
  error?: string;
};

/** The Engine's own refusals: there was nothing to look up in the words. An answer, not a fault. */
const NOTHING = /^(I could not find anything to research|En löytänyt viestistä)/;

const MIC_TEXT: Record<Mic, string> = {
  off: "Off. Nothing is heard.",
  on: "Listening. Small talk stays on this page.",
  blocked: "The browser did not allow the microphone. Allow it for this site in the address bar, then start again.",
  trouble: "The browser's speech service cannot be reached right now. AIDaddy keeps trying.",
};

export function ListenPanel() {
  const code = useAccessCode();
  const supported = useSyncExternalStore(subscribe, canHear, () => false);
  const [mic, setMic] = useState<Mic>("off");
  const [interim, setInterim] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [country, setCountry] = useState("FI");
  const [region, setRegion] = useState("");
  const [speech, setSpeech] = useState<(typeof SPEECH)[number][0]>("en-US");
  const [notify, setNotify] = useState(false);

  const recognition = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const faults = useRef(0);
  const lock = useRef<{ release(): Promise<void> } | null>(null);
  const pending = useRef<{ lines: string[]; firstAt: number; timer: number } | null>(null);
  const busy = useRef(false);
  const queued = useRef<string | null>(null);
  const asked = useRef<string[]>([]);
  const seq = useRef(0);
  const request = useRef<AbortController | null>(null);
  // The settings as they are when a matter is looked up, which can be seconds after the sentence was said.
  const settings = useRef({ code, country, region, speech, notify });
  useEffect(() => {
    settings.current = { code, country, region, speech, notify };
  });

  const busyNow = matters.some((matter) => matter.state === "running");

  async function look(question: string) {
    const id = ++seq.current;
    busy.current = true;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMatters((all) => [{ id, asked: question, time, state: "running", line: "Asking the research engine" }, ...all]);
    const update = (patch: Partial<Matter>) => setMatters((all) => all.map((matter) => (matter.id === id ? { ...matter, ...patch } : matter)));
    const controller = new AbortController();
    request.current = controller;
    const now = settings.current;
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream", "x-demo-code": now.code.trim() },
        body: JSON.stringify({
          situation: question,
          country: now.country,
          region: now.region.trim() || undefined,
          language: SPEECH.find(([tag]) => tag === now.speech)?.[2] ?? "en",
        }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(refusal(res.status, body?.error));
      }
      const result = await readResearchStream(res.body, (event) => {
        const line = progressLine(event);
        if (line) update({ line });
      });
      update({ state: "done", result });
      // A plan that arrives while the page is in the background reaches the person as a notification.
      if (now.notify && document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("AIDaddy looked something up", { body: result.title });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof DOMException && error.name === "TimeoutError"
          ? "The research engine took too long."
          : error instanceof TypeError
            ? "The research engine could not be reached."
            : error instanceof Error
              ? error.message
              : "The research failed.";
      update(NOTHING.test(message) ? { state: "nothing", error: message } : { state: "failed", error: message });
    } finally {
      busy.current = false;
      const next = queued.current;
      queued.current = null;
      if (next) propose(next);
    }
  }

  /** A matter AIDaddy noticed. It is looked up unless it is already on the page, or this visit has used its runs. */
  function propose(question: string) {
    if (question.length < 10) return;
    if (busy.current) {
      // One at a time. What was noticed meanwhile waits; a newer matter takes the place of an older waiting one.
      queued.current = question;
      return;
    }
    if (asked.current.some((earlier) => sameMatter(earlier, question))) {
      setNote("AIDaddy heard that matter again. Its plan is already below.");
      return;
    }
    if (asked.current.length >= SESSION_LIMIT) {
      setNote(`AIDaddy has looked up ${SESSION_LIMIT} matters in this visit and stops there. Reload the page to go on.`);
      return;
    }
    asked.current.push(question);
    setNote("");
    void look(question);
  }

  function settle() {
    const thought = pending.current;
    pending.current = null;
    setCollecting(false);
    if (thought) propose(situation(thought.lines));
  }

  function schedule() {
    const thought = pending.current;
    if (!thought) return;
    window.clearTimeout(thought.timer);
    const wait = Math.min(SETTLE_MS, Math.max(0, thought.firstAt + MAX_WAIT_MS - Date.now()));
    thought.timer = window.setTimeout(settle, wait);
  }

  /** One finished sentence, from the microphone or typed: let pass, or noticed. */
  function take(raw: string) {
    const text = spell(tidy(raw));
    if (!text) return;
    const verdict = hear(text);
    const thought = pending.current;
    setLines((all) =>
      [{ id: ++seq.current, text, noticed: verdict.wake || Boolean(thought), why: !verdict.wake && thought ? ("same thought" as const) : verdict.why }, ...all].slice(0, 40),
    );
    if (thought) {
      // The thought goes on: what follows a noticed sentence belongs to it until the room pauses.
      thought.lines.push(text);
      schedule();
    } else if (verdict.wake) {
      // The thought starts at the noticed sentence. What was said before it was let pass and stays on the page.
      pending.current = { lines: [text], firstAt: Date.now(), timer: 0 };
      setCollecting(true);
      schedule();
    }
  }

  function keepAwake() {
    const wakeLock = (navigator as unknown as { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
    wakeLock
      ?.request("screen")
      .then((held) => {
        lock.current = held;
      })
      .catch(() => {
        // The screen may dim. Listening goes on while the page is in front.
      });
  }

  function stop(state: Mic = "off") {
    wanted.current = false;
    recognition.current?.abort();
    recognition.current = null;
    void lock.current?.release().catch(() => {});
    lock.current = null;
    setInterim("");
    setMic(state);
  }

  function start() {
    const Maker = recognitionMaker();
    if (!Maker) return;
    wanted.current = true;
    faults.current = 0;
    const rec = new Maker();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = settings.current.speech;
    rec.onresult = (event) => {
      faults.current = 0;
      setMic("on");
      let live = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) take(result[0].transcript);
        else live += result[0].transcript;
      }
      setInterim(tidy(live));
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") stop("blocked");
      else if (event.error === "network" || event.error === "language-not-supported") {
        faults.current += 1;
        setMic("trouble");
      }
      // "no-speech" and "aborted" are a quiet room and a restart. Neither is a fault.
    };
    rec.onend = () => {
      // The browser ends a session after a while, or after a long silence. While the switch is on, it starts again.
      if (!wanted.current) return;
      if (faults.current >= 6) return stop("trouble");
      window.setTimeout(
        () => {
          if (!wanted.current) return;
          try {
            rec.start();
          } catch {
            // Already running: nothing to do.
          }
        },
        faults.current ? 2000 : 300,
      );
    };
    recognition.current = rec;
    try {
      rec.start();
      setMic("on");
      keepAwake();
    } catch {
      stop("blocked");
    }
  }

  // Leaving the page ends the listening and any run in progress. Coming back to the page takes the screen lock again.
  useEffect(() => {
    const visible = () => {
      if (wanted.current && document.visibilityState === "visible") keepAwake();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      wanted.current = false;
      recognition.current?.abort();
      request.current?.abort();
      if (pending.current) window.clearTimeout(pending.current.timer);
      void lock.current?.release().catch(() => {});
    };
  }, []);

  const listening = mic === "on" || mic === "trouble";
  const stateWord = busyNow ? "Looking it up" : collecting ? "Noticed something" : listening ? "Listening" : "Off";
  const stateTone = busyNow ? "text-primary" : collecting ? "text-(--hud-amber)" : listening ? "text-(--hud-green)" : undefined;

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
              <Core state={busyNow ? "active" : matters.some((matter) => matter.state === "done") ? "done" : "idle"} className="hud-core--tiny" />
              <div className="min-w-0 flex-1">
                <p>{supported ? MIC_TEXT[mic] : "This browser cannot turn speech into text. Open this page in Chrome, Edge or Safari, or type a sentence below."}</p>
                {interim ? <p className="site-status mt-1 line-clamp-2 text-muted-foreground">… {interim}</p> : null}
              </div>
            </div>
            <div className="site-actions">
              {listening ? (
                <button type="button" className="site-btn site-btn--amber" onClick={() => stop()}>
                  Stop listening
                </button>
              ) : (
                <button type="button" className="site-btn site-btn--primary" onClick={start} disabled={!supported}>
                  Start listening
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Country
                <select className={field} value={country} onChange={(event) => setCountry(event.target.value)}>
                  {COUNTRIES.map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                City
                <input className={field} value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Espoo" maxLength={80} />
              </label>
              <label className="grid gap-1 text-sm">
                Spoken language
                <select className={field} value={speech} onChange={(event) => setSpeech(event.target.value as typeof speech)} disabled={listening}>
                  {SPEECH.map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notify}
                onChange={(event) => {
                  setNotify(event.target.checked);
                  if (event.target.checked && "Notification" in window && Notification.permission === "default") void Notification.requestPermission();
                }}
              />
              Send me a notification when a plan is ready and this page is in the background
            </label>
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                take(typed);
                setTyped("");
              }}
            >
              <label htmlFor="listen-typed" className="text-sm">
                No microphone, or a loud room? Type a sentence the way it would be said.
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="listen-typed"
                  className={`${field} min-w-0 flex-1`}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="The landlord sent a letter. They want to raise the rent."
                  maxLength={400}
                  autoComplete="off"
                />
                <button type="submit" className="site-btn" disabled={!tidy(typed)}>
                  Say it
                </button>
              </div>
            </form>
            {note ? <p className="site-row site-row--amber site-status">{note}</p> : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4" aria-labelledby="matters-title" aria-live="polite">
          <h2 id="matters-title" className="site-h2">
            What AIDaddy did without being asked
          </h2>
          {matters.length === 0 ? (
            <p className="site-note">
              Nothing yet. When someone mentions a letter, a deadline, a life event or a plan that has rules, the official pages are looked up
              and the plan appears here.
            </p>
          ) : null}
          {matters.map((matter) => (
            <article key={matter.id} className="grid grid-cols-1 gap-3">
              <div className="site-row site-row--amber">
                <p className="site-eyebrow site-eyebrow--amber">Heard at {matter.time}</p>
                <p>“{matter.asked}”</p>
                {matter.state === "running" ? <p className="site-status mt-1">Looking it up: {matter.line}</p> : null}
                {matter.state === "nothing" ? <p className="site-status mt-1">Nothing to look up in that. AIDaddy stays quiet.</p> : null}
                {matter.state === "failed" ? <p className="site-status mt-1">The research did not run: {matter.error}</p> : null}
              </div>
              {matter.result ? <TryResult result={matter.result} /> : null}
            </article>
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
            {lines.length === 0 ? <p className="site-note">Nothing yet.</p> : null}
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {lines.map((line) => (
                <li key={line.id} className={line.noticed ? "site-row site-row--amber" : "site-row"}>
                  <p className={line.noticed ? "site-eyebrow site-eyebrow--amber" : "site-eyebrow site-eyebrow--dim"}>
                    {line.noticed ? `Noticed: ${line.why}` : `Let pass: ${line.why}`}
                  </p>
                  <p className={line.noticed ? undefined : "text-muted-foreground"}>{line.text}</p>
                </li>
              ))}
            </ul>
            {lines.length > 0 ? (
              <button type="button" className="site-btn site-btn--compact justify-self-start" onClick={() => setLines([])}>
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
            <li>Small talk stays on this page. Only the sentences AIDaddy notices are sent to the research engine, as one question.</li>
            <li>It listens while this page is open and in front. Press stop, or close the page, and nothing is heard.</li>
            <li>What was heard is gone when the page closes. A plan is kept as a case file under a link nobody can guess.</li>
            <li>AIDaddy looks things up and shows them. It never sends, files, books or pays.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
