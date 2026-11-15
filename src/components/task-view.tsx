"use client";

/**
 * "Get it done" on /assistant: a household job goes in, AIDaddy finds real local companies, rings them all at once,
 * compares their quotes with the family's calendar and proposes one booking for the parent to approve, so a busy
 * parent does not spend an evening on the phone.
 *
 * Real: the companies, their phone numbers and any prices they list, each from the company's own page (/api/helpers).
 * Simulated in this demo, and labelled so: the calls, the negotiated quotes and the time slots.
 */

import { CalendarCheck, Check, ExternalLink, Loader2, Phone, PhoneCall, Search, Wrench } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { Palette } from "@/components/opportunity-panel";
import type { Helper, HelperSearch } from "@/lib/engine/helpers";

const JOBS = ["Kitchen tap is leaking", "Babysitter for Friday evening", "Deep clean before moving out", "Fix a washing machine that does not drain"];

// The parent's week, as AIDaddy would read it from the family calendar. An example until a calendar is connected.
const SHIFTS: Record<string, string> = { Mon: "7–15 shift", Tue: "", Wed: "7–15 shift", Thu: "7–15 shift", Fri: "" };
const SLOTS = ["Mon 9:00", "Tue 10:00", "Tue 16:00", "Wed 8:00", "Thu 13:00", "Fri 15:00"];
const fits = (slot: string) => {
  const [day, time] = slot.split(" ");
  return !SHIFTS[day] || Number(time.split(":")[0]) >= 16;
};

type Call = { helper: Helper; stage: number; quote: number; discount: number; slot: string };
type Task = { job: string; who: string; when: string; price: number; status: "Booked" | "Waiting" };

// The same company always gets the same simulated answer, so a replay of the demo matches the recording.
function seed(text: string) {
  let h = 7;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h;
}

/** A simulated quote that starts from the price the company really lists, when it lists one. */
function simulate(helper: Helper): Omit<Call, "helper" | "stage"> {
  const s = seed(helper.name);
  const listed = Number(helper.price.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".")) || 0;
  const hourly = /\/\s*h|tunti|hour/i.test(helper.price);
  const base = listed ? (hourly ? listed * 1.5 + 20 : listed) : 90 + (s % 60);
  const discount = s % 3 === 0 ? 0 : s % 2 ? 10 : 15;
  return { quote: Math.round(base * (1 - discount / 100)), discount, slot: SLOTS[s % SLOTS.length] };
}

const LINES = (c: Call) => [
  `AIDaddy: Hello, I am calling for Laura in Helsinki about: the job below.`,
  `${c.helper.name}: Yes, we can do that.${c.helper.price ? ` Our listed price is ${c.helper.price}.` : ""}`,
  c.discount ? `AIDaddy: Could you do ${c.discount}% less if she books today?` : `AIDaddy: Is that your best price?`,
  `${c.helper.name}: ${c.discount ? `All right, ${c.discount}% off.` : "That is our price."} Earliest ${c.slot}.`,
];

export function TaskView({ code, colors, city }: { code: string; colors: Palette; city: string }) {
  const [job, setJob] = useState("");
  const [search, setSearch] = useState<HelperSearch | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([{ job: "Renew Eino's daycare place", who: "City of Helsinki", when: "by 30 Nov", price: 0, status: "Waiting" }]);
  const [booked, setBooked] = useState("");

  // Each call moves on a step at a time: dialling, talking, negotiating, quote.
  const calling = calls.some((c) => c.stage < 4);
  useEffect(() => {
    if (!calling) return;
    const t = setTimeout(() => setCalls((cs) => cs.map((c, i) => (c.stage < 4 && Math.random() < 0.55 + i * 0.05 ? { ...c, stage: c.stage + 1 } : c))), 700);
    return () => clearTimeout(t);
  }, [calls, calling]);

  async function start(text: string) {
    const what = text.trim();
    if (what.length < 5 || finding) return;
    setJob(what);
    setSearch(null);
    setCalls([]);
    setBooked("");
    setError("");
    setFinding(true);
    try {
      const res = await fetch("/api/helpers", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify({ job: what, city: city || "Helsinki" }),
      });
      const body = (await res.json().catch(() => null)) as (HelperSearch & { error?: string }) | null;
      if (!res.ok || !body?.helpers) throw new Error(body?.error ?? `Search failed (${res.status})`);
      setSearch(body);
      setCalls(body.helpers.map((helper) => ({ helper, stage: 0, ...simulate(helper) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setFinding(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void start(job);
  }

  const done = calls.length > 0 && !calling;
  const best = done ? [...calls].filter((c) => fits(c.slot)).sort((a, b) => a.quote - b.quote)[0] : undefined;
  const card = { border: `1px solid ${colors.line}` };

  function book(c: Call) {
    setBooked(c.helper.name);
    setTasks((t) => [{ job, who: c.helper.name, when: c.slot, price: c.quote, status: "Booked" }, ...t]);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight">
          <Wrench className="size-6" style={{ color: colors.accent }} aria-hidden /> Get it done
        </h1>
        <p className="text-sm" style={{ color: colors.muted }}>
          Tell AIDaddy what needs doing. He finds local companies, calls them all at once, compares prices with your calendar and books the best one when you say yes.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm" style={card}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="task-job" className="sr-only">
            What needs doing?
          </label>
          <input
            id="task-job"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="What needs doing? e.g. kitchen tap is leaking"
            className="h-11 flex-1 rounded-xl px-3 text-base"
            style={card}
          />
          <button type="submit" disabled={finding || job.trim().length < 5} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50" style={{ background: colors.accent }}>
            {finding ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <PhoneCall className="size-4" aria-hidden />}
            {finding ? "Finding companies" : "Find and call"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {JOBS.map((j) => (
            <button key={j} type="button" onClick={() => void start(j)} className="rounded-full px-3 py-1 text-xs hover:bg-black/5" style={{ ...card, color: colors.muted }}>
              {j}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p role="alert" className="text-sm font-medium" style={{ color: colors.accent }}>
          {error}
        </p>
      )}
      {finding && (
        <p className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
          <Search className="size-4" aria-hidden /> Finding companies in {city} that do this, from their own pages…
        </p>
      )}

      {calls.length > 0 && (
        <section aria-live="polite" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              {calling ? `Calling ${calls.length} companies at once…` : `${calls.length} quotes for “${search?.job}”`}
            </h2>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs" style={{ color: colors.muted }}>
              Demo: calls and quotes are simulated. Companies, numbers and listed prices are real.
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {calls.map((c) => {
              const isBest = best?.helper.name === c.helper.name;
              return (
                <article key={c.helper.url} className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm" style={{ border: `${isBest ? 2 : 1}px solid ${isBest ? colors.accent : colors.line}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{c.helper.name}</h3>
                      <p className="truncate text-xs" style={{ color: colors.muted }}>
                        {c.helper.phone || c.helper.site}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: c.stage < 4 ? "#2f6b4f14" : `${colors.accent}14`, color: c.stage < 4 ? "#2f6b4f" : colors.accent }}>
                      {c.stage === 0 ? (
                        <>
                          <Phone className="size-3 animate-pulse motion-reduce:animate-none" aria-hidden /> Dialling
                        </>
                      ) : c.stage < 4 ? (
                        <>
                          <PhoneCall className="size-3" aria-hidden /> On the call
                        </>
                      ) : (
                        <>
                          <Check className="size-3" aria-hidden /> Quote in
                        </>
                      )}
                    </span>
                  </div>
                  {c.helper.price && (
                    <p className="text-xs" style={{ color: colors.muted }}>
                      Listed on their site: <span className="font-medium" style={{ color: colors.ink }}>{c.helper.price}</span>
                    </p>
                  )}
                  <ol className="flex min-h-24 flex-col gap-1 rounded-xl p-2.5 text-xs leading-snug" style={{ background: colors.paper }}>
                    {LINES(c)
                      .slice(0, c.stage)
                      .map((line, i) => (
                        <li key={i} className={line.startsWith("AIDaddy:") ? "" : "font-medium"}>
                          {line}
                        </li>
                      ))}
                  </ol>
                  {c.stage >= 4 && (
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-2xl font-semibold" style={{ color: colors.accent }}>
                          €{c.quote}
                        </p>
                        <p className="text-xs" style={{ color: fits(c.slot) ? "#2f6b4f" : colors.muted }}>
                          {c.slot} · {fits(c.slot) ? "fits your calendar" : `clashes with your ${SHIFTS[c.slot.split(" ")[0]]}`}
                        </p>
                      </div>
                      <a href={c.helper.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 py-1 text-xs underline underline-offset-2">
                        {c.helper.site} <ExternalLink className="size-3" aria-hidden />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </div>
                  )}
                  {isBest && <p className="text-xs font-semibold" style={{ color: colors.accent }}>Best fit: cheapest that fits your calendar</p>}
                </article>
              );
            })}
          </div>

          {best && (
            <div className="flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center" style={{ background: "#fff", border: `2px solid ${colors.accent}` }}>
              <CalendarCheck className="size-8 shrink-0" style={{ color: colors.accent }} aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">
                  {booked ? `Booked: ${best.helper.name}, ${best.slot}, €${best.quote}.` : `AIDaddy suggests ${best.helper.name}, ${best.slot}, €${best.quote}.`}
                </p>
                <p className="text-sm" style={{ color: colors.muted }}>
                  {booked ? "Added to your calendar and tasks. (Demo: no real booking was made.)" : "Cheapest of the quotes that fits your shifts. Nothing is booked until you say yes."}
                </p>
              </div>
              {!booked && (
                <button type="button" onClick={() => book(best)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white" style={{ background: colors.accent }}>
                  <Check className="size-4" aria-hidden /> Yes, book it
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold">Your household tasks</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <ul className="flex flex-col gap-2">
            {tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 text-sm" style={card}>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: t.status === "Booked" ? "#2f6b4f" : colors.muted }}>
                  {t.status}
                </span>
                <span className="flex-1">
                  <span className="font-medium">{t.job}</span>
                  <span style={{ color: colors.muted }}>
                    {" "}
                    · {t.who} · {t.when}
                    {t.price ? ` · €${t.price}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-white/85 p-3 text-xs" style={card}>
            <p className="mb-2 font-semibold">This week (example calendar)</p>
            <ul className="grid grid-cols-5 gap-1 text-center">
              {Object.entries(SHIFTS).map(([day, shift]) => (
                <li key={day} className="flex flex-col gap-1">
                  <span className="font-medium">{day}</span>
                  <span className="rounded-md px-1 py-2 leading-tight" style={{ background: shift ? `${colors.accent}1f` : "#2f6b4f14", color: shift ? colors.accent : "#2f6b4f" }}>
                    {shift || "free"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
