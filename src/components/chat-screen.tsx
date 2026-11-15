"use client";

/**
 * UKK as a household app, so a busy family on a phone or a laptop is told what it is missing without asking: hidden
 * opportunities found in the background open first, the chat is one tab away, and the household profile they come
 * from sits in the sidebar.
 *
 * The chat talks to the same /api/ukk as the /ukk page and renders replies with the same links and product pictures.
 * Household photo: Unsplash (free licence), a mother with her two children at home.
 */

import { ArrowUp, Gift, Home, Loader2, Menu, MessageCircle, Pill, ShoppingBag, Sparkles, SquarePen, Users, Wrench, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { CommunityView } from "@/components/community-view";
import { AboutYou, OpportunityView, type Palette, useOpportunities } from "@/components/opportunity-panel";
import { TaskView } from "@/components/task-view";
import { Linked } from "@/components/ukk-chat";
import { readCompletionStream } from "@/lib/ukk-stream";

type Turn = { from: "you" | "ukk"; text: string };
type View = "opportunities" | "tasks" | "communities" | "chat";

const TITLES: Record<View, string> = { opportunities: "Hidden opportunities", tasks: "Get it done", communities: "Communities", chat: "Chat with UKK" };

// The page's own palette: warm paper, dark ink, a clay accent.
const C: Palette = {
  paper: "#faf5ec",
  side: "#f2e8d9",
  ink: "#2b2420",
  muted: "#6f625a",
  line: "#e5d8c4",
  accent: "#a8482a",
};

const TOPICS = [
  { icon: Gift, title: "A gift", text: "I need a birthday present for Eino, he turns 5 and loves trains" },
  { icon: Pill, title: "A medicine", text: "Aino has a fever. Where can I get children's paracetamol?" },
  { icon: ShoppingBag, title: "Something to buy", text: "Find me a cheap electric kettle under 40 euros" },
  { icon: Home, title: "Help at home", text: "Our kitchen tap is leaking. Who can fix it in Helsinki this week, and for how much?" },
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
  const household = useOpportunities(code);
  const [view, setView] = useState<View>("opportunities");
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
  }, [draft, view]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setView("chat");
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

  function open(next: View) {
    setView(next);
    setMenu(false);
  }

  function newChat() {
    setTurns([]);
    setError("");
    open("chat");
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

  const count = household.scan?.opportunities.length ?? 0;
  const tab = (active: boolean) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${active ? "bg-white shadow-sm" : "hover:bg-black/5"}`;

  const sidebar = (
    <nav aria-label="UKK" className="flex h-full flex-col gap-4 overflow-y-auto p-4" style={{ background: C.side, color: C.ink }}>
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg py-1">
          <Avatar size={36} />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-semibold">UKK</span>
            <span className="text-xs" style={{ color: C.muted }}>
              The household butler
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
        <button type="button" onClick={() => open("opportunities")} aria-current={view === "opportunities" ? "page" : undefined} className={tab(view === "opportunities")}>
          <Sparkles className="size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
          <span className="flex-1">Hidden opportunities</span>
          {household.scanning ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" style={{ color: C.muted }} aria-label="Searching" />
          ) : (
            count > 0 && (
              <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: C.accent }}>
                {count}
              </span>
            )
          )}
        </button>
        <button type="button" onClick={() => open("tasks")} aria-current={view === "tasks" ? "page" : undefined} className={tab(view === "tasks")}>
          <Wrench className="size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
          <span className="flex-1">Get it done</span>
        </button>
        <button type="button" onClick={() => open("communities")} aria-current={view === "communities" ? "page" : undefined} className={tab(view === "communities")}>
          <Users className="size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
          <span className="flex-1">Communities</span>
        </button>
        <button type="button" onClick={() => open("chat")} aria-current={view === "chat" ? "page" : undefined} className={tab(view === "chat")}>
          <MessageCircle className="size-4 shrink-0" style={{ color: C.accent }} aria-hidden />
          <span className="flex-1">Chat with UKK</span>
        </button>
      </div>

      <div className="mt-auto">
        <AboutYou household={household} colors={C} />
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh font-sans" style={{ background: C.paper, color: C.ink }}>
      {/* One sidebar: in place on a laptop, sliding in on a phone. */}
      {menu && <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[min(20rem,88vw)] shrink-0 shadow-xl transition-transform duration-200 motion-reduce:transition-none md:static md:w-72 md:translate-x-0 md:shadow-none ${menu ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderRight: `1px solid ${C.line}` }}
      >
        {sidebar}
      </aside>

      <div
        className="relative flex min-w-0 flex-1 flex-col"
        style={{
          // The household photo stays behind everything, softened so the text keeps its contrast.
          backgroundImage: `linear-gradient(rgba(250,245,236,0.8), rgba(250,245,236,0.92)), url(/assistant/family.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <header
          className="flex h-14 shrink-0 items-center gap-2 px-[max(12px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] md:hidden"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="relative flex size-10 items-center justify-center rounded-lg">
            <Menu className="size-5" aria-hidden />
            {count > 0 && view !== "opportunities" && <span className="absolute top-2 right-2 size-2 rounded-full" style={{ background: C.accent }} />}
          </button>
          <span className="flex-1 font-serif text-lg font-semibold">{TITLES[view]}</span>
          <button type="button" onClick={newChat} disabled={busy} aria-label="New chat" className="flex size-10 items-center justify-center rounded-lg disabled:opacity-40">
            <SquarePen className="size-5" aria-hidden />
          </button>
        </header>

        {view === "opportunities" ? (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <OpportunityView household={household} colors={C} onAsk={(text) => void send(text)} />
          </main>
        ) : view === "tasks" ? (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <TaskView code={code} colors={C} city={household.profile.city} />
          </main>
        ) : view === "communities" ? (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <CommunityView code={code} colors={C} city={household.profile.city} />
          </main>
        ) : (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
                {turns.length === 0 ? (
                  <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar size={72} />
                      <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Good day. What does the household need?</h1>
                      <p className="max-w-md text-base" style={{ color: C.muted }}>
                        A present, a medicine, a repair or a letter: UKK finds it on real pages and shows where every answer comes from.
                      </p>
                    </div>
                    <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                      {TOPICS.map((t) => (
                        <button
                          key={t.title}
                          type="button"
                          onClick={() => void send(t.text)}
                          className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3 text-left text-sm shadow-sm hover:bg-white"
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
                          <div className="min-w-0 flex-1 whitespace-pre-wrap rounded-3xl bg-white/90 px-4 py-3 leading-relaxed shadow-sm" style={{ border: `1px solid ${C.line}` }}>
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
          </>
        )}
      </div>
    </div>
  );
}
