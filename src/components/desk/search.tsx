"use client";

/**
 * The desktop "Shopping from your chats": search shops for anything the family needs, with the price as each shop's
 * own page states it (/api/gifts), so a parent can compare and buy themselves. The needs below the box come from the
 * family's messages; those messages are the demo's examples, the search is real.
 */

import { type FormEvent, useRef, useState } from "react";
import { APPS, QUICK, ROWS } from "@/components/home/search";
import { AppLogo, Icon, ICON, Spinner } from "@/components/home/ui";
import type { GiftIdea, GiftResult } from "@/lib/engine/gifts";
import { useDesk } from "./desk-shell";

type Found = { status: "idle" | "searching" | "ok" | "error"; query: string; ideas: GiftIdea[]; error: string };

export function DeskSearch() {
  const { code } = useDesk();
  const [draft, setDraft] = useState("");
  const [found, setFound] = useState<Found>({ status: "idle", query: "", ideas: [], error: "" });
  const latest = useRef("");

  async function go(query: string) {
    const prompt = query.trim().slice(0, 300);
    if (prompt.length < 3) return;
    latest.current = prompt;
    setFound({ status: "searching", query: prompt, ideas: [], error: "" });
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ prompt, country: "FI" }),
      });
      const body = (await res.json().catch(() => null)) as (GiftResult & { error?: string }) | null;
      if (!res.ok || !body?.ideas) throw new Error(res.status === 401 ? "this page needs the demo's access code" : (body?.error ?? `search failed (${res.status})`));
      // A slower, older search must not replace the newest one.
      if (latest.current === prompt) setFound({ status: "ok", query: prompt, ideas: body.ideas, error: "" });
    } catch (e) {
      if (latest.current === prompt) setFound({ status: "error", query: prompt, ideas: [], error: e instanceof Error ? e.message : "search failed" });
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void go(draft);
  }
  return (
    <div className="box-border flex flex-col gap-6 px-10 pb-10 pt-8">
      <header className="flex flex-col gap-4">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Shopping from your chats</h1>
        <form onSubmit={submit} className="box-border flex h-12 max-w-[720px] items-center gap-2.5 rounded-full border border-[#e4ddd3] bg-white px-4">
          <Icon d={ICON.search} size={18} stroke="#7a6e66" width={2} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Anything for the family…"
            aria-label="Search"
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-[#8f8379]"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => void go(q)} className="h-[34px] rounded-full border border-[#e4ddd3] bg-white px-3 text-[13px] font-medium">
              {q}
            </button>
          ))}
        </div>
      </header>

      {found.status !== "idle" && (
        <section aria-label={`Found for “${found.query}”`} aria-live="polite" className="flex flex-col gap-3">
          <h2 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
            In shops for “{found.query}” {found.status === "searching" && <Spinner size={12} />}
          </h2>
          {found.status === "searching" && <p className="m-0 text-[#7a6e66]">Reading shop pages for prices, about half a minute…</p>}
          {found.status === "error" && <p className="m-0 text-[#a33417]">The search did not work this time: {found.error}.</p>}
          {found.status === "ok" && found.ideas.length === 0 && <p className="m-0 text-[#7a6e66]">No shop page stated a price for this. Try other words.</p>}
          {found.ideas.length > 0 && (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3 p-0">
              {found.ideas.map((idea) => (
                <li key={idea.url}>
                  <a href={idea.url} target="_blank" rel="noreferrer" className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#ece6dc] bg-white no-underline">
                    {idea.image ? (
                      // The shop's own picture, on its own host: next/image would need every shop allowed in config.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={idea.image} alt="" className="h-40 w-full bg-[#f1ebe2] object-contain" />
                    ) : (
                      <span aria-hidden className="flex h-40 items-center justify-center bg-[#f1ebe2] text-[#8f8379]">
                        <Icon d={ICON.search} size={28} />
                      </span>
                    )}
                    <span className="flex flex-1 flex-col gap-1.5 p-4">
                      <span className="text-[15px] font-semibold">{idea.name}</span>
                      <span className="text-lg font-bold text-[#c4572f]">{idea.price}</span>
                      <span className="text-xs italic text-[#7a6e66]">“{idea.priceQuote}”</span>
                      {idea.delivery && <span className="text-xs text-[#5a4f47]">{idea.delivery}</span>}
                      <span className="mt-auto pt-1 text-xs font-semibold">
                        {idea.shop} ↗<span className="sr-only"> (opens the shop page in a new tab)</span>
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {found.ideas.length > 0 && <p className="m-0 text-xs text-[#8f8379]">Prices as each shop&apos;s own page states them today. AIDaddy never buys.</p>}
        </section>
      )}

      <section aria-label="From your messages" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">From your messages</h2>
          <span className="flex gap-1">
            {APPS.map((a) => (
              <AppLogo key={a} app={a} size={18} label={a} />
            ))}
          </span>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3 p-0">
          {ROWS.map(([app, title, from, ask]) => (
            <li key={title}>
              <button type="button" onClick={() => void go(ask)} className="flex h-full w-full items-start gap-3 rounded-2xl border border-[#ece6dc] bg-white p-4 text-left">
                <span className="box-border flex size-10 flex-none items-center justify-center rounded-[11px] border border-[#ece6dc] bg-white p-1.5">
                  <AppLogo app={app} size={26} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{title}</span>
                  <span className="text-[13px] text-[#7a6e66]">
                    {app} · {from}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-[#8f8379]">The messages are examples for the demo family; picking one searches shops for real. AIDaddy never buys.</p>
      </section>
    </div>
  );
}
