"use client";

/**
 * "Shopping from your chats": things the family needs, noticed in its messages, each a question for UKK's chat, which
 * finds products and gifts with their shop pages. The messages behind them are examples in this demo.
 */

import { type FormEvent, useState } from "react";
import type { AppName } from "@/lib/home-demo";
import { AppLogo, H1, Icon, ICON, Main, TabBar, TabHeader, useNav } from "./ui";

const QUICK = ["Gift for Eino", "Boots for Aino", "Weekend with kids", "Dinner ideas"];
const APPS: AppName[] = ["WhatsApp", "Telegram", "Gmail", "Calendar", "Wilma"];

const ROWS: [AppName, string, string, string][] = [
  ["Calendar", "A gift for Eino's 5th birthday", "Eino turns 5 on 12 Dec", "A birthday present for Eino, he turns 5 and loves drawing, under €40"],
  ["WhatsApp", "Winter boots for Aino", "“Her boots are too small again”", "Warm winter boots for a 9-month-old, size 20, in Helsinki"],
  ["Wilma", "Rain clothes for daycare", "“Please bring rain clothes on Friday”", "Rain clothes for a 4-year-old for daycare"],
  ["Telegram", "A babysitter for Saturday", "“Can anyone watch the kids Sat evening?”", "A babysitter in Kallio, Helsinki for Saturday evening"],
  ["Gmail", "A cheaper electricity contract", "“Your fixed-price contract ends 31 Dec”", "A cheaper electricity contract in Helsinki for a family flat"],
  ["Calendar", "Something for your jazz evening", "Thursday evening is free", "Jazz in Helsinki on Thursday evening"],
];

export function SearchScreen() {
  const nav = useNav();
  const [draft, setDraft] = useState("");
  const go = (q: string) => window.location.assign(nav.askHref(q));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) go(draft.trim());
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
        </form>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => go(q)} className="h-[34px] rounded-full border border-[#ece6dc] bg-white px-3 text-[13px] font-medium">
              {q}
            </button>
          ))}
        </div>
      </TabHeader>

      <Main className="pt-1.5">
        <div className="flex items-center justify-between pb-1.5">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">From your messages</h2>
          <span className="flex gap-1">
            {APPS.map((a) => (
              <AppLogo key={a} app={a} size={20} label={a} />
            ))}
          </span>
        </div>
        {ROWS.map(([app, title, from, ask]) => (
          <a key={title} href={nav.askHref(ask)} className="flex flex-none gap-3 border-b border-[#ece6dc] py-3 no-underline">
            <span className="box-border flex size-9 flex-none items-center justify-center rounded-[10px] border border-[#ece6dc] bg-white p-1.5">
              <AppLogo app={app} size={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[15px] font-semibold">{title}</span>
              <span className="truncate text-xs text-[#7a6e66]">
                {app} · {from}
              </span>
            </span>
            <Icon d={ICON.chevron} size={18} stroke="#b0a99e" width={2} className="flex-none self-center" />
          </a>
        ))}
        <p className="m-0 py-2 text-[11px] text-[#8f8379]">Example messages for the demo family. Each opens the chat, which searches shops with sources. UKK never buys.</p>
      </Main>
      <TabBar current="search" />
    </>
  );
}
