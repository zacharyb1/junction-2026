"use client";

/**
 * The desktop "Ask parents like you": the question and the places other parents talk about it on the left, the chosen
 * place on the right with a way in to ask there. It searches the same way as the phone page (useCommunitySearch).
 */

import Image from "next/image";
import { useState } from "react";
import { FILTERS, KIND_ICON } from "@/components/home/community";
import { useCommunitySearch } from "@/components/home/community-search";
import { Icon, ICON, Spinner } from "@/components/home/ui";
import { DEMO_QUESTION } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";

const KIND_LABEL = { Forums: "Forum thread", Groups: "Group", Podcasts: "Video or podcast" } as const;

export function DeskCommunity() {
  const { code } = useDesk();
  const { draft, setDraft, filter, setFilter, live, search, all, rows } = useCommunitySearch(code);
  const [picked, setPicked] = useState(0);
  const place = rows[Math.min(picked, rows.length - 1)];
  const question = live.status === "idle" ? DEMO_QUESTION : live.question;

  return (
    <div className="flex min-h-dvh flex-wrap items-stretch">
      <section aria-label="Places to ask" className="box-border flex max-w-full flex-[1_1_440px] flex-col border-r border-[#ece6dc]">
        <div className="flex flex-col gap-2.5 border-b border-[#ece6dc] px-5 py-4">
          <h1 className="m-0 text-[22px] font-bold">Ask parents like you</h1>
          <div className="relative h-[150px] overflow-hidden rounded-[10px] text-white">
            <Image src="/home/photos/play.jpg" alt="Children playing with soap bubbles" fill sizes="440px" className="object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-[rgba(42,36,32,.72)] px-3.5 py-2.5 text-[13px]">
              <strong>Parents like you</strong> · forums, groups and videos about your question
            </span>
          </div>
          <form onSubmit={search} className="box-border flex h-11 items-center gap-2.5 rounded-full border border-[#e4ddd3] bg-white px-3.5">
            <Icon d={ICON.search} size={16} stroke="#7a6e66" width={2} />
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setPicked(0);
              }}
              aria-label="Your question"
              enterKeyHint="search"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium outline-none"
            />
            {live.status === "searching" && <Spinner />}
          </form>
          <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={f === filter}
                onClick={() => {
                  setFilter(f);
                  setPicked(0);
                }}
                className={`h-8 rounded-md px-2.5 text-[13px] font-semibold ${f === filter ? "bg-[#f1ebe2]" : "text-[#7a6e66]"}`}
              >
                {f === "Podcasts" ? "Videos and podcasts" : f}
              </button>
            ))}
          </div>
        </div>
        {live.status === "searching" && <p className="m-0 px-5 py-3 text-[13px] text-[#7a6e66]">Looking for forums, groups and podcasts about “{live.question}”…</p>}
        {live.status === "error" && <p className="m-0 px-5 py-3 text-[13px] text-[#7a6e66]">Live search is not available right now: {live.error}.</p>}
        {live.status === "ok" && all.length === 0 && <p className="m-0 px-5 py-3 text-[13px] text-[#7a6e66]">No places with a quote on their page this time.</p>}
        {rows.map((r, i) => (
          <button
            key={r.href + r.title}
            type="button"
            aria-current={r === place ? "true" : undefined}
            onClick={() => setPicked(i)}
            className={`grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border-b border-[#ece6dc] px-5 py-3.5 text-left ${r === place ? "bg-white" : ""}`}
          >
            <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-[#f1ebe2]">
              <Icon d={KIND_ICON[r.kind]} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">{r.title}</span>
              <span className="text-xs text-[#7a6e66]">{r.meta}</span>
            </span>
          </button>
        ))}
        <p className="m-0 px-5 py-3 text-xs text-[#8f8379]">
          {live.status === "idle" ? "Examples for the demo question. Ask your own to search live." : "Found on the web today, each with a line from its page."}
        </p>
      </section>

      <article className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] px-10 pb-10 pt-7">
        {place ? (
          <>
            <span className="text-xs text-[#7a6e66]">
              {KIND_LABEL[place.kind]} · about “{question}”
            </span>
            <h2 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.01em]">{place.title}</h2>
            <p className="m-0 text-base text-[#5a4f47]">{place.meta}</p>
            {place.quote && <blockquote className="m-0 border-l-2 border-[#c4572f] py-1 pl-3 italic leading-normal">“{place.quote}”</blockquote>}
            <a href={place.href} target="_blank" rel="noreferrer" className="flex h-10 items-center self-start rounded-full bg-[#c4572f] px-4 font-semibold text-white no-underline">
              {place.action}
              <span className="sr-only"> (opens {new URL(place.href).hostname} in a new tab)</span>
            </a>
            <span className="text-xs text-[#7a6e66]">Opens on {new URL(place.href).hostname.replace(/^www\./, "")}. UKK never posts for you.</span>
          </>
        ) : (
          <p className="m-0 text-[#7a6e66]">Pick a place on the left.</p>
        )}
      </article>
    </div>
  );
}
