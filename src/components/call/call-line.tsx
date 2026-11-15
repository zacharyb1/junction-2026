"use client";

import { CircleAlert, Loader2, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** What GET and POST /api/calls/line/<answerId> return (src/lib/demo-calls.ts). */
type Line = {
  status: string;
  recipient?: string;
  notice?: string;
  maxSeconds?: number;
  note?: string;
  error?: string;
  signedUrl?: string;
  dynamicVariables?: Record<string, string>;
};

type Stage = "loading" | "ringing" | "connecting" | "live" | "ended" | "over" | "missing";
type Caption = { key: number; speaker: "AIDaddy" | "You"; text: string };
/** The part of the ElevenLabs session this page uses. The library itself loads when the call is answered. */
type Session = { endSession: () => Promise<void> };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The browser line: the page where one of AIDaddy's demo calls rings. Whoever opens it plays the person being
 * called. Tapping Answer opens the microphone and connects to the same ElevenLabs agent that would phone.
 */
export function CallLine({ answerId }: { answerId: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [line, setLine] = useState<Line | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [seconds, setSeconds] = useState(0);
  const session = useRef<Session | null>(null);
  const spoken = useRef(0);
  /** The one-time link, kept so a failed connection can be tried again without answering twice. */
  const ticket = useRef<Line | null>(null);
  const address = `/api/calls/line/${answerId}`;

  // Is the line still ringing? Asked on arrival and every few seconds while nobody has answered here.
  useEffect(() => {
    if (stage !== "loading" && stage !== "ringing") return;
    let current = true;
    const ask = async () => {
      try {
        const res = await fetch(address, { cache: "no-store" });
        const next = (await res.json().catch(() => null)) as Line | null;
        if (!current) return;
        if (res.status === 404 || !next) return setStage("missing");
        setLine(next);
        setStage(next.status === "ringing" ? "ringing" : "over");
      } catch {
        // No connection right now: the next round asks again.
      }
    };
    void ask();
    const timer = setInterval(ask, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [address, stage]);

  useEffect(() => {
    if (stage !== "live") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // Leaving the page hangs up.
  useEffect(() => () => void session.current?.endSession().catch(() => {}), []);

  async function connect(given: Line) {
    try {
      const { Conversation } = await import("@elevenlabs/client");
      session.current = await Conversation.startSession({
        signedUrl: given.signedUrl!,
        connectionType: "websocket",
        dynamicVariables: given.dynamicVariables,
        // The agent's tone marks, such as "[happy]", are for the voice; the captions show only the words.
        stripAudioTags: true,
        onConnect: () => setStage("live"),
        onDisconnect: () => {
          session.current = null;
          setStage("ended");
        },
        onModeChange: ({ mode }) => setSpeaking(mode === "speaking"),
        onMessage: ({ message, role }) => {
          // The provider's event ids are not always present or unique, so the page numbers the lines itself.
          const key = ++spoken.current;
          setCaptions((all) => [...all.slice(-5), { key, speaker: role === "agent" ? "AIDaddy" : "You", text: message }]);
        },
        onError: (message) => console.error("AIDaddy call line:", message),
      });
    } catch (error) {
      console.error("AIDaddy call line could not connect", error);
      setProblem("The call could not be connected. Check your connection and try again.");
      setStage("ringing");
    }
  }

  async function answer() {
    setProblem(null);
    setStage("connecting");
    if (ticket.current) return connect(ticket.current);
    try {
      // Ask for the microphone before the call is marked as answered: a refusal must leave the line ringing.
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of microphone.getTracks()) track.stop();
    } catch {
      setProblem(
        navigator.mediaDevices
          ? "AIDaddy needs your microphone to hear you. Allow it for this page, then tap Answer again."
          : "This browser does not give the page a microphone. Open the link in Chrome or Safari, over https.",
      );
      return setStage("ringing");
    }
    try {
      const res = await fetch(address, { method: "POST" });
      const given = (await res.json().catch(() => null)) as Line | null;
      if (given?.signedUrl) {
        ticket.current = given;
        return connect(given);
      }
      if (given?.status === "ringing" || res.status === 429) {
        setProblem(given?.note ?? given?.error ?? "The line is busy. Try again in a moment.");
        return setStage("ringing");
      }
      setLine(given);
      setStage(res.status === 404 ? "missing" : "over");
    } catch {
      setProblem("The call could not be connected. Check your connection and try again.");
      setStage("ringing");
    }
  }

  async function hangUp() {
    const open = session.current;
    session.current = null;
    setStage("ended");
    await open?.endSession().catch(() => {});
  }

  const ringing = stage === "ringing" || stage === "connecting";
  const limit = line?.maxSeconds ?? 120;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center wrap-anywhere">
      <div className="relative grid size-28 place-items-center">
        {(ringing || (stage === "live" && speaking)) && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-primary/60 motion-reduce:animate-none" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aidaddy-avatar.svg" alt="" width={112} height={112} className="relative size-28 rounded-full border" />
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        {stage === "loading" && <p className="text-muted-foreground">Looking for the call…</p>}
        {ringing && (
          <>
            <p className="site-eyebrow">Incoming demo call</p>
            <h1 className="text-3xl font-semibold tracking-tight">AIDaddy is calling</h1>
            <p className="leading-relaxed text-muted-foreground">
              An AI assistant is calling {line?.recipient ?? "this line"} for a household that asked it to. Answer and talk
              to it as the person it is calling.
            </p>
          </>
        )}
        {stage === "live" && (
          <>
            <p className="site-eyebrow">
              On the call · {clock(seconds)} of {clock(limit)}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{speaking ? "AIDaddy is speaking" : "AIDaddy is listening"}</h1>
          </>
        )}
        {stage === "ended" && (
          <>
            <p className="site-eyebrow">Call ended</p>
            <h1 className="text-3xl font-semibold tracking-tight">Thank you</h1>
            <p className="leading-relaxed text-muted-foreground">
              AIDaddy now tells the household what was agreed. You can close this page.
            </p>
          </>
        )}
        {stage === "over" && (
          <>
            <p className="site-eyebrow">No call here</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {line?.status === "in_progress" ? "Someone already answered" : "This call is over"}
            </h1>
            <p className="leading-relaxed text-muted-foreground">Each call can be answered once. Ask AIDaddy for a new call to try again.</p>
          </>
        )}
        {stage === "missing" && (
          <>
            <p className="site-eyebrow">No call here</p>
            <h1 className="text-3xl font-semibold tracking-tight">This line does not exist</h1>
            <p className="leading-relaxed text-muted-foreground">Check the link, or ask AIDaddy for a new call.</p>
          </>
        )}
      </div>

      {problem && (
        <p role="alert" className="flex items-start gap-2 text-left text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {problem}
        </p>
      )}

      {ringing && (
        <Button size="lg" disabled={stage === "connecting"} onClick={answer} className="h-14 rounded-full px-8 text-base">
          {stage === "connecting" ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Phone aria-hidden />}
          {stage === "connecting" ? "Connecting" : "Answer"}
        </Button>
      )}
      {stage === "live" && (
        <>
          {captions.length > 0 && (
            <ol aria-label="What was just said" className="flex w-full flex-col gap-2 rounded-lg border bg-card p-4 text-left text-sm leading-relaxed">
              {captions.map((caption) => (
                <li key={caption.key}>
                  <span className="text-muted-foreground">{caption.speaker}: </span>
                  {caption.text}
                </li>
              ))}
            </ol>
          )}
          <Button size="lg" variant="destructive" onClick={hangUp} className="h-14 rounded-full px-8 text-base">
            <PhoneOff aria-hidden />
            Hang up
          </Button>
        </>
      )}

      {(ringing || stage === "live") && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {line?.notice} The call uses your microphone, lasts up to two minutes and is not recorded as audio; its text goes
          back to the household.
        </p>
      )}
    </div>
  );
}
