"use client";

/** "Hidden opportunities": the household photo, who each find is for, and the list. Worked examples first, then live finds. */

import Image from "next/image";
import { useState } from "react";
import { type AppName } from "@/lib/home-demo";
import { EXAMPLES, type Row, TINT, type Who } from "./opportunities";
import { AppLogo, Icon, Main, Spinner, TabBar, useNav } from "./ui";
import { useLive } from "./home-app";

export type LiveOpps = { status: "loading" | "ok" | "error"; rows: Row[]; error: string };

const APPS: AppName[] = ["WhatsApp", "Telegram", "Gmail", "Calendar", "Wilma"];
const PEOPLE: ("All" | Exclude<Who, "Family">)[] = ["All", "Laura", "Eino", "Aino"];

function OppRow({ r }: { r: Row }) {
  const nav = useNav();
  const body = (
    <>
      {r.photo ? (
        <Image src={r.photo} alt="" width={40} height={40} className="size-10 flex-none rounded-xl object-cover" />
      ) : (
        <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-xl bg-[#f1ebe2]">
          <Icon d={r.icon ?? ""} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{r.title}</span>
        <span className="truncate text-[13px] text-[#7a6e66]">{r.sub}</span>
      </span>
      <span className="flex flex-none flex-col items-end gap-1">
        <span className="text-[15px] font-semibold" style={{ color: r.money ? "#c4572f" : "#2a2420" }}>
          {r.value}
        </span>
        <span aria-label={`For ${r.who}`} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#3d3833]" style={{ background: TINT[r.who] }}>
          {r.who}
        </span>
      </span>
    </>
  );
  const cls = "flex min-h-16 flex-none items-center gap-3.5 border-b border-[#ece6dc] py-2 text-left";
  return r.detail ? (
    <button type="button" onClick={() => nav.push({ s: "opp", id: r.id })} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function HiddenScreen() {
  const nav = useNav();
  const { live } = useLive();
  const [who, setWho] = useState<(typeof PEOPLE)[number]>("All");
  const count = EXAMPLES.length + live.rows.length;
  const show = (r: Row) => who === "All" || r.who === who;
  return (
    <>
      <header className="flex flex-none items-center justify-between px-6 pb-5 pt-[calc(var(--aidaddy-top)+16px)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-[#7a6e66]">Hi Laura</span>
          <h1 className="m-0 text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">Hidden opportunities</h1>
          <span className="mt-1.5 flex items-center gap-1">
            {APPS.map((a) => (
              <AppLogo key={a} app={a} label={a} />
            ))}
            <button type="button" onClick={() => nav.push({ s: "connect" })} className="ml-1 text-xs text-[#7a6e66] underline underline-offset-2">
              reading your family&apos;s apps
            </button>
          </span>
        </div>
        <Image src="/assistant/family.jpg" alt="Your household" width={48} height={48} className="size-12 rounded-full object-cover" />
      </header>

      <Main className="px-0">
        <section className="relative mx-6 h-[168px] flex-none overflow-hidden rounded-[22px] text-white">
          <Image src="/assistant/family.jpg" alt="Laura with Eino and Aino at home" fill sizes="342px" className="object-cover object-[center_35%]" priority />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.6),rgba(0,0,0,0)_60%)]" />
          <div className="absolute bottom-4 left-[18px] flex items-baseline gap-2">
            <span className="text-[40px] font-bold leading-none tracking-[-0.03em]">{count}</span>
            <span className="text-[15px] font-medium">your family is missing</span>
          </div>
        </section>

        <div role="group" aria-label="Who it is for" className="flex flex-none gap-2 px-6 pb-1 pt-4">
          {PEOPLE.map((p) => {
            const on = p === who;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => setWho(p)}
                className="flex h-9 items-center gap-1.5 rounded-full border text-[13px] font-semibold"
                style={{ padding: p === "All" ? "0 16px" : "0 12px 0 4px", background: on ? "#ece6dc" : "#fff", borderColor: on ? "#ece6dc" : "#e7e2da" }}
              >
                {p !== "All" && (
                  <span aria-hidden className="flex size-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: TINT[p] }}>
                    {p[0]}
                  </span>
                )}
                {p}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col px-6 pt-3">
          {EXAMPLES.filter(show).map((r) => (
            <OppRow key={r.id} r={r} />
          ))}
          <p className="m-0 pt-2 text-[11px] text-[#8f8379]">Examples for the demo family: the app facts behind them are not connected yet.</p>

          <h2 className="m-0 mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
            Found on the web today {live.status === "loading" && <Spinner size={12} />}
          </h2>
          {live.status === "loading" && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">AIDaddy is reading official pages for Laura&apos;s family…</p>}
          {live.status === "error" && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">Live search is not available right now: {live.error}</p>}
          {live.status === "ok" && live.rows.length === 0 && <p className="m-0 py-3 text-[13px] text-[#7a6e66]">Nothing new with a source today.</p>}
          {live.rows.filter(show).map((r) => (
            <OppRow key={r.id} r={r} />
          ))}
          {live.status === "ok" && live.rows.length > 0 && (
            <p className="m-0 pb-4 pt-2 text-[11px] text-[#8f8379]">Each live find quotes the page it came from.</p>
          )}
          <span className="h-4 flex-none" />
        </div>
      </Main>
      <TabBar current="hidden" />
    </>
  );
}
