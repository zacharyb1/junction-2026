"use client";

/**
 * "Ask parents like you": where other parents talk about the family's question, with a way in to ask there.
 * The question the demo starts with shows prepared examples; asking another one searches live (/api/communities).
 * Podcasts and videos open on the platform's own site, at the minute about the question.
 */

import { type FormEvent, useState } from "react";
import type { CommunitySearch } from "@/lib/engine/communities";
import { type CommunityFilter, type CommunityRow, communityRow, DEMO_COMMUNITIES, DEMO_QUESTION, HOUSEHOLD } from "@/lib/home-demo";
import { H1, Icon, ICON, Main, Spinner, TabBar, TabHeader } from "./ui";

const FILTERS: CommunityFilter[] = ["All", "Forums", "Groups", "Podcasts"];
const KIND_ICON: Record<CommunityRow["kind"], string> = { Forums: ICON.chat, Groups: ICON.people, Podcasts: ICON.podcast };

type Live = { status: "idle" | "searching" | "ok" | "error"; question: string; rows: CommunityRow[]; error: string };

export function CommunityScreen({ code }: { code: string }) {
  const [draft, setDraft] = useState(DEMO_QUESTION);
  const [filter, setFilter] = useState<CommunityFilter>("All");
  const [live, setLive] = useState<Live>({ status: "idle", question: "", rows: [], error: "" });

  async function search(e: FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (question.length < 5 || live.status === "searching") return;
    if (question === DEMO_QUESTION) {
      setLive({ status: "idle", question: "", rows: [], error: "" });
      return;
    }
    setLive({ status: "searching", question, rows: [], error: "" });
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ question, city: HOUSEHOLD.city, country: HOUSEHOLD.country }),
      });
      const body = (await res.json().catch(() => null)) as (CommunitySearch & { error?: string }) | null;
      if (!res.ok || !body?.communities) throw new Error(res.status === 401 ? "this demo needs its access code" : (body?.error ?? `search failed (${res.status})`));
      setLive({ status: "ok", question, rows: body.communities.map(communityRow), error: "" });
    } catch (err) {
      setLive({ status: "error", question, rows: [], error: err instanceof Error ? err.message : "search failed" });
    }
  }

  const all = live.status === "idle" ? DEMO_COMMUNITIES : live.rows;
  const rows = filter === "All" ? all : all.filter((r) => r.kind === filter);

  return (
    <>
      <TabHeader className="pb-2.5">
        <H1>Ask parents like you</H1>
        <form onSubmit={search} className="box-border flex h-12 items-center gap-2.5 rounded-[14px] border border-[#ece6dc] bg-white px-4">
          <Icon d={ICON.search} size={18} stroke="#7a6e66" width={2} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Search the community"
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#2a2420] outline-none"
          />
          {live.status === "searching" && <Spinner />}
        </form>
        <div role="group" aria-label="Filter" className="flex gap-2">
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f)}
                className="h-[34px] rounded-full border px-3.5 text-[13px] font-semibold"
                style={{ background: on ? "#2a2420" : "#fff", color: on ? "#fff" : "#2a2420", borderColor: on ? "#2a2420" : "#ece6dc" }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </TabHeader>

      <Main>
        {live.status === "searching" && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">Looking for forums, groups and podcasts about “{live.question}”…</p>}
        {live.status === "error" && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">Live search is not available right now: {live.error}.</p>}
        {live.status === "ok" && all.length === 0 && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">No places with a quote on their page this time.</p>}
        {rows.map((r) => (
          <div key={r.href + r.title} className="flex flex-none gap-3 border-b border-[#ece6dc] py-3.5">
            <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-xl bg-[#f1ebe2]">
              <Icon d={KIND_ICON[r.kind]} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[15px] font-semibold leading-[1.3]">{r.title}</span>
              {r.quote && <span className="line-clamp-2 text-[13px] italic text-[#5a4f47]">“{r.quote}”</span>}
              <span className="text-xs text-[#7a6e66]">{r.meta}</span>
            </span>
            <a
              href={r.href}
              target="_blank"
              rel="noreferrer"
              className="flex h-[34px] flex-none items-center self-center whitespace-nowrap rounded-[10px] border border-[#ece6dc] bg-white px-3 text-[13px] font-semibold no-underline"
            >
              {r.action}
              <span className="sr-only"> (opens {new URL(r.href).hostname} in a new tab)</span>
            </a>
          </div>
        ))}
        <p className="m-0 py-2 text-[11px] text-[#8f8379]">
          {live.status === "idle"
            ? "Examples for the demo question. Ask your own to search live. UKK never posts for you."
            : "Found on the web today, each with a line from its page. UKK never posts for you."}
        </p>
      </Main>
      <TabBar current="community" />
    </>
  );
}
