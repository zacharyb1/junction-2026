"use client";

/**
 * The desktop "Get it done": a working page, not a chat. The job with its photo, the three steps, every company UKK
 * reaches with what it said and its price, and the best fit for the parent to approve. It plays the same run as the
 * phone screen (useTaskRun).
 */

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { useTaskRun } from "@/components/home/task-run";
import { AppLogo, Spinner } from "@/components/home/ui";
import { CHANNEL, DEMO_JOB, type FirmRow } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";

const STATE: Record<FirmRow["state"], string> = {
  found: "Found",
  closed: "Closed",
  reaching: "Reaching",
  talking: "On the line",
  quoted: "Quoted",
};

function QuoteRow({ row, best }: { row: FirmRow; best: boolean }) {
  const f = row.firm;
  const clash = row.state === "quoted" && !f.fits;
  return (
    <tr className={`border-b border-[#f1ebe2] ${best ? "bg-[#fff9f4]" : ""} ${row.state === "closed" ? "opacity-55" : ""}`}>
      <td className="px-[18px] py-3">
        <span className="flex items-center gap-2">
          {row.via && <AppLogo app={row.via} size={16} label={`Reached on ${row.via}`} />}
          {f.url ? (
            <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold">
              {f.name}
              <span className="sr-only"> (company page, opens in a new tab)</span>
            </a>
          ) : (
            <span className="font-semibold">{f.name}</span>
          )}
        </span>
        <span className="text-xs text-[#7a6e66]">
          {f.phone} · {f.hours}
        </span>
      </td>
      <td className="px-3 py-3 text-xs font-semibold text-[#7a6e66]">{STATE[row.state]}</td>
      <td className={`px-3 py-3 ${row.state === "talking" ? "italic" : ""}`} style={{ color: clash ? "#a33417" : "#5a4f47" }}>
        {row.line}
      </td>
      <td className="px-[18px] py-3 text-right font-bold">{row.state === "quoted" && f.price != null ? `€${f.price}` : ""}</td>
    </tr>
  );
}

export function DeskTasks({ job }: { job?: string }) {
  const { code } = useDesk();
  const run = useTaskRun(job, code);
  const [draft, setDraft] = useState("");
  const [approved, setApproved] = useState(false);
  const { frame, live, searchingLive, failed, headline, slot, pitch } = run;
  const best = frame.best;

  function start(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 5) return;
    setApproved(false);
    setDraft("");
    run.start(text);
  }

  return (
    <div className="box-border flex flex-col gap-6 px-10 pb-10 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Get it done</h1>
          <span className="text-[#7a6e66]">AI agents call companies for quotes. You say yes; UKK never pays.</span>
        </div>
        <form onSubmit={start} className="box-border flex h-11 flex-[0_1_420px] items-center gap-2 rounded-full border border-[#e4ddd3] bg-white pl-4 pr-1.5">
          <label htmlFor="job" className="sr-only">
            A new job
          </label>
          <input id="job" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="A new job, e.g. washer broke" autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
          <button type="submit" className="h-8 rounded-full bg-[#2a2420] px-3.5 text-[13px] font-semibold text-white">
            Start
          </button>
        </form>
      </div>

      <section aria-label={run.job} className="flex flex-col overflow-hidden rounded-[18px] border border-[#ece6dc] bg-white">
        <div className="flex flex-wrap items-center gap-5 border-b border-[#ece6dc] p-[18px]">
          {!live && <Image src="/home/photos/tap.jpg" alt="Water running from a kitchen tap" width={96} height={96} className="size-24 rounded-xl object-cover" />}
          <div className="flex flex-[1_1_240px] flex-col gap-1">
            <span className="text-xs text-[#7a6e66]">{live ? "Companies near your home" : "From your Telegram · plumbers near Kallio"}</span>
            <h2 className="m-0 text-xl font-bold">{run.job}</h2>
            <span className="flex items-center gap-2 text-[#5a4f47]" aria-live="polite">
              {(frame.busy || searchingLive) && !failed && <Spinner />}
              {headline} {!searchingLive && <span className="tabular-nums text-[#7a6e66]">· {frame.clock}</span>}
            </span>
          </div>
          <ol aria-label="Progress" className="m-0 grid flex-[0_1_360px] list-none grid-cols-3 gap-2 p-0">
            {["Search", "Call", "Pick"].map((label, i) => (
              <li key={label} aria-current={i === frame.stage ? "step" : undefined} className="flex flex-col gap-1.5">
                <span className="h-1 rounded-sm transition-colors duration-300" style={{ background: i <= frame.stage && !failed ? "#c4572f" : "#e5ddd0" }} />
                <span className="text-xs font-semibold" style={{ color: i <= frame.stage ? "#2a2420" : "#8f8379" }}>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {failed ? (
          <div className="flex flex-col gap-2 p-[18px]">
            <p className="m-0">
              Could not find companies for “{run.job}”: {run.error}.
            </p>
            <button type="button" onClick={() => run.start(DEMO_JOB)} className="h-10 self-start rounded-xl border border-[#ece6dc] px-3 font-semibold">
              Play the leaking-tap demo
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-stretch">
            <div className="min-w-0 flex-[1_1_520px] overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ece6dc] text-xs text-[#7a6e66]">
                    <th className="px-[18px] py-2.5 font-semibold">Company</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">What they said</th>
                    <th className="px-[18px] py-2.5 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {/* The picked firm leaves the frame's rows; it heads the table instead. */}
                  {best && <QuoteRow row={{ firm: best, state: "quoted", icon: "check", line: best.result, via: CHANNEL[best.channels[0]].app }} best />}
                  {frame.rows.map((r) => (
                    <QuoteRow key={r.firm.name} row={r} best={false} />
                  ))}
                </tbody>
              </table>
            </div>

            <aside aria-label="Best fit" className="box-border flex flex-[1_1_280px] flex-col gap-3 bg-[#fff3ea] p-5">
              <span className="text-xs font-semibold text-[#8a3a1c]">Best fit · cheapest that fits your week</span>
              {best ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xl font-bold">{best.name}</span>
                    <span className="text-[32px] font-bold">€{best.price}</span>
                  </div>
                  <span className="text-[#5a4f47]">{pitch}</span>
                  {approved ? (
                    <p role="status" className="m-0 leading-normal">
                      You said yes to {best.name}, {slot}. In this demo nothing is booked: UKK would confirm with them and put it in your calendar.
                    </p>
                  ) : (
                    <button type="button" onClick={() => setApproved(true)} className="h-11 rounded-xl bg-[#c4572f] text-[15px] font-semibold text-white">
                      Yes, book {slot}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[#5a4f47]">{frame.stage === 2 ? "None of the quotes fits your week." : "Picked once the quotes are in."}</span>
              )}
            </aside>
          </div>
        )}
      </section>
      <p className="m-0 text-xs text-[#8f8379]">
        {live ? "Companies, phone numbers and listed prices come from their own pages. Calls and quotes are simulated in this demo." : "Demo: search, calls and quotes are simulated."} UKK never books or pays without your yes.
      </p>
    </div>
  );
}
