"use client";

/**
 * The desktop "Get it done": a working page, not a chat. AIDaddy finds real companies for the job on their own pages,
 * then, when the parent says yes, rings the team's test phones (standing in for the companies) all at once and lays
 * the answers side by side. Real companies are never called, and nothing is booked or paid.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Spinner } from "@/components/home/ui";
import { FIRST_JOB, HOUSEHOLD, isLeakingTap } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";
import { useCallRound, useCompanySearch } from "@/components/home/job-work";

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

export function DeskTasks({ job: asked }: { job?: string }) {
  const router = useRouter();
  const { code } = useDesk();
  const job = asked?.trim() ?? "";
  const search = useCompanySearch(job, code);
  const { round, propose, confirm, reset } = useCallRound(code);
  const [draft, setDraft] = useState("");

  function start(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 5) return;
    setDraft("");
    router.push(`/desk/tasks?job=${encodeURIComponent(text)}`);
  }

  const stage = round.phase === "done" ? 2 : round.phase === "calling" || round.phase === "starting" ? 1 : 0;

  return (
    <div className="box-border flex flex-col gap-6 px-10 pb-10 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Get it done</h1>
          <span className="text-[#7a6e66]">AIDaddy finds companies and calls for quotes. You decide; it never books or pays.</span>
        </div>
        <form onSubmit={start} className="box-border flex h-11 flex-[0_1_420px] items-center gap-2 rounded-full border border-[#e4ddd3] bg-white pl-4 pr-1.5">
          <label htmlFor="job" className="sr-only">
            What needs doing?
          </label>
          <input id="job" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`What needs doing? e.g. ${FIRST_JOB}`} autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
          <button type="submit" className="h-8 rounded-full bg-[#2a2420] px-3.5 text-[13px] font-semibold text-white">
            Start
          </button>
        </form>
      </div>

      {!job && (
        <p className="m-0 rounded-[18px] border border-dashed border-[#e4ddd3] p-6 text-[#7a6e66]">
          Type a household job above, like a leaking tap or a broken washer. AIDaddy then finds companies near {HOUSEHOLD.city} on their own pages, and calls for quotes only when you say yes.
        </p>
      )}
      {job && (
        <>
      <section aria-label={job} className="flex flex-wrap items-center gap-5 rounded-[18px] border border-[#ece6dc] bg-white p-[18px]">
        {isLeakingTap(job) && <Image src="/home/photos/tap.jpg" alt="Water running from a kitchen tap" width={96} height={96} className="size-24 rounded-xl object-cover" />}
        <div className="flex flex-[1_1_240px] flex-col gap-1">
          <span className="text-xs text-[#7a6e66]">Near your home in {HOUSEHOLD.city}</span>
          <h2 className="m-0 text-xl font-bold">{job}</h2>
        </div>
        <ol aria-label="Progress" className="m-0 grid flex-[0_1_360px] list-none grid-cols-3 gap-2 p-0">
          {["Find companies", "Call for quotes", "Compare"].map((label, i) => (
            <li key={label} aria-current={i === stage ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className="h-1 rounded-sm" style={{ background: i <= stage ? "#c4572f" : "#e5ddd0" }} />
              <span className="text-xs font-semibold" style={{ color: i <= stage ? "#2a2420" : "#8f8379" }}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Companies" className="flex flex-col gap-2">
        <h2 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
          Companies found on the web {search.status === "searching" && <Spinner size={12} />}
        </h2>
        {search.status === "searching" && <p className="m-0 text-[#7a6e66]">Looking for companies near {HOUSEHOLD.city} on their own pages…</p>}
        {search.status === "error" && <p className="m-0 text-[#a33417]">The company search did not work this time: {search.error}.</p>}
        {search.status === "ok" && search.helpers.length === 0 && <p className="m-0 text-[#7a6e66]">No company page listed this service. Try saying the job another way.</p>}
        {search.helpers.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#ece6dc] bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ece6dc] text-xs text-[#7a6e66]">
                  <th className="px-[18px] py-2.5 font-semibold">Company</th>
                  <th className="px-3 py-2.5 font-semibold">Phone on its page</th>
                  <th className="px-[18px] py-2.5 font-semibold">Price it lists</th>
                </tr>
              </thead>
              <tbody>
                {search.helpers.map((h) => (
                  <tr key={h.url} className="border-b border-[#f1ebe2] align-top last:border-b-0">
                    <td className="px-[18px] py-3">
                      <a href={h.url} target="_blank" rel="noreferrer" className="font-semibold">
                        {h.name}
                        <span className="sr-only"> (company page, opens in a new tab)</span>
                      </a>
                      <span className="block text-xs text-[#7a6e66]">
                        {h.service} · {h.site}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#5a4f47]">{h.phone || "Not on its page"}</td>
                    <td className="px-[18px] py-3">
                      {h.price ? (
                        <>
                          <span className="font-semibold">{h.price}</span>
                          {h.priceQuote && <span className="block text-xs italic text-[#7a6e66]">“{h.priceQuote}”</span>}
                        </>
                      ) : (
                        <span className="text-[#7a6e66]">No price listed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Calls for quotes" className="flex flex-col gap-3 rounded-[18px] bg-[#fff3ea] p-5">
        <h2 className="m-0 text-base font-bold">Call for quotes</h2>
        <p className="m-0 max-w-[720px] leading-normal text-[#5a4f47]">
          AIDaddy rings our test phones at the same time, each standing in for a company, and asks for a price and a time. The companies above are not called.
        </p>

        {round.phase === "idle" && (
          <button type="button" onClick={() => void propose(`${job}. Please give your total price in euros and the earliest time you can come.`)} className="h-11 self-start rounded-xl bg-[#c4572f] px-5 font-semibold text-white">
            Prepare the calls
          </button>
        )}
        {(round.phase === "proposing" || round.phase === "starting") && (
          <span className="flex items-center gap-2 text-[#5a4f47]">
            <Spinner /> {round.phase === "proposing" ? "Preparing the calls…" : "Dialling…"}
          </span>
        )}
        {round.phase === "proposed" && (
          <div className="flex flex-col gap-3">
            <p className="m-0">
              These {round.recipients.length} phones will ring at once: <strong>{round.recipients.map((r) => `${r.name} (••${r.phoneEnding})`).join(", ")}</strong>.
              {round.recorded && " The calls are recorded, and each person hears so first."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void confirm()} className="h-11 rounded-xl bg-[#c4572f] px-5 font-semibold text-white">
                Yes, call {round.recipients.length} phones
              </button>
              <button type="button" onClick={reset} className="h-11 rounded-xl border border-[#e4ddd3] bg-white px-5 font-semibold">
                Not now
              </button>
            </div>
          </div>
        )}
        {round.phase === "error" && (
          <div className="flex flex-col gap-2">
            <p role="alert" className="m-0 text-[#a33417]">
              {round.error}
            </p>
            <button type="button" onClick={reset} className="h-10 self-start rounded-xl border border-[#e4ddd3] bg-white px-4 font-semibold">
              Start over
            </button>
          </div>
        )}

        {(round.phase === "calling" || round.phase === "done") && round.calls.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#ece6dc] bg-white">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ece6dc] text-xs text-[#7a6e66]">
                  <th className="px-[18px] py-2.5 font-semibold">Phone</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">What they said</th>
                  <th className="px-[18px] py-2.5 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody aria-live="polite">
                {round.calls.map((c) => (
                  <tr key={c.name} className={`border-b border-[#f1ebe2] last:border-b-0 ${round.cheapest?.names.includes(c.name) ? "bg-[#fff9f4]" : ""}`}>
                    <td className="px-[18px] py-3 font-semibold">
                      {c.name} <span className="font-normal text-[#7a6e66]">••{c.phoneEnding}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-[#7a6e66]">{CALL_STATUS[c.status] ?? c.status}</td>
                    <td className="px-3 py-3 text-[#5a4f47]">{c.answer ?? ""}</td>
                    <td className="px-[18px] py-3 text-right font-bold">{money(c.price, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {round.phase === "calling" && (
          <span className="flex items-center gap-2 text-[#5a4f47]">
            <Spinner /> The phones are ringing. Answers appear as each call ends.
          </span>
        )}
        {round.phase === "done" && (
          <div className="flex flex-col gap-2">
            <p className="m-0 font-semibold">
              {round.cheapest
                ? `Cheapest: ${round.cheapest.names.join(" and ")} at ${money(round.cheapest.price, round.cheapest.currency)}.`
                : round.answered.length
                  ? "No two prices could be compared."
                  : "Nobody answered this time."}
            </p>
            <span className="text-xs text-[#7a6e66]">The answers come from the calls. AIDaddy does not book; anything agreed on a call is between you and them.</span>
            <button type="button" onClick={reset} className="h-10 self-start rounded-xl border border-[#e4ddd3] bg-white px-4 font-semibold">
              Call again
            </button>
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
