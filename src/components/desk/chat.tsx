"use client";

/**
 * The desktop chat with AIDaddy: the real assistant behind /api/aidaddy (the team's Hermes server), streamed in, with
 * the same links and product pictures as the other chats. A question sent from the start page arrives as `?q=`.
 */

import Image from "next/image";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Linked } from "@/components/aidaddy-chat";
import { Icon } from "@/components/home/ui";
import { readCompletionStream } from "@/lib/chat-stream";
import { useDesk } from "./desk-shell";

type Turn = { from: "you" | "aidaddy"; text: string };

export function DeskChat({ first }: { first?: string }) {
  const { code } = useDesk();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const sentFirst = useRef(false);

  const lastText = turns[turns.length - 1]?.text.length ?? 0;
  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: "end" });
  }, [turns.length, lastText]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    setTurns((t) => [...t, { from: "you", text }, { from: "aidaddy", text: "" }]);
    let full = "";
    const append = (delta: string) => {
      full += delta;
      setTurns((t) => [...t.slice(0, -1), { from: "aidaddy", text: t[t.length - 1].text + delta }]);
    };
    // Nothing came back: the message goes back into the box, so it can be sent again without typing it again.
    const giveBack = (why: string) => {
      setError(why);
      if (full) return;
      setTurns((t) => (t[t.length - 1]?.text ? t : t.slice(0, -2)));
      setDraft((d) => d || text);
    };
    try {
      const res = await fetch("/api/aidaddy", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        giveBack(res.status === 401 ? "This demo needs its access code: open /desk?code=… first." : (body.error ?? "AIDaddy cannot answer right now. Please try again."));
        return;
      }
      if ((await readCompletionStream(res.body, append)) === 0) giveBack("AIDaddy did not answer this time. Please send your message again.");
    } catch {
      giveBack("The connection dropped. Please send your message again.");
    } finally {
      setBusy(false);
    }
  }

  // The start page's question is sent once, as soon as the chat opens.
  useEffect(() => {
    if (!first || sentFirst.current) return;
    sentFirst.current = true;
    void send(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the question the page opened with
  }, [first]);

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  // Enter sends, Shift+Enter starts a new line, as in other chat apps. Not while an input method is composing.
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 justify-center px-8 pb-6 pt-10">
        <div className="flex w-full max-w-[760px] flex-col gap-6">
          {turns.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <Image src="/aidaddy-avatar.svg" alt="" width={64} height={64} className="size-16 rounded-full" />
              <h1 className="m-0 text-3xl font-semibold tracking-[-0.02em]">What does the family need?</h1>
              <p className="m-0 max-w-md text-[#7a6e66]">A present, a medicine, a repair or a letter: AIDaddy finds it on real pages and shows where every answer comes from.</p>
            </div>
          ) : (
            <ol aria-live="polite" className="m-0 flex list-none flex-col gap-6 p-0">
              {turns.map((turn, i) =>
                turn.from === "you" ? (
                  <li key={i} className="max-w-[80%] self-end whitespace-pre-wrap rounded-[20px] bg-[#efe7dc] px-4 py-3 leading-relaxed">
                    {turn.text}
                  </li>
                ) : (
                  <li key={i} className="flex gap-3">
                    <Image src="/aidaddy-avatar.svg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 whitespace-pre-wrap leading-relaxed">
                      {turn.text ? <Linked text={turn.text} /> : <span className="text-[#7a6e66]">AIDaddy is working on it…</span>}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
          <div ref={end} />
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col items-center gap-2 bg-[linear-gradient(to_top,#fbf8f3_70%,rgba(251,248,243,0))] px-8 pb-5 pt-3">
        {error && (
          <p role="alert" className="m-0 w-full max-w-[760px] text-sm font-medium text-[#a33417]">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="box-border flex w-full max-w-[760px] items-end gap-2 rounded-3xl border border-[#e4ddd3] bg-white py-2 pl-[18px] pr-2 shadow-[0_6px_24px_rgba(42,36,32,.06)]">
          <label htmlFor="desk-chat" className="sr-only">
            Message AIDaddy
          </label>
          <textarea
            id="desk-chat"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask AIDaddy anything about your family"
            className="max-h-[200px] min-w-0 flex-1 resize-none self-center border-0 bg-transparent py-2 text-[15px] leading-normal outline-none"
          />
          <button type="submit" aria-label="Send" disabled={busy || !draft.trim()} className="flex size-10 items-center justify-center rounded-full bg-[#c4572f] text-white disabled:opacity-40">
            <Icon d="M12 19V5M6 11l6-6 6 6" size={18} width={2.2} />
          </button>
        </form>
        <span className="text-xs text-[#8f8379]">AIDaddy never sends, books or pays without your yes.</span>
      </div>
    </div>
  );
}
