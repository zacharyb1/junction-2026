"use client";

/**
 * A full-screen chat with UKK in the familiar layout of chat assistants, so a visitor on a phone or a laptop can just
 * talk to him: the conversation in one centred column, the message box pinned to the bottom.
 *
 * It talks to the same /api/ukk as the /ukk page and renders replies with the same links and product pictures.
 */

import { ArrowUp, Loader2, SquarePen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Linked } from "@/components/ukk-chat";
import { readCompletionStream } from "@/lib/ukk-stream";

type Turn = { from: "you" | "ukk"; text: string };

const STARTERS = [
  { title: "Find a gift", text: "I need a gift for Sem, he likes cars" },
  { title: "Find a medicine", text: "I need ibuprofen for a headache" },
  { title: "Moving house", text: "I just moved to Espoo. What do I register first?" },
  { title: "Buy something", text: "Find me a cheap electric kettle under 40 euros" },
];

function Avatar() {
  return <Image src="/ukk-avatar.jpg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full border border-white/10" />;
}

export function ChatScreen({ code }: { code: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // A new message, and each new piece of the reply, keeps the newest text in view.
  const lastText = turns[turns.length - 1]?.text.length ?? 0;
  useEffect(() => {
    if (!turns.length) return;
    end.current?.scrollIntoView({ block: "end" });
  }, [turns.length, lastText]);

  // The box grows with what is typed, up to about eight lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    setTurns((t) => [...t, { from: "you", text }, { from: "ukk", text: "" }]);
    let full = "";
    const append = (delta: string) => {
      full += delta;
      setTurns((t) => [...t.slice(0, -1), { from: "ukk", text: t[t.length - 1].text + delta }]);
    };
    // Nothing came back: the message goes back into the box, so it can be sent again without typing it again.
    const giveBack = (why: string) => {
      setError(why);
      if (full) return;
      setTurns((t) => (t[t.length - 1]?.text ? t : t.slice(0, -2)));
      setDraft((d) => d || text);
    };
    try {
      const res = await fetch("/api/ukk", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        giveBack(res.status === 401 ? "This demo needs its access code: open /ukk with the code first." : (body.error ?? "UKK cannot answer right now. Please try again."));
        return;
      }
      if ((await readCompletionStream(res.body, append)) === 0) giveBack("UKK did not answer this time. Please send your message again.");
    } catch {
      giveBack("The connection dropped. Please send your message again.");
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  // Enter sends, Shift+Enter starts a new line, as in other chat apps. Not while an input method is composing.
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-[max(16px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)]">
        <Link href="/" className="flex items-center gap-2 rounded-md py-1 text-sm font-semibold hover:opacity-80">
          <Avatar /> UKK
        </Link>
        <button
          type="button"
          onClick={() => {
            setTurns([]);
            setError("");
            box.current?.focus();
          }}
          disabled={busy || !turns.length}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40"
        >
          <SquarePen className="size-4" aria-hidden /> New chat
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {turns.length === 0 ? (
            <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <Image src="/ukk-avatar.jpg" alt="" width={64} height={64} className="size-16 rounded-full border border-white/10" priority />
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What can UKK do for you?</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ask about life in Finland, or ask him to find something to buy. Every answer comes with its sources.
                </p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => void send(s.text)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-white/10 px-4 py-3 text-left text-sm hover:bg-white/5"
                  >
                    <span className="font-medium">{s.title}</span>
                    <span className="text-muted-foreground">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol aria-live="polite" className="flex flex-col gap-6">
              {turns.map((turn, i) =>
                turn.from === "you" ? (
                  <li key={i} className="max-w-[85%] self-end whitespace-pre-wrap rounded-3xl bg-white/10 px-4 py-2.5 leading-relaxed">
                    {turn.text}
                  </li>
                ) : (
                  <li key={i} className="flex gap-3">
                    <Avatar />
                    <div className="min-w-0 flex-1 whitespace-pre-wrap pt-1 leading-relaxed">
                      {turn.text ? (
                        <Linked text={turn.text} />
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> UKK is working on it
                        </span>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
          <div ref={end} />
        </div>
      </main>

      <footer className="shrink-0 px-[max(16px,env(safe-area-inset-left))] pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="flex items-end gap-2 rounded-3xl border border-white/15 bg-white/5 p-2 pl-4 focus-within:border-white/30">
            <label htmlFor="chat-message" className="sr-only">
              Message UKK
            </label>
            <textarea
              id="chat-message"
              ref={box}
              rows={1}
              value={draft}
              maxLength={1500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder="Message UKK"
              // The rounded box around it shows the focus (focus-within), so the field's own outline would be a second frame.
              style={{ outline: "none" }}
              className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-base leading-6 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !draft.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-30"
            >
              {busy ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <ArrowUp className="size-5" aria-hidden />}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground">UKK is a made-up character. Research with sources, not legal or medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
