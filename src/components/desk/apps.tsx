"use client";

/**
 * The desktop "Connected apps": the family apps UKK would read, grouped, with switches. As on the phone page, the
 * switches show the idea and connect nothing.
 */

import Link from "next/link";
import { useState } from "react";
import { GROUPS } from "@/components/home/connect";
import { AppLogo } from "@/components/home/ui";
import type { AppName } from "@/lib/home-demo";

export function DeskApps() {
  const [on, setOn] = useState<Partial<Record<AppName, boolean>>>({ WhatsApp: true, Telegram: true, Gmail: true, Calendar: true, Wilma: true });
  const count = Object.values(on).filter(Boolean).length;
  return (
    <div className="box-border flex flex-col gap-6 px-10 pb-10 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[640px] flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Connected apps</h1>
          <p className="m-0 leading-normal text-[#7a6e66]">The more UKK knows, the more it finds for you. It only reads. Nothing is sent, booked or paid without your yes.</p>
        </div>
        <Link href="/desk/household" className="flex h-11 items-center rounded-full bg-[#c4572f] px-5 font-semibold text-white no-underline">
          Done · {count} connected
        </Link>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title} className="flex flex-col rounded-2xl border border-[#ece6dc] bg-white px-4 pb-1 pt-3.5">
            <h2 className="m-0 pb-1 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">{g.title}</h2>
            {g.apps.map(([app, reads, name = app]) => {
              const isOn = Boolean(on[app]);
              return (
                <div key={app} className="flex min-h-[62px] items-center gap-3 border-b border-[#f1ebe2] last:border-b-0">
                  <span className="box-border flex size-10 flex-none items-center justify-center rounded-[11px] border border-[#ece6dc] bg-white p-[7px]">
                    <AppLogo app={app} size={26} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{name}</span>
                    <span className="text-xs text-[#7a6e66]">{reads}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    aria-label={`${name}: ${isOn ? "connected" : "not connected"}`}
                    onClick={() => setOn({ ...on, [app]: !isOn })}
                    className="flex h-7 w-12 flex-none rounded-full p-[3px] transition-colors"
                    style={{ background: isOn ? "#c4572f" : "#d6cfc4", justifyContent: isOn ? "flex-end" : "flex-start" }}
                  >
                    <span aria-hidden className="size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
                  </button>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <p className="m-0 text-xs text-[#8f8379]">Demo: the switches show the idea. No account is connected and nothing is read.</p>
    </div>
  );
}
