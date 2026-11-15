"use client";

/**
 * The desktop "Shopping from your chats": search shops for what the family needs, with each product's price as its
 * shop page states it, as cards. A gift knows who it is for and marks what would arrive late; a household job goes to
 * Get it done and any other question to the chat (shop-search.ts). The phone page shows the same.
 */

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { APPS, arrival, NEEDS, type Need, QUICK, useShopSearch } from "@/components/home/shop-search";
import { AppLogo, Icon, ICON, Spinner } from "@/components/home/ui";
import { isJob } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";

export function DeskSearch() {
  const router = useRouter();
  const { code } = useDesk();
  const { found, search, searchText } = useShopSearch(code);
  const [draft, setDraft] = useState("");

  function open(need: Need) {
    if (need.to === "shop" && need.shop) void search(need.ask, need.shop);
    else router.push(need.to === "job" ? `/desk/tasks?job=${encodeURIComponent(need.ask)}` : `/desk/chat?q=${encodeURIComponent(need.ask)}`);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (isJob(text)) router.push(`/desk/tasks?job=${encodeURIComponent(text)}`);
    else searchText(text);
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
            <button key={q.label} type="button" onClick={() => open(q)} className="h-[34px] rounded-full border border-[#e4ddd3] bg-white px-3 text-[13px] font-medium">
              {q.label}
            </button>
          ))}
        </div>
      </header>

      {found.status !== "idle" && (
        <section aria-label={`In shops for ${found.heading}`} aria-live="polite" className="flex flex-col gap-3">
          <h2 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
            In shops: {found.heading} {found.status === "searching" && <Spinner size={12} />}
          </h2>
          {found.status === "searching" && <p className="m-0 text-[#7a6e66]">Reading shop pages for prices, about half a minute…</p>}
          {found.status === "error" && <p className="m-0 text-[#a33417]">The search did not work this time: {found.error}.</p>}
          {found.status === "ok" && found.ideas.length === 0 && <p className="m-0 text-[#7a6e66]">No shop page stated a price for this. Try other words.</p>}
          {found.ideas.length > 0 && (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3 p-0">
              {found.ideas.map((idea) => {
                const when = arrival(idea);
                return (
                  <li key={idea.url}>
                    <a href={idea.url} target="_blank" rel="noreferrer" className={`flex h-full flex-col overflow-hidden rounded-2xl border border-[#ece6dc] bg-white no-underline ${when?.late ? "opacity-70" : ""}`}>
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
                        {when && <span className={`text-xs font-semibold ${when.late ? "text-[#a33417]" : "text-[#2f6b4f]"}`}>{when.text}</span>}
                        {idea.why && <span className="text-xs text-[#5a4f47]">{idea.why}</span>}
                        <span className="mt-auto pt-1 text-xs font-semibold">
                          {idea.shop} ↗<span className="sr-only"> (opens the shop page in a new tab)</span>
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {found.ideas.length > 0 && <p className="m-0 text-xs text-[#8f8379]">Prices and delivery as each shop&apos;s own page states them today. AIDaddy never buys.</p>}
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
          {NEEDS.map((n) => (
            <li key={n.label}>
              <button type="button" onClick={() => open(n)} className="flex h-full w-full items-start gap-3 rounded-2xl border border-[#ece6dc] bg-white p-4 text-left">
                {n.app && (
                  <span className="box-border flex size-10 flex-none items-center justify-center rounded-[11px] border border-[#ece6dc] bg-white p-1.5">
                    <AppLogo app={n.app} size={26} />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{n.label}</span>
                  <span className="text-[13px] text-[#7a6e66]">
                    {n.app} · {n.from}
                  </span>
                  <span className="text-xs font-semibold text-[#8f8379]">{n.to === "shop" ? "Search shops" : n.to === "job" ? "Get it done" : "Ask in the chat"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-[#8f8379]">The messages are examples for the demo family; the searches are real. AIDaddy never buys.</p>
      </section>
    </div>
  );
}
