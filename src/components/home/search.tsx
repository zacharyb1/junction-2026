"use client";

/**
 * "Shopping from your chats" on the phone: search shops for what the family needs, with each product's price as its
 * shop page states it. A gift knows who it is for and marks what would arrive late; a household job goes to Get it
 * done and any other question to the chat (shop-search.ts). The desktop page shows the same.
 */

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { isJob } from "@/lib/home-demo";
import { useLive } from "./home-app";
import { APPS, arrival, NEEDS, type Need, QUICK, useShopSearch } from "./shop-search";
import { AppLogo, H1, Icon, ICON, Main, Spinner, TabBar, TabHeader, useNav } from "./ui";

export function SearchScreen() {
  const nav = useNav();
  const router = useRouter();
  const { code } = useLive();
  const { found, search, searchText } = useShopSearch(code);
  const [draft, setDraft] = useState("");

  function open(need: Need) {
    if (need.to === "shop" && need.shop) void search(need.ask, need.shop);
    else if (need.to === "job") nav.push({ s: "tasks", job: need.ask });
    else router.push(nav.askHref(need.ask));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (isJob(text)) nav.push({ s: "tasks", job: text });
    else searchText(text);
  }

  return (
    <>
      <TabHeader>
        <H1>Shopping from your chats</H1>
        <form onSubmit={submit} className="box-border flex h-[52px] items-center gap-2.5 rounded-2xl border border-[#ece6dc] bg-white px-4">
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
          {found.status === "searching" && <Spinner />}
        </form>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q.label} type="button" onClick={() => open(q)} className="h-[34px] rounded-full border border-[#ece6dc] bg-white px-3 text-[13px] font-medium">
              {q.label}
            </button>
          ))}
        </div>
      </TabHeader>

      <Main className="gap-1.5 pt-1.5">
        {found.status !== "idle" && (
          <section aria-label={`In shops for ${found.heading}`} aria-live="polite" className="flex flex-none flex-col gap-2 pb-3">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">{found.heading}</h2>
            {found.status === "searching" && <p className="m-0 text-sm text-[#7a6e66]">Reading shop pages for prices, about half a minute…</p>}
            {found.status === "error" && <p className="m-0 text-sm text-[#a33417]">The search did not work this time: {found.error}.</p>}
            {found.status === "ok" && found.ideas.length === 0 && <p className="m-0 text-sm text-[#7a6e66]">No shop page stated a price for this. Try other words.</p>}
            {found.ideas.map((idea) => {
              const when = arrival(idea);
              return (
                <a key={idea.url} href={idea.url} target="_blank" rel="noreferrer" className="flex flex-none gap-3 rounded-[14px] border border-[#ece6dc] bg-white p-2.5 no-underline">
                  {idea.image ? (
                    // The shop's own picture, on its own host: next/image would need every shop allowed in config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={idea.image} alt="" className="size-16 flex-none rounded-lg bg-[#f1ebe2] object-contain" />
                  ) : (
                    <span aria-hidden className="flex size-16 flex-none items-center justify-center rounded-lg bg-[#f1ebe2] text-[#8f8379]">
                      <Icon d={ICON.search} size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 text-sm font-semibold">{idea.name}</span>
                    <span className="text-[15px] font-bold text-[#c4572f]">{idea.price}</span>
                    {when && <span className={`text-xs font-semibold ${when.late ? "text-[#a33417]" : "text-[#2f6b4f]"}`}>{when.text}</span>}
                    <span className="truncate text-xs text-[#7a6e66]">
                      {idea.shop} ↗<span className="sr-only"> (opens the shop page in a new tab)</span>
                    </span>
                  </span>
                </a>
              );
            })}
          </section>
        )}

        <div className="flex items-center justify-between pb-1.5">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">From your messages</h2>
          <span className="flex gap-1">
            {APPS.map((a) => (
              <AppLogo key={a} app={a} size={20} label={a} />
            ))}
          </span>
        </div>
        {NEEDS.map((n) => (
          <button key={n.label} type="button" onClick={() => open(n)} className="flex flex-none gap-3 border-b border-[#ece6dc] py-3 text-left">
            {n.app && (
              <span className="box-border flex size-9 flex-none items-center justify-center rounded-[10px] border border-[#ece6dc] bg-white p-1.5">
                <AppLogo app={n.app} size={24} />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[15px] font-semibold">{n.label}</span>
              <span className="truncate text-xs text-[#7a6e66]">
                {n.app} · {n.from}
              </span>
            </span>
            <span className="flex-none self-center text-[11px] font-semibold text-[#8f8379]">{n.to === "shop" ? "Shops" : n.to === "job" ? "Get it done" : "Chat"}</span>
          </button>
        ))}
        <p className="m-0 py-2 text-[11px] text-[#8f8379]">The messages are examples for the demo family; the searches are real. AIDaddy never buys.</p>
      </Main>
      <TabBar current="search" />
    </>
  );
}
