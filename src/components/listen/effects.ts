"use client";

import { progressLine, readResearchStream } from "@/components/autopilot/check";
import { DEFAULTS, type Effects, ResearchFailed, type Settings, type Snapshot } from "@/components/listen/post";
import { type Emergency, emergencySpeech } from "@/lib/emergency";
import { spoken } from "@/lib/listen";

/**
 * What the listening post needs from a browser: the microphone with the browser's own speech-to-text,
 * sound, notifications, the screen lock and the network. Nothing here decides anything.
 *
 * Speech becomes text in the browser's speech service (Chrome and Edge use Google's, Safari uses Apple's).
 * AIDaddy never receives audio.
 */

// The browser's speech recognition is not in TypeScript's own list of browser features.
type SpeechResult = { isFinal: boolean; 0?: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionMaker = new () => Recognition;

function recognitionMaker(): RecognitionMaker | null {
  const browser = window as unknown as { SpeechRecognition?: RecognitionMaker; webkitSpeechRecognition?: RecognitionMaker };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

const SAVED = "aidaddy-listen";
const NOTHING = /^(I could not find anything to research|En löytänyt viestistä)/;

/** One sound context for the page, made on the first tap: a browser plays no sound before that. */
let sound: AudioContext | null = null;
let ringing: number | null = null;
let screenLock: { release(): Promise<void> } | null = null;

/**
 * The emergency words in AIDaddy's voice (public/listen/emergency), decoded when listening starts.
 * They then play at once, without a tap and without the network. They exist for the number 112.
 */
const clips = new Map<string, AudioBuffer>();
const clipUrl = (kind: Emergency, language: Settings["language"]) => `/listen/emergency/${kind}-${language}.mp3`;

async function loadClip(url: string) {
  if (!sound || clips.has(url)) return;
  try {
    const res = await fetch(url);
    if (res.ok) clips.set(url, await sound.decodeAudioData(await res.arrayBuffer()));
  } catch {
    // no clip: the browser's own voice says the words
  }
}

function tone(frequency: number, from: number, length: number, volume = 0.15) {
  if (!sound) return;
  const start = sound.currentTime + from;
  const oscillator = sound.createOscillator();
  const gain = sound.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.linearRampToValueAtTime(0, start + length);
  oscillator.connect(gain).connect(sound.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.05);
}

function ringOnce() {
  // Two short double tones, like a telephone.
  for (const from of [0, 0.5]) {
    tone(440, from, 0.35, 0.2);
    tone(480, from, 0.35, 0.2);
  }
  navigator.vibrate?.([350, 150, 350]);
}

function pingsNow(): Snapshot["pings"] {
  if (typeof Notification === "undefined") return "none";
  return Notification.permission === "granted" ? "on" : Notification.permission === "denied" ? "blocked" : "ask";
}

/** Reads sentence by sentence: some browsers cut a long passage off after a quarter of a minute. */
function sayWithBrowserVoice(text: string, language: Settings["language"], done: () => void): () => void {
  if (!("speechSynthesis" in window)) {
    done();
    return () => {};
  }
  let over = false;
  const finish = () => {
    if (over) return;
    over = true;
    window.clearTimeout(watchdog);
    done();
  };
  // A device whose voice fails without saying so must not leave the call open and the listening paused.
  const watchdog = window.setTimeout(() => {
    window.speechSynthesis.cancel();
    finish();
  }, Math.max(10_000, text.length * 120));
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  window.speechSynthesis.cancel();
  sentences.forEach((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence.trim());
    utterance.lang = language === "fi" ? "fi-FI" : "en-GB";
    if (index === sentences.length - 1) utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });
  return () => {
    window.speechSynthesis.cancel();
    finish();
  };
}

export function browserEffects(): Effects {
  return {
    ears(on) {
      const Maker = recognitionMaker();
      if (!Maker) return null;
      let session: Recognition | null = null;
      return {
        start(language) {
          if (session) return;
          let why: "silence" | "denied" | "trouble" = "silence";
          const recognition = new Maker();
          session = recognition;
          recognition.lang = language === "fi" ? "fi-FI" : "en-US";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onstart = () => on.started();
          recognition.onresult = (event) => {
            for (let index = event.resultIndex; index < event.results.length; index++) {
              const result = event.results[index];
              const text = result[0]?.transcript ?? "";
              if (text.trim()) on.text(text, result.isFinal);
            }
          };
          recognition.onerror = (event) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") why = "denied";
            else if (event.error !== "no-speech" && event.error !== "aborted") why = "trouble";
          };
          recognition.onend = () => {
            if (session === recognition) session = null;
            on.ended(why);
          };
          try {
            recognition.start();
          } catch {
            session = null;
            on.ended("trouble");
          }
        },
        stop() {
          const recognition = session;
          if (!recognition) return;
          session = null;
          // Stopped on purpose: the post decides what happens next, so the end is not reported.
          recognition.onend = null;
          recognition.onresult = null;
          recognition.onerror = null;
          try {
            recognition.abort();
          } catch {
            // already stopped
          }
        },
      };
    },

    async sort(text, code) {
      try {
        const res = await fetch("/api/aidaddy/sort", {
          method: "POST",
          headers: { "content-type": "application/json", "x-demo-code": code.trim() },
          body: JSON.stringify({ text: text.slice(0, 300) }),
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) return "off";
        const { label } = (await res.json()) as { label?: string };
        // As on Telegram: only clear small talk is let pass. Unsure is a matter, the Engine says when there is nothing.
        return label === "small_talk" ? "small" : label === "trigger" || label === "unsure" ? "matter" : "off";
      } catch {
        return "off";
      }
    },

    async research(body, code, onEvent) {
      let res: Response;
      try {
        res = await fetch("/api/research", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "text/event-stream", "x-demo-code": code.trim() },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (error) {
        throw new ResearchFailed(error instanceof DOMException && error.name === "TimeoutError" ? "The research took too long." : "The research engine could not be reached.");
      }
      if (!res.ok || !res.body) {
        const answer = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 422) throw new ResearchFailed(answer?.error ?? "", true);
        if (res.status === 401) throw new ResearchFailed("This site needs its access code. Add ?code=... to the address.");
        if (res.status === 429) throw new ResearchFailed("The demo is busy. AIDaddy will try the next thing it hears.");
        throw new ResearchFailed(answer?.error || `The research engine answered ${res.status}.`);
      }
      try {
        return await readResearchStream(res.body, onEvent);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The research did not finish.";
        throw new ResearchFailed(message, NOTHING.test(message));
      }
    },

    describe: progressLine,
    now: () => Date.now(),
    later(fn, ms) {
      const timer = window.setTimeout(fn, ms);
      return () => window.clearTimeout(timer);
    },
    visible: () => document.visibilityState === "visible",
    onVisible(fn) {
      const listener = () => {
        if (document.visibilityState === "visible") fn();
      };
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },

    awake(on) {
      if (!on) {
        screenLock?.release().catch(() => {});
        screenLock = null;
        return;
      }
      if (screenLock || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          screenLock = lock;
          lock.addEventListener("release", () => {
            if (screenLock === lock) screenLock = null;
          });
        })
        .catch(() => {});
    },

    prime() {
      try {
        sound ??= new AudioContext();
        if (sound.state === "suspended") void sound.resume();
      } catch {
        // no sound on this device: the page still shows everything
      }
    },

    ring(on) {
      if (ringing !== null) {
        window.clearInterval(ringing);
        ringing = null;
      }
      if (!on) {
        navigator.vibrate?.(0);
        return;
      }
      ringOnce();
      ringing = window.setInterval(ringOnce, 2_400);
    },

    chime() {
      tone(660, 0, 0.18);
      tone(880, 0.2, 0.28);
    },

    notify(title, body) {
      if (pingsNow() !== "on") return;
      try {
        const notification = new Notification(title, { body, icon: "/icons/app-192.png", tag: "aidaddy-listen" });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Some phones only show a notification from an installed app. The page still rings and shows the result.
      }
    },
    pings: pingsNow,
    async askPings() {
      if (typeof Notification === "undefined") return "none";
      try {
        await Notification.requestPermission();
      } catch {
        // an old browser that only takes a callback: read the state below
      }
      return pingsNow();
    },

    say(result, language, done) {
      const text = spoken(result, language);
      let stopBrowserVoice: (() => void) | null = null;
      let over = false;
      const finish = () => {
        if (over) return;
        over = true;
        done();
      };
      // The case's own audio, in AIDaddy's voice, when this server has one. Otherwise the browser's voice.
      const audio = new Audio(`/api/cases/${encodeURIComponent(result.id)}/audio`);
      const fallBack = () => {
        if (over || stopBrowserVoice) return;
        stopBrowserVoice = sayWithBrowserVoice(text, language, finish);
      };
      audio.onended = finish;
      audio.onerror = fallBack;
      audio.play().catch(fallBack);
      return () => {
        audio.pause();
        stopBrowserVoice?.();
        finish();
      };
    },

    ready(language, number) {
      if (number !== "112") return;
      for (const kind of ["seizure", "unresponsive", "choking", "help"] as const) void loadClip(clipUrl(kind, language));
    },

    warn(kind, language, number, done) {
      let over = false;
      let stop: (() => void) | null = null;
      const finish = () => {
        if (over) return;
        over = true;
        done();
      };
      // Three short high tones, then the words.
      for (const from of [0, 0.22, 0.44]) tone(880, from, 0.16, 0.3);
      navigator.vibrate?.([200, 100, 200, 100, 200]);
      const clip = number === "112" ? clips.get(clipUrl(kind, language)) : undefined;
      if (clip && sound?.state === "running") {
        const source = sound.createBufferSource();
        source.buffer = clip;
        source.connect(sound.destination);
        source.onended = finish;
        source.start(sound.currentTime + 0.75);
        stop = () => {
          source.onended = null;
          try {
            source.stop();
          } catch {
            // already over
          }
        };
      } else {
        const timer = window.setTimeout(() => {
          stop = sayWithBrowserVoice(emergencySpeech(kind, language, number), language, finish);
        }, 750);
        stop = () => window.clearTimeout(timer);
      }
      return () => {
        stop?.();
        finish();
      };
    },

    load() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(SAVED) ?? "{}") as Partial<Settings>;
        return {
          language: saved.language === "fi" ? "fi" : DEFAULTS.language,
          country: typeof saved.country === "string" && saved.country ? saved.country : DEFAULTS.country,
          city: typeof saved.city === "string" ? saved.city.slice(0, 80) : "",
          model: saved.model === true,
        };
      } catch {
        return {};
      }
    },
    save(settings) {
      try {
        window.localStorage.setItem(SAVED, JSON.stringify({ language: settings.language, country: settings.country, city: settings.city, model: settings.model }));
      } catch {
        // storage is off: the settings last as long as the page
      }
    },
  };
}
