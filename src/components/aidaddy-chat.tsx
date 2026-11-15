"use client";

import { Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AIDaddyAvatar, type AvatarState } from "@/components/aidaddy-avatar";
import { CopyButton } from "@/components/copy-button";
import { linkButtonClasses } from "@/components/site/link-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readCompletionStream } from "@/lib/chat-stream";

type Turn = { from: "you" | "aidaddy"; text: string };

const LINK = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

/** What a visitor reads when the server refuses the access code, in the chat and in both voice paths. */
const BAD_CODE = "That access code is not valid. Scan the QR code at our table again.";

const FROM_YOU = "site-bubble max-w-[85%] self-end whitespace-pre-wrap";
const FROM_AIDADDY = "site-row site-row--roomy max-w-[92%] self-start whitespace-pre-wrap";

/** The label above each of AIDaddy's items, the greeting included. */
const SAYS = <span className="site-eyebrow mb-1 block">AIDaddy</span>;

/** The word under the orb, in the site's state code. Hidden from screen readers: the avatar's label says it. */
const STATE_WORD: Record<AvatarState, { className: string; text: string }> = {
  idle: { className: "site-state", text: "Standing by" },
  listening: { className: "site-state site-state--amber", text: "Listening" },
  thinking: { className: "site-state site-state--cyan site-state--working", text: "Thinking" },
  speaking: { className: "site-state site-state--cyan", text: "Speaking" },
};

// Pictures already asked for, by link, so a reply that re-renders while it streams asks the server once per link.
const PICTURES = new Map<string, Promise<string | null>>();

function pictureFor(url: string): Promise<string | null> {
  let found = PICTURES.get(url);
  if (!found) {
    found = fetch(`/api/gifts/image?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ image?: string }>) : null))
      .then((body) => body?.image ?? null)
      .catch(() => null);
    PICTURES.set(url, found);
  }
  return found;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

/**
 * A link in AIDaddy's reply, with the product's picture above it when the link is a product the gift search found, so a
 * gift is seen as well as named. The server knows the picture; the model only has to post the link.
 */
function ReplyLink({ url }: { url: string }) {
  const [picture, setPicture] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    // A link that is still streaming in grows for a moment: ask once it has stopped changing.
    const wait = setTimeout(() => void pictureFor(url).then((p) => live && setPicture(p)), 400);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [url]);
  // A case file reads as what it is; its address stays in the tooltip.
  const caseFile = pathOf(url).startsWith("/c/");
  return (
    <>
      {picture && (
        // A shop's own image on its own host: next/image would need every shop listed in the config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={picture}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          // A shop with no product photo offers its logo or a banner instead: much wider than tall, so it is hidden.
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > img.naturalHeight * 2) setPicture(null);
          }}
          onError={() => setPicture(null)}
          className="my-1 block size-32 rounded-md border bg-white object-contain"
        />
      )}
      {caseFile ? (
        <a href={url} target="_blank" rel="noreferrer" title={url} className="text-primary underline underline-offset-2">
          Open the case file <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="break-all text-primary underline underline-offset-2">
          {url}
        </a>
      )}
    </>
  );
}

// A markdown image the model sometimes writes anyway. The picture comes from the product link, so the line is dropped.
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(https?:\/\/[^\s)]*\)?\n?/g;

/** Reply text with its URLs as links (case files, official pages and shops). */
function Linked({ text }: { text: string }) {
  return (
    <>
      {text
        .replace(MARKDOWN_IMAGE, "")
        .split(LINK)
        .map((part, i) => (i % 2 === 1 ? <ReplyLink key={i} url={part} /> : <span key={i}>{part}</span>))}
    </>
  );
}

export function AIDaddyChat({ code, needsCode, voiceAvailable }: { code: string; needsCode: boolean; voiceAvailable: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The server refused the code: the error line then also offers the way to type another one.
  const [badCode, setBadCode] = useState(false);
  const [elsewhere, setElsewhere] = useState("");
  const last = useRef<HTMLDivElement>(null);
  const fail = (message: string, refused = false) => {
    setError(message);
    setBadCode(refused);
  };
  const voice = useVoice(code, fail);

  // Only a new message moves the page. A reply that is still arriving grows without pulling the reader along.
  const count = turns.length;
  useEffect(() => {
    if (!count) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    last.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" });
  }, [count]);

  // The notice is left out where the deployment opened the demo to everyone (DEMO_OPEN=1).
  if (needsCode && !code) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-sm">
        <p className="leading-relaxed">
          The chat needs the access code for this demo. Scan the QR code at our table, or type the code here.
        </p>
        {/* A plain form, so it works before the script has loaded: it opens this page with ?code=... */}
        <form action="/chat" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="chat-code" className="font-medium">
              Access code
            </label>
            <Input
              id="chat-code"
              name="code"
              required
              autoComplete="off"
              autoCapitalize="none"
              className="h-11 px-3"
              placeholder="From the QR code at our table"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 px-4 text-base sm:text-sm">
            Open the chat
          </Button>
        </form>
      </div>
    );
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    fail("");
    setBusy(true);
    setTurns((t) => [...t, { from: "you", text: message }, { from: "aidaddy", text: "" }]);
    let full = "";
    const append = (delta: string) => {
      full += delta;
      setTurns((t) => [...t.slice(0, -1), { from: "aidaddy", text: t[t.length - 1].text + delta }]);
    };
    // Nothing came back: the message returns to the box, so it can be sent again or copied, not typed again.
    const giveBack = () => {
      if (full) return;
      setTurns((t) => (t[t.length - 1]?.text ? t : t.slice(0, -2)));
      setDraft((d) => d || message);
    };
    try {
      const res = await fetch("/api/aidaddy", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ message }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        giveBack();
        if (res.status === 503 && typeof body.chatUrl === "string") setElsewhere(body.chatUrl);
        else if (res.status === 401) fail(BAD_CODE, true);
        else fail(typeof body.error === "string" ? body.error : "AIDaddy cannot answer right now. Please try again.");
        return;
      }
      const received = await readCompletionStream(res.body, append);
      if (received === 0) {
        // A finished reply with no text (an error inside the run, or a silent turn) must not leave the spinner.
        fail("AIDaddy did not answer this time. Please send your message again.");
        giveBack();
      } else {
        voice.speak(full);
      }
    } catch {
      fail("The connection dropped. Please send your message again.");
      giveBack();
    } finally {
      setBusy(false);
    }
  }

  if (elsewhere) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border bg-card p-4 text-sm">
        <p className="leading-relaxed">The chat with AIDaddy runs on the team&apos;s server, not on this one.</p>
        {draft && (
          <div className="flex w-full flex-col items-start gap-2">
            <p className="text-muted-foreground">Your message was not sent. Copy it and send it there:</p>
            <p className="w-full rounded-lg bg-muted p-3 leading-relaxed whitespace-pre-wrap">{draft}</p>
            <CopyButton text={draft} />
          </div>
        )}
        <a href={code ? `${elsewhere}?code=${encodeURIComponent(code)}` : elsewhere} className={linkButtonClasses({ size: "cta" })}>
          Open the chat there
        </a>
      </div>
    );
  }

  const avatarState: AvatarState = voice.recording ? "listening" : voice.speaking ? "speaking" : busy || voice.transcribing ? "thinking" : "idle";

  async function listen() {
    const text = await voice.toggleRecording();
    if (text) setDraft((d) => (d ? `${d} ${text}` : text));
  }

  return (
    <>
      <div className="site-rail site-rail--sticky">
        <div className="site-station">
          <div className="site-orb">
            <AIDaddyAvatar state={avatarState} level={voice.level} size={72} />
          </div>
          <div className="site-station-text">
            <p aria-hidden="true" className={STATE_WORD[avatarState].className}>
              {STATE_WORD[avatarState].text}
            </p>
            <p className="site-note">
              {!voiceAvailable
                ? "Type your message to AIDaddy. Voice is unavailable in this demo."
                : voice.recording
                  ? "Recording. Tap the square to stop."
                  : voice.transcribing
                    ? "Turning your voice note into text."
                    : voice.speaking
                      ? "AIDaddy is reading its reply aloud."
                      : "Talk to AIDaddy by voice or text. Its voice is made with ElevenLabs."}
            </p>
            {voiceAvailable && (
              <Button type="button" variant="outline" size="sm" onClick={voice.toggleSpeech} aria-pressed={voice.enabled}>
                {voice.enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
                {voice.enabled ? "Voice on" : "Voice off"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <ol className="flex flex-col gap-3" aria-live="polite">
          {turns.length === 0 && (
            <li className={FROM_AIDADDY}>
              {SAYS}
              AIDaddy here. Tell me what is on your plate: a move, a new job, a letter you cannot read.
            </li>
          )}
          {turns.map((turn, i) => (
            <li key={i} className={turn.from === "you" ? FROM_YOU : FROM_AIDADDY}>
              {turn.from === "aidaddy" && SAYS}
              {turn.from === "aidaddy" && !turn.text ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="site-dot site-dot--cyan site-dot--working" aria-hidden="true" /> AIDaddy is working on it
                </span>
              ) : (
                <Linked text={turn.text} />
              )}
            </li>
          ))}
        </ol>
        {/* The newest message stops above the message box, which stays at the bottom of the screen. */}
        <div ref={last} className="scroll-mb-28" />
        {/*
          Kept at the bottom of the screen while the conversation is longer than the screen, so the message box is
          always in reach. An error travels with it, so it is never hidden behind the box.
        */}
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-(--hud-line-soft) bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:px-0">
          {error && (
            <p className="site-row site-row--amber site-status" role="alert">
              {error}{" "}
              {badCode && (
                // A plain link: it must open the page without the refused code, so the field for a new one shows.
                <a href="/chat" className="font-medium text-foreground underline underline-offset-4">
                  Or type the code
                </a>
              )}
            </p>
          )}
          <form onSubmit={send} className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter also confirms a word in Chinese, Japanese or Korean input; that Enter must not send.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
              }}
              maxLength={1500}
              rows={2}
              placeholder="I just moved to Espoo. What do I register first?"
              aria-label="Your message to AIDaddy"
              // On a phone the empty box is 66px tall and drops to 44px at the first key; 44px from 640px.
              className="max-h-40 min-h-[4.25rem] px-3 sm:min-h-11"
            />
            {voiceAvailable && (
              <Button
                type="button"
                size="icon-lg"
                variant="outline"
                onClick={listen}
                disabled={voice.transcribing}
                aria-pressed={voice.recording}
                aria-label={voice.recording ? "Stop recording" : "Record a voice note"}
                // Amber while the microphone is live: the person's move, the same colour as the ring around the avatar.
                data-tone="amber"
                className="h-11 w-11"
              >
                {voice.recording ? <Square aria-hidden /> : <Mic aria-hidden />}
              </Button>
            )}
            <Button type="submit" size="icon-lg" className="h-11 w-11" disabled={busy || !draft.trim()} aria-label="Send">
              <Send aria-hidden />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

/** The longest voice note: it stops by itself, so a forgotten recording cannot run on. */
const MAX_RECORDING_MS = 30_000;

/**
 * Voice for the chat, all of it started by a tap. "Voice on" reads each reply aloud in AIDaddy's ElevenLabs voice
 * and makes the avatar's heart glow with its loudness. The microphone records only between two taps on its button
 * (or 30 seconds at most); the transcript lands in the message box to check before sending.
 */
function useVoice(code: string, onError: (message: string, refused?: boolean) => void) {
  const [enabled, setEnabled] = useState(false);
  // The same switch, readable by a reply that was asked for before the visitor flipped it.
  const wanted = useRef(false);
  // True while the browser is still asking for the microphone, so a second tap cannot start a second recording.
  const starting = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const finished = useRef<((text: string) => void) | null>(null);

  useEffect(
    () => () => {
      source.current?.stop();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
      void context.current?.close();
    },
    [],
  );

  function audio(): AudioContext {
    // Created inside a tap, so phones allow it to play later.
    context.current ??= new AudioContext();
    return context.current;
  }

  function toggleSpeech() {
    if (enabled) {
      source.current?.stop();
      wanted.current = false;
      setEnabled(false);
      return;
    }
    void audio().resume();
    wanted.current = true;
    setEnabled(true);
  }

  async function speak(text: string) {
    if (!wanted.current || !text.trim()) return;
    try {
      const res = await fetch("/api/aidaddy/speak", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) onError(BAD_CODE, true);
        else onError(typeof body.error === "string" ? body.error : "AIDaddy could not read that aloud.");
        return;
      }
      const ctx = audio();
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(analyser);
      analyser.connect(ctx.destination);
      source.current?.stop();
      source.current = node;
      const samples = new Uint8Array(analyser.fftSize);
      let frame = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += ((value - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
        frame = requestAnimationFrame(tick);
      };
      node.onended = () => {
        cancelAnimationFrame(frame);
        // A reply that was cut off by the next one ends after the next one has started: that one is still speaking.
        if (source.current !== node) return;
        source.current = null;
        setLevel(0);
        setSpeaking(false);
      };
      setSpeaking(true);
      node.start();
      tick();
    } catch {
      setSpeaking(false);
      onError("AIDaddy could not read that aloud.");
    }
  }

  /** First tap starts recording; the second stops it and resolves with the transcript ("" on failure). */
  function toggleRecording(): Promise<string> {
    if (recorder.current) {
      // The tap that started this recording is still waiting; it ends empty, and this tap gets the transcript.
      finished.current?.("");
      recorder.current.stop();
      return new Promise((resolve) => {
        finished.current = resolve;
      });
    }
    if (starting.current) return Promise.resolve("");
    return new Promise((resolve) => {
      finished.current = resolve;
      starting.current = true;
      void (async () => {
        let stream: MediaStream;
        let rec: MediaRecorder;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          starting.current = false;
          finished.current = null;
          onError("The microphone is blocked. Allow it in the browser, or type instead.");
          resolve("");
          return;
        }
        try {
          rec = new MediaRecorder(stream);
        } catch {
          // A browser that hands out the microphone but cannot record from it.
          stream.getTracks().forEach((track) => track.stop());
          starting.current = false;
          finished.current = null;
          onError("This browser cannot record a voice note. Please type instead.");
          resolve("");
          return;
        }
        starting.current = false;
        const chunks: Blob[] = [];
        const timer = window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORDING_MS);
        rec.ondataavailable = (event) => event.data.size && chunks.push(event.data);
        rec.onstop = async () => {
          window.clearTimeout(timer);
          stream.getTracks().forEach((track) => track.stop());
          recorder.current = null;
          setRecording(false);
          const done = finished.current ?? (() => {});
          finished.current = null;
          const type = (rec.mimeType || "audio/webm").split(";")[0];
          const blob = new Blob(chunks, { type });
          if (!blob.size) return done("");
          setTranscribing(true);
          try {
            const res = await fetch("/api/aidaddy/listen", { method: "POST", headers: { "content-type": type, "x-demo-code": code }, body: blob });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || typeof body.text !== "string") {
              if (res.status === 401) onError(BAD_CODE, true);
              else onError(typeof body.error === "string" ? body.error : "AIDaddy could not hear that. Please type it instead.");
              done("");
            } else {
              done(body.text);
            }
          } catch {
            onError("The connection dropped. Please type your message instead.");
            done("");
          } finally {
            setTranscribing(false);
          }
        };
        recorder.current = rec;
        rec.start();
        setRecording(true);
      })();
    });
  }

  return { enabled, speaking, level, recording, transcribing, toggleSpeech, speak, toggleRecording };
}
