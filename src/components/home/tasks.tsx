"use client";

/**
 * "Get it done": AI agents find local companies for a household job, reach them all at once and pick the cheapest
 * quote that fits the parent's week, for the parent to approve.
 *
 * The recorded job (a leaking kitchen tap) replays a scripted run so the demo is the same every time. Any other job
 * searches real companies through /api/helpers; their calls and quotes are still simulated, and the screen says so.
 */

import { type FormEvent, useState } from "react";
import { CHANNEL, DEMO_JOB, type Firm, type FirmRow } from "@/lib/home-demo";
import { useTaskRun } from "./task-run";
import { AppLogo, H1, Icon, ICON, Main, Spinner, TabBar, TabHeader, useNav } from "./ui";
import { useLive } from "./ukk-app";

function RowView({ row, picked, best, searching }: { row: FirmRow; picked: boolean; best: Firm | null; searching: boolean }) {
  const f = row.firm;
  const isBest = f === best;
  const apps = f.channels.map((c) => CHANNEL[c].app).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const dot =
    row.state === "reaching"
      ? { bg: "#ffe3cf", fg: "#c4572f" }
      : row.state === "talking"
        ? { bg: "#c4572f", fg: "#fff" }
        : row.state === "quoted" && isBest
          ? { bg: "#c4572f", fg: "#fff" }
          : { bg: "#f1ebe2", fg: "#2a2420" };
  const icon = { pin: ICON.pin, clock: ICON.clock, phone: ICON.phone, message: ICON.chat, check: ICON.check }[row.icon];
  const greyed = row.state === "closed" && !searching;
  const lineColor = row.state === "talking" ? "#2a2420" : row.state === "quoted" && !f.fits ? "#b3261e" : "#7a6e66";
  return (
    <div
      className="ukk-rise box-border flex min-h-[58px] flex-none items-center gap-3 rounded-[14px] border border-[#ece6dc] bg-white px-3 py-2"
      style={{ opacity: greyed ? 0.6 : picked && row.state === "quoted" ? 0.75 : 1 }}
    >
      <span aria-hidden className={`relative flex size-[34px] flex-none items-center justify-center rounded-full ${row.state === "reaching" ? "ukk-ring" : ""}`} style={{ background: dot.bg, color: dot.fg }}>
        <Icon d={icon} size={16} width={2} />
        {row.via && row.state !== "found" && row.state !== "closed" && (
          <AppLogo app={row.via} size={16} className="absolute -bottom-[3px] -right-[3px] rounded-full bg-white p-px" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        {f.url ? (
          <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold no-underline">
            {f.name}
            <span className="sr-only"> (company page, opens in a new tab)</span>
          </a>
        ) : (
          <span className="truncate text-sm font-semibold">{f.name}</span>
        )}
        <span className="flex min-w-0 items-center gap-[5px]">
          {(row.state === "found" || row.state === "closed") && apps.map((a) => <AppLogo key={a} app={a} size={14} label={a} />)}
          <span className="truncate text-xs" style={{ color: lineColor }}>
            {row.line}
          </span>
        </span>
      </span>
      {row.state === "talking" &&
        (row.via ? (
          <span aria-label="Replying" className="flex h-4 flex-none items-center gap-[3px]">
            <span className="ukk-dot" />
            <span className="ukk-dot" style={{ animationDelay: ".15s" }} />
            <span className="ukk-dot" style={{ animationDelay: ".3s" }} />
          </span>
        ) : (
          <span aria-label="On the call" className="flex h-4 flex-none items-center gap-0.5">
            <span className="ukk-bar" />
            <span className="ukk-bar" style={{ animationDelay: "-.2s" }} />
            <span className="ukk-bar" style={{ animationDelay: "-.45s" }} />
            <span className="ukk-bar" style={{ animationDelay: "-.1s" }} />
          </span>
        ))}
      {row.state === "found" && <span className="flex-none rounded-full bg-[#ffe3cf] px-2 py-[3px] text-[11px] font-semibold text-[#c4572f]">{f.url ? "Has phone" : "Open now"}</span>}
      {row.state === "closed" && (
        <span className="flex-none rounded-full bg-[#efebe5] px-2 py-[3px] text-[11px] font-semibold text-[#7a6e66]">
          {f.url ? "No phone listed" : searching ? "Closed" : "Emailed · Mon"}
        </span>
      )}
      {row.state === "quoted" && <span className="flex-none text-[15px] font-bold">€{f.price}</span>}
    </div>
  );
}

export function TasksScreen({ job: initial }: { job?: string }) {
  const nav = useNav();
  const { code } = useLive();
  const run = useTaskRun(initial, code);
  const [draft, setDraft] = useState(run.job);
  const [approved, setApproved] = useState(false);

  function start(e?: FormEvent) {
    e?.preventDefault();
    const job = draft.trim();
    if (job.length < 5) return;
    setApproved(false);
    run.start(job);
  }

  const { frame, live, searchingLive, failed, headline, slot, pitch } = run;
  const best = frame.best;

  return (
    <>
      <TabHeader>
        <H1>AI agents call for quotes</H1>
        <form onSubmit={start} className="box-border flex h-[52px] items-center gap-2.5 rounded-2xl border border-[#ece6dc] bg-white pl-4 pr-2">
          <label htmlFor="job" className="sr-only">
            What needs doing?
          </label>
          <input id="job" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="go" autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium outline-none" />
          <button type="submit" aria-label="Run again" className="h-[38px] rounded-xl bg-[#c4572f] px-3.5 text-sm font-semibold text-white">
            Go
          </button>
        </form>
        <ol aria-label="Progress" className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
          {["Search", "Call", "Pick"].map((label, i) => (
            <li key={label} aria-current={i === frame.stage ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className="h-1 rounded-sm transition-colors duration-300" style={{ background: i <= frame.stage && !failed ? "#c4572f" : "#e5ddd0" }} />
              <span className="text-xs font-semibold" style={{ color: i <= frame.stage ? "#2a2420" : "#8f8379" }}>
                {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold" aria-live="polite">
            {(frame.busy || searchingLive) && !failed && <Spinner />}
            <span className="truncate">{headline}</span>
          </span>
          <span className="text-[13px] tabular-nums text-[#7a6e66]">{searchingLive ? "" : frame.clock}</span>
        </div>
      </TabHeader>

      <Main className="gap-1.5 pb-3">
        {best && (
          <section className="ukk-rise flex flex-none flex-col gap-3 rounded-[20px] bg-[#ffe8d6] p-4 text-[#4a2a1a]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-xs opacity-80">Best fit · cheapest that fits your week</span>
                <span className="truncate text-[19px] font-semibold">{best.name}</span>
                <span className="text-[13px] opacity-85">{pitch}</span>
              </div>
              <span className="text-4xl font-bold leading-none">€{best.price}</span>
            </div>
            {approved ? (
              <div className="flex flex-col gap-2">
                <p role="status" className="m-0 rounded-xl bg-white/70 px-3 py-2.5 text-[13px] leading-[1.4]">
                  You said yes to {best.name}, {slot}. In this demo nothing is booked: UKK would confirm with them and put it in your calendar.
                </p>
                <button type="button" onClick={() => nav.push({ s: "household" })} className="h-11 rounded-xl bg-[#2a2420] text-[15px] font-semibold text-white">
                  That&apos;s not all: see your household →
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setApproved(true)} className="h-11 rounded-xl bg-[#c4572f] text-[15px] font-semibold text-white">
                Yes, book {slot}
              </button>
            )}
          </section>
        )}

        {failed && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-[#ece6dc] bg-white p-4 text-sm">
            <p className="m-0">Could not find companies for “{run.job}”: {run.error}.</p>
            <button
              type="button"
              onClick={() => {
                setDraft(DEMO_JOB);
                run.start(DEMO_JOB);
              }}
              className="h-10 self-start rounded-xl border border-[#ece6dc] px-3 text-sm font-semibold"
            >
              Play the leaking-tap demo
            </button>
          </div>
        )}

        {frame.rows.map((r) => (
          <RowView key={r.firm.name} row={r} picked={frame.stage === 2} best={best} searching={frame.stage === 0} />
        ))}
        <p className="m-0 mt-1 text-[11px] text-[#8f8379]">
          {live
            ? "Companies, phone numbers and listed prices come from their own pages. Calls and quotes are simulated in this demo."
            : "Demo: search, calls and quotes are simulated."}{" "}
          UKK never books or pays without your yes.
        </p>
      </Main>
      <TabBar current="tasks" />
    </>
  );
}
