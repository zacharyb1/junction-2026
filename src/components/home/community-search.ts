"use client";

/**
 * The "Ask parents like you" search, so the phone and desktop pages search the same way: the demo question shows
 * prepared examples; any other question searches live (/api/communities).
 */

import { type FormEvent, useState } from "react";
import type { CommunitySearch } from "@/lib/engine/communities";
import { type CommunityFilter, type CommunityRow, communityRow, DEMO_COMMUNITIES, DEMO_QUESTION, HOUSEHOLD } from "@/lib/home-demo";

export type CommunityLive = { status: "idle" | "searching" | "ok" | "error"; question: string; rows: CommunityRow[]; error: string };

export function useCommunitySearch(code: string) {
  const [draft, setDraft] = useState(DEMO_QUESTION);
  const [filter, setFilter] = useState<CommunityFilter>("All");
  const [live, setLive] = useState<CommunityLive>({ status: "idle", question: "", rows: [], error: "" });

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
  return { draft, setDraft, filter, setFilter, live, search, all, rows };
}
