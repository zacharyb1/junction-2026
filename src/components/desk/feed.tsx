"use client";

/**
 * The family's hidden opportunities as a feed, shown without being asked: the worked examples as photo posts, then
 * what AIDaddy found on the web today, each with the page it came from. It is the desktop's version of the Hidden tab.
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { calendarHref, type Detail, EXAMPLES, type Row } from "@/components/home/opportunities";
import { AppLogo, Spinner } from "@/components/home/ui";
import { useDesk } from "./desk-shell";

/** Photos for the examples' posts; the housing allowance has no photo of its own. */
const HERO: Record<string, [string, string]> = {
  housing: ["/home/photos/papers.jpg", "Papers being filled in at a table"],
};

const forWho = (who: Detail["who"]) => (who === "Family" ? "For the whole family" : `For ${who}`);

function Actions({ d }: { d: Detail }) {
  const [note, setNote] = useState("");
  const button = "h-[38px] rounded-full px-4 text-sm font-semibold";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {d.primaryHref?.startsWith("/") ? (
          // A page of this app: the desktop has its own version of every /home page.
          <Link href={d.primaryHref.replace(/^\/home\//, "/desk/")} className={`${button} flex items-center bg-[#c4572f] text-white no-underline`}>
            {d.primary}
          </Link>
        ) : d.primaryHref ? (
          <a href={d.primaryHref} target="_blank" rel="noreferrer" className={`${button} flex items-center bg-[#c4572f] text-white no-underline`}>
            {d.primary} ↗
          </a>
        ) : (
          <button type="button" onClick={() => setNote(d.primaryNote ?? "")} className={`${button} bg-[#c4572f] text-white`}>
            {d.primary}
          </button>
        )}
        {d.remind ? (
          <a href={calendarHref(d.remind)} download={`${d.remind.title}.ics`} className={`${button} flex items-center border border-[#e4ddd3] bg-white no-underline`}>
            {d.secondary}
          </a>
        ) : d.secondaryNote ? (
          <button type="button" onClick={() => setNote(d.secondaryNote ?? "")} className={`${button} border border-[#e4ddd3] bg-white`}>
            {d.secondary}
          </button>
        ) : (
          <Link href={`/desk/chat?q=${encodeURIComponent(`Tell me more about this: ${d.title}${d.url ? ` (${d.url})` : ""}`)}`} className={`${button} flex items-center border border-[#e4ddd3] bg-white no-underline`}>
            {d.secondary}
          </Link>
        )}
      </div>
      {note && (
        <p role="status" className="m-0 text-[13px] text-[#5a4f47]">
          {note}
        </p>
      )}
    </div>
  );
}

/** The biggest find, as a wide post with every reason. */
function LeadPost({ row, d }: { row: Row; d: Detail }) {
  const hero = HERO[row.id];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#ece6dc] bg-white">
      {hero && <Image src={hero[0]} alt={hero[1]} width={760} height={240} className="h-60 w-full object-cover object-[center_60%]" />}
      <div className="flex flex-col gap-3 p-[18px]">
        <span className="text-xs text-[#7a6e66]">
          {forWho(d.who)} · {d.source.split(" · ")[0]}
        </span>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="m-0 text-[19px] font-bold">{d.title}</h2>
          <span className="whitespace-nowrap text-xl font-bold text-[#c4572f]">{row.value}</span>
        </div>
        <p className="m-0 leading-normal">
          {d.intro} {d.note}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[13px] text-[#5a4f47]">
          {d.reasons.map(([app, text]) => (
            <li key={text} className="flex items-center gap-1.5">
              {app && <AppLogo app={app} size={14} label={`From ${app}`} />}
              {text}
            </li>
          ))}
        </ul>
        <Actions d={d} />
        <span className="text-xs text-[#8f8379]">{d.sourceNote}</span>
      </div>
    </article>
  );
}

function PhotoPost({ d }: { d: Detail }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#ece6dc] bg-white">
      {d.photo && <Image src={d.photo} alt={d.photoAlt ?? ""} width={380} height={200} className="h-[200px] w-full object-cover" />}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        <span className="text-xs text-[#7a6e66]">
          {forWho(d.who)} · {d.note.split(".")[0]}
        </span>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[17px] font-bold">{d.title}</h2>
          <span className="whitespace-nowrap text-[17px] font-bold">
            {d.big}{" "}
            {d.unitStrike && <span className="text-[13px] font-normal text-[#7a6e66] line-through">{d.unit}</span>}
          </span>
        </div>
        <p className="m-0 text-sm leading-normal text-[#5a4f47]">{d.reasons.map(([, text]) => text).join(". ")}.</p>
        <div className="mt-auto">
          <Actions d={d} />
        </div>
      </div>
    </article>
  );
}

function ListRow({ row }: { row: Row }) {
  const d = row.detail;
  const body = (
    <>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-semibold">{row.title}</span>
        <span className="text-[13px] text-[#7a6e66]">
          {forWho(row.who)} · {row.sub}
        </span>
        {d?.quote && <span className="text-[13px] italic text-[#5a4f47]">“{d.quote}”</span>}
      </span>
      <span className={`whitespace-nowrap font-bold ${row.money ? "text-[#c4572f]" : ""}`}>{row.value}</span>
    </>
  );
  const cls = "flex items-center gap-3.5 border-b border-[#ece6dc] px-4 py-3.5 last:border-b-0 no-underline";
  return d?.url ? (
    <a href={d.url} target="_blank" rel="noreferrer" className={cls}>
      {body}
      <span className="sr-only">(opens the page it came from)</span>
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function DeskFeed() {
  const { live } = useDesk();
  const [lead, ...rest] = EXAMPLES;
  const photos = rest.filter((r) => r.detail?.photo);
  const plain = rest.filter((r) => !r.detail?.photo);
  const count = EXAMPLES.length + live.rows.length;

  return (
    <div className="box-border flex justify-center px-8 py-10">
      <div className="flex w-full max-w-[760px] flex-col gap-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="m-0 text-[22px] font-bold">{count} things your family is missing</h1>
          <span className="text-[13px] text-[#7a6e66]">found by AIDaddy · from your family&apos;s apps and the web</span>
        </header>

        {lead.detail && <LeadPost row={lead} d={lead.detail} />}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
          {photos.map((r) => r.detail && <PhotoPost key={r.id} d={r.detail} />)}
        </div>
        <div className="flex flex-col rounded-2xl border border-[#ece6dc] bg-white">
          {plain.map((r) => (
            <ListRow key={r.id} row={r} />
          ))}
        </div>
        <p className="m-0 -mt-2 text-xs text-[#8f8379]">Examples for the demo family: the app facts behind them are not connected yet.</p>

        <section aria-label="Found on the web today" className="flex flex-col gap-2">
          <h2 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[#8f8379]">
            Found on the web today {live.status === "loading" && <Spinner size={12} />}
          </h2>
          {live.status === "loading" && <p className="m-0 text-[13px] text-[#7a6e66]">AIDaddy is reading official pages for Laura&apos;s family…</p>}
          {live.status === "error" && <p className="m-0 text-[13px] text-[#7a6e66]">Live search is not available right now: {live.error}</p>}
          {live.status === "ok" && live.rows.length === 0 && <p className="m-0 text-[13px] text-[#7a6e66]">Nothing new with a source today.</p>}
          {live.rows.length > 0 && (
            <div className="flex flex-col rounded-2xl border border-[#ece6dc] bg-white">
              {live.rows.map((r) => (
                <ListRow key={r.id} row={r} />
              ))}
            </div>
          )}
          {live.rows.length > 0 && <p className="m-0 text-xs text-[#8f8379]">Each live find quotes the page it came from.</p>}
        </section>
      </div>
    </div>
  );
}
