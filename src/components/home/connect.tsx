"use client";

/** "Connect family apps": the apps AIDaddy would read, with switches. In this demo the switches connect nothing. */

import { useState } from "react";
import type { AppName } from "@/lib/home-demo";
import { AppLogo, BackButton, useNav } from "./ui";

export const GROUPS: { title: string; apps: [AppName, string, string?][] }[] = [
  { title: "Messages", apps: [["WhatsApp", "The family group"], ["Telegram", "Chats you add AIDaddy to"]] },
  { title: "Email and calendar", apps: [["Gmail", "Bills, bookings, letters"], ["Calendar", "Birthdays, shifts, free time", "Google Calendar"]] },
  { title: "School and daycare", apps: [["Wilma", "Messages from school and daycare"]] },
  { title: "More", apps: [["Photos", "Receipts and letters you snap"], ["Outlook", "Work email, if you want"]] },
];

export function ConnectScreen() {
  const nav = useNav();
  const [on, setOn] = useState<Partial<Record<AppName, boolean>>>({ WhatsApp: true, Telegram: true, Gmail: true, Calendar: true, Wilma: true });
  const count = Object.values(on).filter(Boolean).length;
  return (
    <>
      <header className="flex flex-none flex-col gap-2.5 px-6 pb-3.5 pt-[calc(var(--aidaddy-top)+8px)]">
        <BackButton label="Back" />
        <h1 className="m-0 text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">Connect family apps</h1>
        <p className="m-0 text-sm leading-[1.45] text-[#7a6e66]">The more AIDaddy knows, the more it finds for you. It only reads. Nothing is sent, booked or paid without your yes.</p>
      </header>

      <main className="aidaddy-scroll flex min-h-0 flex-1 flex-col px-6 pt-1">
        {GROUPS.map((g) => (
          <section key={g.title} className="flex flex-none flex-col pt-2.5">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">{g.title}</h2>
            {g.apps.map(([app, reads, name = app]) => {
              const isOn = Boolean(on[app]);
              return (
                <div key={app} className="flex min-h-[62px] items-center gap-3 border-b border-[#ece6dc]">
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
        <p className="m-0 py-3 text-[11px] text-[#8f8379]">Demo: the switches show the idea. No account is connected and nothing is read.</p>
      </main>

      <footer className="flex-none border-t border-[#ece6dc] px-6 pb-[calc(var(--aidaddy-bottom)+10px)] pt-3.5">
        <button type="button" onClick={() => nav.push({ s: "household" })} className="h-[52px] w-full rounded-2xl bg-[#c4572f] text-base font-semibold text-white">
          Done · {count} connected
        </button>
      </footer>
    </>
  );
}
