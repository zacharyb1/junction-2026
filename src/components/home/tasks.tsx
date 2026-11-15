"use client";

/**
 * "Get it done" on the phone: AIDaddy finds real companies for a household job on their own pages, then, when the
 * parent says yes, rings the team's test phones (standing in for the companies) all at once and shows each answer and
 * price. Real companies are never called, and nothing is booked or paid. The desktop page plays the same flow.
 */

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { FIRST_JOB, HOUSEHOLD, isLeakingTap } from "@/lib/home-demo";
import { useLive } from "./home-app";
import { useCallRound, useCompanySearch } from "./job-work";
import { H1, Main, Spinner, TabBar, TabHeader, useNav } from "./ui";

const CALL_STATUS: Record<string, string> = {
  pending: "Waiting",
  dispatched: "Dialling",
  initiated: "Ringing",
  in_progress: "On the line",
  completed: "Answered",
  failed: "Failed",
  cancelled: "Cancelled",
  voicemail: "Voicemail",
};

const money = (price?: number, currency?: string) => (price === undefined ? "" : `${currency === "EUR" || !currency ? "€" : `${currency} `}${price}`);

export function TasksScreen({ job: asked }: { job?: string }) {
  const nav = useNav();
  const { code } = useLive();
  const job = asked?.trim() ?? "";
  const search = useCompanySearch(job, code);
  const { round, propose, confirm, reset } = useCallRound(code);
  const [draft, setDraft] = useState(job);
  const empty = "Say what needs doing, then AIDaddy looks for companies near you.";

  function start(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 5 || text === job) return;
    nav.push({ s: "tasks", job: text });
  }

  const stage = round.phase === "done" ? 2 : round.phase === "calling" || round.phase === "starting" ? 1 : 0;
  const button = "h-11 rounded-xl text-[15px] font-semibold";

  return (
    <>
      <TabHeader>
        <H1>AI agents call for quotes</H1>
        <form onSubmit={start} className="box-border flex h-[52px] items-center gap-2.5 rounded-2xl border border-[#ece6dc] bg-white pl-4 pr-2">
          <label htmlFor="job" className="sr-only">
            What needs doing?
          </label>
          <input id="job" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`What needs doing? e.g. ${FIRST_JOB}`} enterKeyHint="go" autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium outline-none" />
          <button type="submit" className="h-[38px] rounded-xl bg-[#c4572f] px-3.5 text-sm font-semibold text-white">
            Go
          </button>
        </form>
        <ol aria-label="Progress" className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
          {["Find", "Call", "Compare"].map((label, i) => (
            <li key={label} aria-current={i === stage ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className="h-1 rounded-sm transition-colors duration-300" style={{ background: i <= stage ? "#c4572f" : "#e5ddd0" }} />
              <span className="text-xs font-semibold" style={{ color: i <= stage ? "#2a2420" : "#8f8379" }}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </TabHeader>

      <Main className="gap-3 pb-3">
        {!job && <p className="m-0 text-sm text-[#7a6e66]">{empty}</p>}
        {job && isLeakingTap(job) && <Image src="/home/photos/tap.jpg" alt="Water running from a kitchen tap" width={342} height={120} className="h-[120px] w-full flex-none rounded-2xl object-cover" />}

        {job && (
          <>
        <section aria-label="Companies" className="flex flex-none flex-col gap-1.5">
          <h2 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
            Companies near {HOUSEHOLD.city} {search.status === "searching" && <Spinner size={12} />}
          </h2>
          {search.status === "searching" && <p className="m-0 text-sm text-[#7a6e66]">Looking for companies on their own pages…</p>}
          {search.status === "error" && <p className="m-0 text-sm text-[#a33417]">The search did not work this time: {search.error}.</p>}
          {search.status === "ok" && search.helpers.length === 0 && <p className="m-0 text-sm text-[#7a6e66]">No company page listed this service. Try other words.</p>}
          {search.helpers.map((h) => (
            <a key={h.url} href={h.url} target="_blank" rel="noreferrer" className="flex flex-none flex-col gap-0.5 rounded-[14px] border border-[#ece6dc] bg-white px-3.5 py-2.5 no-underline">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{h.name}</span>
                {h.price && <span className="flex-none text-sm font-bold">{h.price}</span>}
              </span>
              <span className="truncate text-xs text-[#7a6e66]">
                {h.phone || "No phone on its page"} · {h.site}
              </span>
              <span className="sr-only">(company page, opens in a new tab)</span>
            </a>
          ))}
        </section>

        <section aria-label="Calls for quotes" className="flex flex-none flex-col gap-2.5 rounded-[20px] bg-[#ffe8d6] p-4 text-[#4a2a1a]">
          <span className="text-[15px] font-semibold">Call for quotes</span>
          <span className="text-[13px] leading-[1.4]">AIDaddy rings our test phones at once, each standing in for a company. The companies above are not called.</span>
          {round.phase === "idle" && (
            <button type="button" onClick={() => void propose(`${job}. Please give your total price in euros and the earliest time you can come.`)} className={`${button} bg-[#c4572f] text-white`}>
              Prepare the calls
            </button>
          )}
          {(round.phase === "proposing" || round.phase === "starting") && (
            <span className="flex items-center gap-2 text-sm">
              <Spinner /> {round.phase === "proposing" ? "Preparing the calls…" : "Dialling…"}
            </span>
          )}
          {round.phase === "proposed" && (
            <>
              <span className="text-[13px] leading-[1.4]">
                These phones ring at once: <strong>{round.recipients.map((r) => `${r.name} (••${r.phoneEnding})`).join(", ")}</strong>.
                {round.recorded && " The calls are recorded, and each person hears so first."}
              </span>
              <button type="button" onClick={() => void confirm()} className={`${button} bg-[#c4572f] text-white`}>
                Yes, call {round.recipients.length} phones
              </button>
              <button type="button" onClick={reset} className={`${button} bg-white/70`}>
                Not now
              </button>
            </>
          )}
          {round.phase === "error" && (
            <>
              <p role="alert" className="m-0 text-sm text-[#a33417]">
                {round.error}
              </p>
              <button type="button" onClick={reset} className={`${button} bg-white/70`}>
                Start over
              </button>
            </>
          )}
          {(round.phase === "calling" || round.phase === "done") &&
            round.calls.map((c) => (
              <div key={c.name} aria-live="polite" className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 ${round.cheapest?.names.includes(c.name) ? "bg-white" : "bg-white/60"}`}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {c.name} <span className="font-normal opacity-70">••{c.phoneEnding}</span>
                  </span>
                  <span className="text-[15px] font-bold">{money(c.price, c.currency)}</span>
                </span>
                <span className="text-xs opacity-80">{c.answer ?? CALL_STATUS[c.status] ?? c.status}</span>
              </div>
            ))}
          {round.phase === "calling" && (
            <span className="flex items-center gap-2 text-sm">
              <Spinner /> The phones are ringing.
            </span>
          )}
          {round.phase === "done" && (
            <>
              <span className="text-sm font-semibold">
                {round.cheapest
                  ? `Cheapest: ${round.cheapest.names.join(" and ")} at ${money(round.cheapest.price, round.cheapest.currency)}.`
                  : round.answered.length
                    ? "No two prices could be compared."
                    : "Nobody answered this time."}
              </span>
              <button type="button" onClick={() => nav.push({ s: "household" })} className={`${button} bg-[#2a2420] text-white`}>
                That&apos;s not all: see your household →
              </button>
            </>
          )}
        </section>
          </>
        )}
        <p className="m-0 text-[11px] text-[#8f8379]">Companies, phones and prices come from their own pages; quotes come from the calls. AIDaddy never books or pays.</p>
      </Main>
      <TabBar current="tasks" />
    </>
  );
}
