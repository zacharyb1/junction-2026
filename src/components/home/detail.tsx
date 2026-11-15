"use client";

/** One opportunity: who it is for, the estimate, why the family fits, the source, and what AIDaddy can prepare. */

import Image from "next/image";
import { EXAMPLES, TINT } from "./opportunities";
import { AppLogo, BackButton, Icon, ICON, Main, Spinner, useNav } from "./ui";
import { useLive } from "./home-app";

export function DetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const { live } = useLive();
  const say = nav.say;
  const row = [...EXAMPLES, ...live.rows].find((r) => r.id === id);
  const d = row?.detail;
  if (!d) {
    return (
      <>
        <header className="flex flex-none flex-col gap-2 px-6 pb-3 pt-[calc(var(--aidaddy-top)+8px)]">
          <BackButton label="Back to Hidden opportunities" />
          {live.status === "loading" ? (
            <h1 className="m-0 flex items-center gap-2 text-[26px] font-bold">
              <Spinner size={18} /> Loading the find…
            </h1>
          ) : (
            <>
              <h1 className="m-0 text-[26px] font-bold">This find is gone</h1>
              <p className="m-0 text-sm text-[#7a6e66]">The live list was refreshed. Go back to see what AIDaddy found today.</p>
            </>
          )}
        </header>
      </>
    );
  }
  const source = (
    <>
      <span aria-hidden className="flex size-8 flex-none items-center justify-center rounded-lg bg-[#f1ebe2]">
        <Icon d={ICON.external} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{d.source}</span>
        <span className="text-xs text-[#7a6e66]">{d.sourceNote}</span>
      </span>
    </>
  );
  const sourceCls = "flex flex-none items-center gap-3 rounded-[14px] border border-[#efe7dc] bg-white px-3.5 py-3 no-underline";
  return (
    <>
      <header className="flex flex-none flex-col gap-2 px-6 pb-3 pt-[calc(var(--aidaddy-top)+8px)]">
        <BackButton label="Back to Hidden opportunities" />
        <span className="flex flex-wrap gap-1.5">
          <span className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: TINT[d.who] }}>
            {d.who}
          </span>
          <span className="rounded-full bg-[#ffe8d6] px-[9px] py-[3px] text-[11px] font-semibold text-[#8a3a1c]">{d.kind}</span>
          {d.demo ? (
            <span className="rounded-full bg-[#efebe5] px-[9px] py-[3px] text-[11px] font-semibold text-[#7a6e66]">Demo example</span>
          ) : (
            <span className="rounded-full bg-[#e3efe6] px-[9px] py-[3px] text-[11px] font-semibold text-[#2f6b4f]">Live · with source</span>
          )}
        </span>
        <h1 className="m-0 mt-0.5 text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">{d.title}</h1>
        <p className="m-0 text-sm leading-[1.45] text-[#7a6e66]">{d.intro}</p>
      </header>

      <Main className="gap-4 pt-1.5">
        <section aria-label={d.label} className="flex flex-none items-center gap-3.5 rounded-[20px] bg-[#ffe8d6] px-4 py-3.5">
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#8a3a1c]">{d.label}</span>
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="break-words text-[32px] font-bold leading-tight tracking-[-0.02em]">{d.big}</span>
              {d.unit && <span className={`text-[15px] text-[#5a4f47] ${d.unitStrike ? "line-through" : ""}`}>{d.unit}</span>}
            </span>
            <span className="text-[13px] leading-[1.4] text-[#5a4f47]">{d.note}</span>
          </span>
          {d.photo && (
            <Image src={d.photo} alt={d.photoAlt ?? ""} width={104} height={104} className="box-border size-[104px] flex-none rounded-2xl border-[3px] border-white object-cover" />
          )}
        </section>

        <section aria-label="Why it fits" className="flex flex-none flex-col">
          <h2 className="m-0 mb-1 text-xs font-semibold uppercase tracking-[.04em] text-[#8a7f76]">{d.whyTitle}</h2>
          {d.quote && <blockquote className="m-0 border-l-2 border-[#c4572f] py-1.5 pl-3 text-sm italic leading-[1.5]">“{d.quote}”</blockquote>}
          {d.reasons.map(([app, text]) => (
            <div key={text} className="flex min-h-[46px] items-center gap-3 border-b border-[#efe7dc]">
              {app && <AppLogo app={app} label={`From ${app}`} />}
              <span className="flex-1 text-sm">{text}</span>
              <Icon d={ICON.check} size={16} stroke="#c4572f" width={2.4} />
            </div>
          ))}
          {d.demo && <p className="m-0 pt-2 text-[11px] text-[#8f8379]">Example facts: connected apps are simulated in this demo.</p>}
        </section>

        {d.url ? (
          <a href={d.url} target="_blank" rel="noreferrer" className={sourceCls}>
            {source}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <div className={sourceCls}>{source}</div>
        )}
        <span className="h-1 flex-none" />
      </Main>

      <footer className="flex flex-none flex-col gap-2.5 px-6 pb-[calc(var(--aidaddy-bottom)+10px)] pt-3">
        {d.primaryHref ? (
          <a href={d.primaryHref} target="_blank" rel="noreferrer" className="flex h-[52px] items-center justify-center rounded-2xl bg-[#c4572f] text-base font-semibold text-white no-underline">
            {d.primary} ↗
          </a>
        ) : (
          <button type="button" onClick={() => say(d.primaryNote ?? "")} className="h-[52px] rounded-2xl bg-[#c4572f] text-base font-semibold text-white">
            {d.primary}
          </button>
        )}
        {d.secondaryNote ? (
          <button type="button" onClick={() => say(d.secondaryNote)} className="h-11 rounded-[14px] border border-[#efe7dc] bg-white text-[15px] font-semibold">
            {d.secondary}
          </button>
        ) : (
          <a href={nav.askHref()} className="flex h-11 items-center justify-center rounded-[14px] border border-[#efe7dc] bg-white text-[15px] font-semibold no-underline">
            {d.secondary}
          </a>
        )}
        <span className="text-center text-xs text-[#8a7f76]">{d.promise}</span>
      </footer>
    </>
  );
}
