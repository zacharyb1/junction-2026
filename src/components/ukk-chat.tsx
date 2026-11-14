"use client";

import { CircleAlert, Loader2, Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { type AvatarState, UkkAvatar } from "@/components/ukk-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readCompletionStream } from "@/lib/ukk-stream";

type Turn = { from: "you" | "ukk"; text: string };

const LINK = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

/** Reply text with its URLs as links (case files and official pages). */
function Linked({ text }: { text: string }) {
  return (
    <>
      {text.split(LINK).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function UkkChat({ code }: { code: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elsewhere, setElsewhere] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoice(code, setError);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns]);

  if (!code) {
    return (
      <p className="rounded-lg border p-4 text-sm">
        Scan the QR code at our table to talk to UKK. It carries the access code for this demo.
      </p>
    );
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    setTurns((t) => [...t, { from: "you", text: message }, { from: "ukk", text: "" }]);
    let full = "";
    const append = (delta: string) => {
      full += delta;
      setTurns((t) => [...t.slice(0, -1), { from: "ukk", text: t[t.length - 1].text + delta }]);
    };
    const dropEmptyReply = () => setTurns((t) => (t[t.length - 1]?.text ? t : t.slice(0, -1)));
    try {
      const res = await fetch("/api/ukk", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ message }),
      });
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setElsewhere(typeof body.chatUrl === "string" ? body.chatUrl : "");
        dropEmptyReply();
        return;
      }
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "UKK cannot answer right now. Please try again.");
        dropEmptyReply();
        return;
      }
      const received = await readCompletionStream(res.body, append);
      if (received === 0) {
        // A finished reply with no text (an error inside the run, or a silent turn) must not leave the spinner.
        setError("UKK did not answer this time. Please send your message again.");
        dropEmptyReply();
      } else {
        voice.speak(full);
      }
    } catch {
      setError("The connection dropped. Please send your message again.");
      dropEmptyReply();
    } finally {
      setBusy(false);
    }
  }

  if (elsewhere) {
    return (
      <p className="rounded-lg border p-4 text-sm">
        The chat with UKK runs on the team&apos;s server.{" "}
        <a href={`${elsewhere}?code=${encodeURIComponent(code)}`} className="underline underline-offset-2">
          Open it there
        </a>
        .
      </p>
    );
  }

  const avatarState: AvatarState = voice.recording ? "listening" : voice.speaking ? "speaking" : busy || voice.transcribing ? "thinking" : "idle";

  async function listen() {
    const text = await voice.toggleRecording();
    if (text) setDraft((d) => (d ? `${d} ${text}` : text));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-lg border p-3">
        <UkkAvatar state={avatarState} level={voice.level} size={88} />
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            {voice.recording
              ? "Recording. Tap the square to stop."
              : voice.transcribing
                ? "Turning your voice note into text."
                : voice.speaking
                  ? "UKK is reading his reply aloud."
                  : "Talk to UKK by voice or text. His voice is made with ElevenLabs."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={voice.toggleSpeech} aria-pressed={voice.enabled} className="self-start">
            {voice.enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
            {voice.enabled ? "Voice on" : "Voice off"}
          </Button>
        </div>
      </div>
      <ol className="flex flex-col gap-3" aria-live="polite">
        {turns.length === 0 && (
          <li className="rounded-lg bg-muted p-3 text-sm">
            UKK. Finland&apos;s FAQ. Tell me what is on your plate: a move, a new job, a letter you cannot read.
          </li>
        )}
        {turns.map((turn, i) => (
          <li
            key={i}
            className={
              turn.from === "you"
                ? "self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                : "rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap"
            }
          >
            {turn.from === "ukk" && !turn.text ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> UKK is consulting the official sources
              </span>
            ) : (
              <Linked text={turn.text} />
            )}
          </li>
        ))}
      </ol>
      <div ref={end} />
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          maxLength={1500}
          rows={2}
          placeholder="I just moved to Espoo. What do I register first?"
          aria-label="Your message to UKK"
          className="min-h-11"
        />
        <Button
          type="button"
          size="lg"
          variant={voice.recording ? "destructive" : "outline"}
          onClick={listen}
          disabled={voice.transcribing}
          aria-pressed={voice.recording}
          aria-label={voice.recording ? "Stop recording" : "Record a voice note"}
        >
          {voice.transcribing ? <Loader2 className="animate-spin" aria-hidden /> : voice.recording ? <Square aria-hidden /> : <Mic aria-hidden />}
        </Button>
        <Button type="submit" size="lg" disabled={busy || !draft.trim()} aria-label="Send">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        </Button>
      </form>
    </div>
  );
}

/** The longest voice note: it stops by itself, so a forgotten recording cannot run on. */
const MAX_RECORDING_MS = 30_000;

/**
 * Voice for the chat, all of it started by a tap. "Voice on" reads each reply aloud in UKK's ElevenLabs voice
 * and moves the avatar's mouth with its loudness. The microphone records only between two taps on its button
 * (or 30 seconds at most); the transcript lands in the message box to check before sending.
 */
function useVoice(code: string, onError: (message: string) => void) {
  const [enabled, setEnabled] = useState(false);
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
      setEnabled(false);
      return;
    }
    void audio().resume();
    setEnabled(true);
  }

  async function speak(text: string) {
    if (!enabled || !text.trim()) return;
    try {
      const res = await fetch("/api/ukk/speak", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        onError(typeof body.error === "string" ? body.error : "UKK could not read that aloud.");
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
        setLevel(0);
        setSpeaking(false);
        if (source.current === node) source.current = null;
      };
      setSpeaking(true);
      node.start();
      tick();
    } catch {
      setSpeaking(false);
      onError("UKK could not read that aloud.");
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
    return new Promise((resolve) => {
      finished.current = resolve;
      void (async () => {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          onError("The microphone is blocked. Allow it in the browser, or type instead.");
          resolve("");
          return;
        }
        const rec = new MediaRecorder(stream);
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
            const res = await fetch("/api/ukk/listen", { method: "POST", headers: { "content-type": type, "x-demo-code": code }, body: blob });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || typeof body.text !== "string") {
              onError(typeof body.error === "string" ? body.error : "UKK could not hear that. Please type it instead.");
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
