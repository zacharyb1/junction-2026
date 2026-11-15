"use client";

/**
 * The start page: what families bring, in their own words, floating over a fan of everyday photos, and one box to say
 * what is on your mind. A household job goes to "Get it done"; anything else goes to the chat with UKK.
 */

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { isJob } from "@/lib/home-demo";
import { Icon, ICON, useNav } from "./ui";

const WORDS = [
  "Tap is leaking…",
  "Gift for Eino…",
  "Housing allowance?…",
  "Babysitter Friday…",
  "Winter boots…",
  "Rent went up…",
  "Cheaper electricity…",
  "Jazz this week?…",
  "Kela forms…",
  "Daycare in January…",
  "Free things for kids…",
  "Swimming lessons…",
  "Back to work…",
  "Washer broke…",
];

// x, y, rotation in a 390 px wide band, from the design.
const SPOTS: [number, number, number][] = [
  [29, 21, -13.3], [171, 2, -1.9], [307, 11, 9], [431, 42, 19.2], [75, 31, -9.9], [209, 21, 1.1], [347, 38, 12.6], [26, 61, -14.4],
  [173, 40, -1.8], [289, 47, 7.9], [376, 65, 15.4], [34, 79, -14.1], [139, 61, -4.9], [276, 64, 7], [392, 89, 17.3], [26, 101, -15.3],
  [143, 80, -4.7], [264, 82, 6.2], [404, 113, 19], [95, 105, -9.3], [222, 98, 2.5], [346, 116, 14], [17, 294, -22.7], [146, 261, -6.1],
  [285, 267, 11.3], [77, 293, -15.4], [165, 278, -3.9], [257, 281, 8], [360, 309, 21.8], [94, 308, -13.8], [229, 297, 4.7],
];

const PHRASES = SPOTS.map(([x, y, r], i) => ({ x, y, r, text: WORDS[(i * 5) % WORDS.length] }));

const PHOTOS: [string, string, number, number, number, number, number, number][] = [
  ["tap", "A dripping kitchen tap", -34, 182, 92, 22, -16, 1],
  ["papers", "Forms and bills on the table", 52, 148, 104, 25, -8, 2],
  ["birthday", "A child blowing out birthday candles", 143, 126, 112, 27, 0, 3],
  ["winter", "Kids on a sled in the snow", 238, 148, 104, 25, 8, 2],
  ["play", "Kids playing with bubbles", 332, 182, 92, 22, 16, 1],
];

export function StartScreen({ found }: { found: number }) {
  const nav = useNav();
  const [query, setQuery] = useState("");
  const fill = (t: string) => setQuery(t.replace("…", "").replace(/\?$/, "?").trim());

  const q = query.trim().toLowerCase();
  const hits = q ? WORDS.filter((w) => q.split(/\s+/).some((t) => t.length > 1 && w.toLowerCase().includes(t)) && w.replace("…", "").toLowerCase() !== q).slice(0, 3) : [];

  function go(e?: FormEvent) {
    e?.preventDefault();
    const text = query.trim();
    if (!text) {
      document.getElementById("ask")?.focus();
      return;
    }
    if (isJob(text)) nav.push({ s: "tasks", job: text });
    else window.location.assign(nav.askHref(text));
  }

  return (
    <div className="ukk-scroll flex min-h-0 flex-1 flex-col px-6 pb-[calc(var(--ukk-bottom)+12px)]">
      <div
        role="group"
        aria-label="What families come with"
        className="relative -mx-6 h-[352px] flex-none overflow-hidden"
        style={{ background: "radial-gradient(ellipse 75% 62% at 50% 46%, rgba(255,179,138,0.34) 0%, rgba(255,215,110,0.2) 45%, rgba(251,248,243,0) 82%)" }}
      >
        <div className="absolute left-1/2 top-0 h-[352px] w-[390px] -translate-x-1/2">
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.55) 0, #000 8%, #000 74%, transparent 94%), linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%)",
              WebkitMaskComposite: "source-in",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.55) 0, #000 8%, #000 74%, transparent 94%), linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%)",
              maskComposite: "intersect",
            }}
          >
            {PHRASES.map((p, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onClick={() => fill(p.text)}
                className="ukk-phrase absolute whitespace-nowrap border-0 bg-transparent px-0 py-0.5 text-[11px] tracking-[0.1px] text-[#8f8379]"
                style={{ left: p.x, top: p.y, ["--r" as string]: `${p.r}deg`, transform: `translate(-50%, -50%) rotate(${p.r}deg)`, animationDelay: `${-(i % 7) * 0.8}s` }}
              >
                {p.text}
              </button>
            ))}
          </div>
          {PHOTOS.map(([k, alt, x, y, size, radius, r, z]) => (
            <Image
              key={k}
              src={`/home/photos/${k}.jpg`}
              alt={alt}
              width={size}
              height={size}
              priority
              className="absolute box-border border-[3px] border-white bg-[#f1ebe2] object-cover shadow-[0_10px_26px_rgba(80,50,30,0.16)]"
              style={{ left: x, top: y, width: size, height: size, borderRadius: radius, transform: `rotate(${r}deg)`, zIndex: z }}
            />
          ))}
        </div>
      </div>

      <h1 className="m-0 mt-[30px] text-center text-[30px] font-normal leading-[1.2] tracking-[-0.6px]">
        Help for your family,
        <br />
        right now
      </h1>
      <p className="mx-2 mb-0 mt-2.5 text-center text-[15px] font-light leading-[1.5] text-[#7a6e66]">
        Tell me what&apos;s on your mind. I find the money and help you&apos;re missing, call companies for quotes, and nothing is sent or paid without your yes.
      </p>
      <span className="min-h-5 flex-1" />

      {hits.length > 0 && (
        <ul aria-label="Examples" className="m-0 mb-2 list-none p-0">
          {hits.map((h) => (
            <li key={h}>
              <button type="button" onClick={() => fill(h)} className="w-full border-0 bg-transparent px-4 py-2 text-center text-[15px] font-light text-[#5a4f47]">
                {h}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={go} className="flex flex-none items-center gap-1.5 rounded-[30px] bg-white py-1.5 pl-5 pr-1.5 shadow-[0_8px_30px_rgba(80,50,30,0.09)]">
        <label htmlFor="ask" className="sr-only">
          Tell me what your family needs
        </label>
        <input
          id="ask"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tell me what your family needs"
          autoComplete="off"
          enterKeyHint="go"
          className="min-w-0 flex-1 border-0 bg-transparent text-base font-light text-[#2a2420] outline-none placeholder:text-[#8f8379]"
        />
        <button type="button" aria-label="Add a photo" title="Photos come with the chat" onClick={() => window.location.assign(nav.askHref())} className="flex size-11 items-center justify-center rounded-full">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a6e66" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <circle cx="9" cy="10" r="1.8" />
            <path d="M21 16l-5-5-9 9" />
          </svg>
        </button>
        <button type="submit" aria-label="Talk" className="flex size-12 items-center justify-center rounded-full bg-[#c4572f]">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
      </form>

      <nav aria-label="Other ways in" className="mt-3.5 flex flex-none flex-col">
        <button type="button" onClick={() => nav.push({ s: "connect" })} className="flex items-center gap-3.5 border-t border-[#efe7dc] px-1 py-3 text-left">
          <Icon d={ICON.link} size={22} width={1.5} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-base font-normal">Connect your family&apos;s apps</span>
            <span className="text-[13px] font-light text-[#7a6e66]">WhatsApp, Gmail, Wilma and more</span>
          </span>
          <Icon d={ICON.chevron} size={18} stroke="#7a6e66" width={1.6} />
        </button>
        <button type="button" onClick={() => nav.tab("hidden")} className="flex items-center gap-3.5 border-t border-[#efe7dc] px-1 py-3 text-left">
          <Icon d={ICON.star} size={22} width={1.5} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-base font-normal">Hidden opportunities</span>
            <span className="text-[13px] font-light text-[#7a6e66]">{found} things your family is missing</span>
          </span>
          <Icon d={ICON.chevron} size={18} stroke="#7a6e66" width={1.6} />
        </button>
      </nav>
    </div>
  );
}
