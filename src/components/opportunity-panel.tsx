"use client";

/**
 * The household's hidden opportunities on /assistant: kept fresh in the background from what UKK knows about the
 * family, shown as a tab in the sidebar and as cards in the main area, with the "About you" profile they come from.
 * The best findings are the ones nobody was looking for, so the search does not wait for a question.
 */

import { Baby, CalendarClock, ChevronDown, ExternalLink, Heart, Loader2, MessageCircle, PiggyBank, RefreshCw, Sparkles, Wallet } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Opportunity, OpportunityScan } from "@/lib/engine/opportunities";

export type Palette = Record<"paper" | "side" | "ink" | "muted" | "line" | "accent", string>;
type Profile = { city: string; members: string; situation: string; interests: string };

// An example household until the family connects its own systems: a busy parent with two small children.
const EXAMPLE: Profile = {
  city: "Helsinki",
  members: "Laura, 38, works shifts as a nurse\nEino, 4\nAino, 9 months",
  situation: "Renting a two-room flat\nBack to work after parental leave",
  interests: "jazz, swimming, baking",
};

const STORE = "ukk-household-profile";
const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter((x) => x.length >= 2);

const LENS: Record<Opportunity["lens"], { label: string; icon: typeof Heart; color: string }> = {
  situation: { label: "Your situation", icon: Wallet, color: "#2f6b4f" },
  children: { label: "For the kids", icon: Baby, color: "#3a5a8c" },
  money: { label: "Money you may miss", icon: PiggyBank, color: "#8a5a1f" },
  interests: { label: "For you", icon: Heart, color: "#a8482a" },
};

function readProfile(): Profile {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return { ...EXAMPLE, ...(JSON.parse(saved) as Partial<Profile>) };
  } catch {
    // On the server, or storage blocked: the example family stands in.
  }
  return EXAMPLE;
}

async function fetchScan(code: string, p: Profile): Promise<OpportunityScan> {
  const res = await fetch("/api/opportunities", {
    method: "POST",
    headers: { "content-type": "application/json", "x-demo-code": code },
    body: JSON.stringify({ city: p.city.trim() || "Helsinki", members: lines(p.members), situation: lines(p.situation), interests: lines(p.interests) }),
  });
  const body = (await res.json().catch(() => null)) as (OpportunityScan & { error?: string }) | null;
  if (!res.ok || !body?.opportunities) throw new Error(body?.error ?? `Search failed (${res.status})`);
  return body;
}

/** The household profile and its latest scan. The first scan starts when the page opens. */
export function useOpportunities(code: string) {
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [scan, setScan] = useState<OpportunityScan | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");

  const finish = useCallback((p: Promise<OpportunityScan>) => {
    p.then((s) => {
      setScan(s);
      setError("");
    })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Search failed."))
      .finally(() => setScanning(false));
  }, []);

  const [first] = useState(profile);
  useEffect(() => finish(fetchScan(code, first)), [code, first, finish]);

  const rescan = useCallback(
    (p: Profile) => {
      setScanning(true);
      finish(fetchScan(code, p));
    },
    [code, finish],
  );

  const save = useCallback(
    (p: Profile) => {
      try {
        localStorage.setItem(STORE, JSON.stringify(p));
      } catch {
        // Not remembered on this device; the search still runs.
      }
      rescan(p);
    },
    [rescan],
  );

  return { profile, setProfile, scan, scanning, error, rescan, save };
}

type Household = ReturnType<typeof useOpportunities>;

/** The sidebar card with the household photo and the editable profile. */
export function AboutYou({ household, colors }: { household: Household; colors: Palette }) {
  const { profile, setProfile, scanning, save } = household;
  const [open, setOpen] = useState(false);
  const field = "w-full rounded-lg bg-white/80 px-2.5 py-1.5 text-sm leading-5";
  const border = { border: `1px solid ${colors.line}` };
  return (
    <section className="shrink-0 overflow-hidden rounded-2xl bg-white/70" style={border}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="block w-full text-left">
        <Image src="/assistant/family.jpg" alt="" width={560} height={373} className="h-24 w-full object-cover" />
        {/* The server renders the example city; this device may have saved another one. */}
        <span suppressHydrationWarning className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
          About your household
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            save(profile);
          }}
          className="flex flex-col gap-2 px-3 pb-3"
        >
          <label className="flex flex-col gap-1 text-xs font-medium">
            City
            <input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className={field} style={border} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Family (one per line, with ages)
            <textarea rows={3} value={profile.members} onChange={(e) => setProfile({ ...profile, members: e.target.value })} className={field} style={border} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            What is going on now
            <textarea rows={3} value={profile.situation} onChange={(e) => setProfile({ ...profile, situation: e.target.value })} className={field} style={border} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Interests
            <input value={profile.interests} onChange={(e) => setProfile({ ...profile, interests: e.target.value })} className={field} style={border} />
          </label>
          <button type="submit" disabled={scanning} className="mt-1 h-10 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: colors.accent }}>
            Save and search again
          </button>
          <p className="text-[11px] leading-snug" style={{ color: colors.muted }}>
            An example household until you change it. Kept on this device only.
          </p>
        </form>
      )}
    </section>
  );
}

function Card({ o, colors, onAsk }: { o: Opportunity; colors: Palette; onAsk: (text: string) => void }) {
  const lens = LENS[o.lens];
  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md" style={{ border: `1px solid ${colors.line}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: lens.color, background: `${lens.color}14` }}>
          <lens.icon className="size-3.5" aria-hidden /> {lens.label}
        </span>
        {o.deadline && (
          <span className="inline-flex max-w-[55%] items-center gap-1 truncate text-xs" style={{ color: colors.muted }}>
            <CalendarClock className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{o.deadline}</span>
          </span>
        )}
      </div>
      <h3 className="font-serif text-xl leading-snug font-semibold">{o.title}</h3>
      {o.value && (
        <p className="line-clamp-2 text-lg font-semibold" style={{ color: colors.accent }}>
          {o.value}
        </p>
      )}
      {o.why && (
        <p className="rounded-xl px-3 py-2 text-sm" style={{ background: colors.paper, color: colors.ink }}>
          <span className="font-semibold">Why you: </span>
          {o.why}
        </p>
      )}
      <blockquote className="line-clamp-3 border-l-2 pl-3 text-sm italic" style={{ borderColor: colors.line, color: colors.muted }}>
        “{o.quote}”
      </blockquote>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <a
          href={o.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white"
          style={{ background: colors.accent }}
        >
          Open <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only"> {o.source} (opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={() => onAsk(`Tell me more about this, and what I should do next: ${o.title} (${o.url})`)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium"
          style={{ border: `1px solid ${colors.line}` }}
        >
          <MessageCircle className="size-4" aria-hidden /> Ask UKK
        </button>
        <span className="ml-auto truncate text-xs" style={{ color: colors.muted }}>
          {o.source}
        </span>
      </div>
    </article>
  );
}

/** The main-area view of the opportunities: a heading with what was searched, then the cards. */
export function OpportunityView({ household, colors, onAsk }: { household: Household; colors: Palette; onAsk: (text: string) => void }) {
  const { scan, scanning, error, profile, rescan } = household;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight">
            <Sparkles className="size-6" style={{ color: colors.accent }} aria-hidden /> Hidden opportunities
          </h1>
          <p suppressHydrationWarning className="text-sm" style={{ color: colors.muted }}>
            Found for your household in {profile.city || "your city"}, from what UKK knows about you.
            {scan && !scanning ? ` ${scan.searches} searches, every finding quoted from its own page.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => rescan(profile)}
          disabled={scanning}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium disabled:opacity-50"
          style={{ border: `1px solid ${colors.line}` }}
        >
          <RefreshCw className={`size-4 ${scanning ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden /> Search again
        </button>
      </header>

      <div aria-live="polite" className="flex flex-col gap-4">
        {scanning && (
          <p className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Looking for what your family may be missing…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium" style={{ color: colors.accent }}>
            {error}
          </p>
        )}
        {scan && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {scan.opportunities.map((o) => (
              <Card key={o.url + o.title} o={o} colors={colors} onAsk={onAsk} />
            ))}
          </div>
        )}
        {scan && !scan.opportunities.length && !scanning && (
          <p className="text-sm" style={{ color: colors.muted }}>
            Nothing new this time. Tell UKK more about your household in the sidebar.
          </p>
        )}
      </div>
    </div>
  );
}
