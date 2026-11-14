"use client";

/**
 * A full-screen chat with UKK in its own warm, family look, so a family on a phone or a laptop can just talk to him:
 * a fixed sidebar with topics on the left, the conversation over a family photo, the message box pinned to the bottom.
 *
 * It talks to the same /api/ukk as the /ukk page and renders replies with the same links and product pictures.
 * Family photo: Unsplash (free licence), https://unsplash.com/photos/family-cooking-together-in-a-bright-kitchen
 */

import { ArrowUp, Gift, Home, Loader2, Mail, Menu, Pill, ShoppingBag, SquarePen, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Linked } from "@/components/ukk-chat";
import { readCompletionStream } from "@/lib/ukk-stream";

type Turn = { from: "you" | "ukk"; text: string };

// The page's own palette: warm paper, dark ink, a clay accent.
const C = {
  paper: "#faf5ec",
  side: "#f2e8d9",
  ink: "#2b2420",
  muted: "#6f625a",
  line: "#e5d8c4",
  accent: "#a8482a",
};

const TOPICS = [
  { icon: Gift, title: "A gift", text: "I need a gift for Sem, he likes cars" },
  { icon: Pill, title: "A medicine", text: "I need ibuprofen for a headache" },
  { icon: ShoppingBag, title: "Something to buy", text: "Find me a cheap electric kettle under 40 euros" },
  { icon: Home, title: "Moving house", text: "We just moved to Espoo. What do we register first?" },
  { icon: Mail, title: "An official letter", text: "We got a letter from Kela. What does it want from us?" },
];

function Avatar({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/ukk-avatar.jpg"
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${C.paper}` }}
    />
  );
}

export function ChatScreen({ code }: { code: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
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
    setMenu(false);
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

  function newChat() {
    setTurns([]);
    setError("");
    setMenu(false);
    box.current?.focus();
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

  const sidebar = (
    <nav aria-label="UKK" className="flex h-full flex-col gap-6 p-4" style={{ background: C.side, color: C.ink }}>
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg py-1">
          <Avatar size={36} />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-semibold">UKK</span>
            <span className="text-xs" style={{ color: C.muted }}>
              The family butler
            </span>
          </span>
        </Link>
        <button type="button" onClick={() => setMenu(false)} aria-label="Close menu" className="flex size-10 items-center justify-center rounded-lg md:hidden">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <button
        type="button"
        onClick={newChat}
        disabled={busy}
        className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: C.accent }}
      >
        <SquarePen className="size-4" aria-hidden /> New chat
      </button>

      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold tracking-wide uppercase" style={{ color: C.muted }}>
          Ask UKK about
        </p>
        {TOPICS.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => void send(t.text)}
            disabled={busy}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5 disabled:opacity-50"
          >
            <t.icon className="size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
            {t.title}
          </button>
        ))}
      </div>

      <figure className="mt-auto overflow-hidden rounded-2xl" style={{ border: `1px solid ${C.line}` }}>
        <Image src="/assistant/family.jpg" alt="A family cooking together in their kitchen" width={560} height={373} className="h-32 w-full object-cover" />
        <figcaption className="bg-white/60 px-3 py-2 text-xs leading-snug" style={{ color: C.muted }}>
          One butler for the whole family: gifts, medicines, moves and letters, with sources.
        </figcaption>
      </figure>
    </nav>
  );

  return (
    <div className="flex h-dvh font-sans" style={{ background: C.paper, color: C.ink }}>
      {/* The sidebar stays in place on a laptop; on a phone it slides in from the menu button. */}
      <aside className="hidden w-72 shrink-0 md:block" style={{ borderRight: `1px solid ${C.line}` }}>
        {sidebar}
      </aside>
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/30" />
          <aside className="relative h-full w-[min(18rem,85vw)] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div
        className="relative flex min-w-0 flex-1 flex-col"
        style={{
          // The family photo stays behind the conversation, softened so the text keeps its contrast.
          backgroundImage: `linear-gradient(rgba(250,245,236,0.78), rgba(250,245,236,0.9)), url(/assistant/family.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <header
          className="flex h-14 shrink-0 items-center gap-2 px-[max(12px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] md:hidden"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="flex size-10 items-center justify-center rounded-lg">
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="flex-1 font-serif text-lg font-semibold">UKK</span>
          <button type="button" onClick={newChat} disabled={busy || !turns.length} aria-label="New chat" className="flex size-10 items-center justify-center rounded-lg disabled:opacity-40">
            <SquarePen className="size-5" aria-hidden />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            {turns.length === 0 ? (
              <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Avatar size={72} />
                  <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Good day. What does the family need?</h1>
                  <p className="max-w-md text-base" style={{ color: C.muted }}>
                    A gift, a medicine, a move or a letter: UKK finds it on real pages and shows where every answer comes from.
                  </p>
                </div>
                <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {TOPICS.slice(0, 4).map((t) => (
                    <button
                      key={t.title}
                      type="button"
                      onClick={() => void send(t.text)}
                      className="flex items-start gap-3 rounded-2xl bg-white/80 px-4 py-3 text-left text-sm shadow-sm hover:bg-white"
                      style={{ border: `1px solid ${C.line}` }}
                    >
                      <t.icon className="mt-0.5 size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{t.title}</span>
                        <span style={{ color: C.muted }}>{t.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol aria-live="polite" className="flex flex-col gap-6">
                {turns.map((turn, i) =>
                  turn.from === "you" ? (
                    <li key={i} className="max-w-[85%] self-end whitespace-pre-wrap rounded-3xl px-4 py-2.5 leading-relaxed text-white" style={{ background: C.accent }}>
                      {turn.text}
                    </li>
                  ) : (
                    <li key={i} className="flex gap-3">
                      <Avatar />
                      <div className="min-w-0 flex-1 whitespace-pre-wrap rounded-3xl bg-white/85 px-4 py-3 leading-relaxed shadow-sm" style={{ border: `1px solid ${C.line}` }}>
                        {turn.text ? (
                          <Linked text={turn.text} />
                        ) : (
                          <span className="inline-flex items-center gap-2" style={{ color: C.muted }}>
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
              <p role="alert" className="text-sm font-medium" style={{ color: C.accent }}>
                {error}
              </p>
            )}
            <form onSubmit={submit} className="flex items-end gap-2 rounded-3xl bg-white p-2 pl-4 shadow-md" style={{ border: `1px solid ${C.line}` }}>
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
                // The rounded box around it is the frame; the field's own outline would be a second one.
                style={{ outline: "none", color: C.ink }}
                className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-base leading-6 placeholder:text-[#9a8c82]"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={busy || !draft.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30"
                style={{ background: C.accent }}
              >
                {busy ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <ArrowUp className="size-5" aria-hidden />}
              </button>
            </form>
            <p className="text-center text-xs" style={{ color: C.muted }}>
              UKK is a made-up character. Research with sources, not legal or medical advice.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
