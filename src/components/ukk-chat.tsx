"use client";

import { CircleAlert, Loader2, Send } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
    const append = (delta: string) =>
      setTurns((t) => [...t.slice(0, -1), { from: "ukk", text: t[t.length - 1].text + delta }]);
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
      await readCompletionStream(res.body, append);
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

  return (
    <div className="flex flex-col gap-4">
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
        <Button type="submit" size="lg" disabled={busy || !draft.trim()} aria-label="Send">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
