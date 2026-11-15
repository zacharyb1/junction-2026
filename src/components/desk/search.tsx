"use client";

/**
 * The desktop "Shopping from your chats": things the family needs, noticed in its messages, laid out as a grid of
 * cards. As on the phone page, the messages are the demo's examples and a search shows what AIDaddy would do.
 */

import { type FormEvent, useState } from "react";
import { APPS, QUICK, ROWS } from "@/components/home/search";
import { AppLogo, Icon, ICON } from "@/components/home/ui";

export function DeskSearch() {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const go = (q: string) => setNote(`Demo: AIDaddy would look for “${q}” in shops, each with its price on the shop’s own page. It never buys.`);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) go(draft.trim());
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
            <button key={q} type="button" onClick={() => go(q)} className="h-[34px] rounded-full border border-[#e4ddd3] bg-white px-3 text-[13px] font-medium">
              {q}
            </button>
          ))}
        </div>
        {note && (
          <p role="status" className="m-0 max-w-[720px] text-sm text-[#5a4f47]">
            {note}
          </p>
        )}
      </header>

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
              <button type="button" onClick={() => go(ask)} className="flex h-full w-full items-start gap-3 rounded-2xl border border-[#ece6dc] bg-white p-4 text-left">
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
        <p className="m-0 text-xs text-[#8f8379]">Example messages for the demo family. In the full app each one is searched in shops, with sources. AIDaddy never buys.</p>
      </section>
    </div>
  );
}
