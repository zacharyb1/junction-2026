"use client";

/**
 * The Communities tab on /assistant: a parent asks a question and sees where other people talk about it (forum
 * threads, Facebook and Reddit groups, podcasts), with a line from each and a way in to read and ask there.
 */

import { ExternalLink, Headphones, Loader2, MessagesSquare, PlayCircle, Search, UsersRound, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { Palette } from "@/components/opportunity-panel";
import type { Community, CommunitySearch, Kind } from "@/lib/engine/communities";

const QUESTIONS = ["My toddler wakes up every night", "Finding a good daycare in Helsinki", "Moving to Finland with small kids", "Going back to work after parental leave"];

const KIND: Record<Kind, { icon: typeof Users; color: string; action: string }> = {
  Forum: { icon: MessagesSquare, color: "#2f6b4f", action: "Read and reply" },
  "Facebook group": { icon: UsersRound, color: "#3a5a8c", action: "Join the group" },
  Reddit: { icon: MessagesSquare, color: "#b8452a", action: "Read and comment" },
  Podcast: { icon: Headphones, color: "#6b3a8c", action: "Listen" },
  Video: { icon: PlayCircle, color: "#8c3a3a", action: "Watch" },
  Blog: { icon: Users, color: "#8a5a1f", action: "Read and comment" },
  Other: { icon: Users, color: "#6f625a", action: "Open" },
};

function Card({ c, colors }: { c: Community; colors: Palette }) {
  const k = KIND[c.kind];
  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${colors.line}` }}>
      <span className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: k.color, background: `${k.color}14` }}>
        <k.icon className="size-3.5" aria-hidden /> {c.kind}
      </span>
      <h3 className="font-serif text-lg leading-snug font-semibold">{c.title}</h3>
      <blockquote className="line-clamp-4 rounded-xl px-3 py-2 text-sm italic" style={{ background: colors.paper, color: colors.ink }}>
        “{c.quote}”
      </blockquote>
      {c.why && (
        <p className="text-sm" style={{ color: colors.muted }}>
          {c.why}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white" style={{ background: colors.accent }}>
          {k.action} <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only"> on {c.site} (opens in a new tab)</span>
        </a>
        <span className="truncate text-xs" style={{ color: colors.muted }}>
          {c.site}
        </span>
      </div>
    </article>
  );
}

export function CommunityView({ code, colors, city }: { code: string; colors: Palette; city: string }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CommunitySearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(text: string) {
    const q = text.trim();
    if (q.length < 5 || busy) return;
    setQuestion(q);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ question: q, city: city || "Helsinki" }),
      });
      const body = (await res.json().catch(() => null)) as (CommunitySearch & { error?: string }) | null;
      if (!res.ok || !body?.communities) throw new Error(body?.error ?? `Search failed (${res.status})`);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void search(question);
  }

  const card = { border: `1px solid ${colors.line}` };
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight">
          <Users className="size-6" style={{ color: colors.accent }} aria-hidden /> Communities
        </h1>
        <p className="text-sm" style={{ color: colors.muted }}>
          You are not the first parent with this question. AIDaddy finds the forums, groups and podcasts where people talk about it, so you can read what worked and ask them.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm" style={card}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="community-question" className="sr-only">
            What is on your mind?
          </label>
          <input id="community-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What is on your mind? e.g. my toddler wakes up every night" className="h-11 flex-1 rounded-xl px-3 text-base" style={card} />
          <button type="submit" disabled={busy || question.trim().length < 5} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50" style={{ background: colors.accent }}>
            {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Search className="size-4" aria-hidden />}
            {busy ? "Searching" : "Find people"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((q) => (
            <button key={q} type="button" onClick={() => void search(q)} className="rounded-full px-3 py-1 text-xs hover:bg-black/5" style={{ ...card, color: colors.muted }}>
              {q}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {busy && (
          <p className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Looking for forums, groups and podcasts about this…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium" style={{ color: colors.accent }}>
            {error}
          </p>
        )}
        {result && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.communities.map((c) => (
              <Card key={c.url} c={c} colors={colors} />
            ))}
          </div>
        )}
        {result && !result.communities.length && (
          <p className="text-sm" style={{ color: colors.muted }}>
            No discussions found for this. Try other words.
          </p>
        )}
      </div>
    </div>
  );
}
