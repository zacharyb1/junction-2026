"use client";

/**
 * The desktop "Your household": who is in the family on the left, and what UKK learned about the chosen person on the
 * right, each fact with the app it came from and a photo where one fits. The apps and facts are the demo's examples.
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppLogo } from "@/components/home/ui";
import { EXAMPLES } from "@/components/home/opportunities";
import { FACTS, MAP_APPS, type Person } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";

const PEOPLE: { name: Person; age: string; tint: string }[] = [
  { name: "Home", age: "", tint: "#eae6df" },
  { name: "Laura", age: "38", tint: "#f6dccf" },
  { name: "Eino", age: "4", tint: "#d6e4f2" },
  { name: "Aino", age: "9 months", tint: "#f6e9b8" },
];

/** Photos for the facts that have one. */
const PHOTO: Record<string, [string, string]> = {
  "Renting in Kallio": ["/assistant/family.jpg", "Laura with Eino and Aino at home"],
  "Lease runs to May": ["/home/photos/papers.jpg", "Papers on a table"],
  "Kitchen tap leaking": ["/home/photos/tap.jpg", "Water running from a kitchen tap"],
  "Turns 5 on 12 Dec": ["/home/photos/birthday.jpg", "A child blowing out birthday candles"],
  "Needs winter boots": ["/home/photos/boots-sale.jpg", "Warm winter boots in the snow"],
};

export function DeskHousehold() {
  const { live } = useDesk();
  const [who, setWho] = useState<Person>("Home");
  const facts = FACTS.filter((f) => f[1] === who);
  const photos = facts.flatMap(([, , text]) => (PHOTO[text] ? [{ text, src: PHOTO[text][0], alt: PHOTO[text][1] }] : []));
  const person = PEOPLE.find((p) => p.name === who) ?? PEOPLE[0];

  return (
    <div className="flex min-h-dvh flex-wrap items-stretch">
      <section aria-label="People" className="box-border flex max-w-full flex-[1_1_440px] flex-col border-r border-[#ece6dc]">
        <div className="flex items-center gap-3 border-b border-[#ece6dc] px-5 py-4">
          <Image src="/assistant/family.jpg" alt="" width={44} height={44} className="size-11 rounded-full object-cover" />
          <span className="flex flex-col gap-0.5">
            <h1 className="m-0 text-base font-semibold">Laura, Eino and Aino · Kallio</h1>
            <span className="text-xs text-[#7a6e66]">
              {FACTS.length} things UKK learned from {MAP_APPS.length} apps
            </span>
          </span>
        </div>
        {PEOPLE.map((p) => {
          const mine = FACTS.filter((f) => f[1] === p.name);
          return (
            <button
              key={p.name}
              type="button"
              aria-current={p.name === who ? "true" : undefined}
              onClick={() => setWho(p.name)}
              className={`grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border-b border-[#ece6dc] px-5 py-3.5 text-left ${p.name === who ? "bg-white" : ""}`}
            >
              <span aria-hidden className="flex size-10 items-center justify-center rounded-full font-bold" style={{ background: p.tint }}>
                {p.name[0]}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  {p.name} {p.age && <span className="font-normal text-[#8f8379]">{p.age}</span>}
                </span>
                <span className="truncate text-xs text-[#7a6e66]">
                  {mine.length} things · {mine.map((f) => f[2]).join(", ")}
                </span>
              </span>
            </button>
          );
        })}
        <p className="m-0 px-5 py-3 text-xs text-[#8f8379]">The apps and facts are examples: this demo does not connect real accounts.</p>
      </section>

      <article className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] px-10 pb-10 pt-7">
        <span className="text-xs text-[#7a6e66]">What UKK knows about</span>
        <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">
          {person.name} {person.age && <span className="font-normal text-[#8f8379]">{person.age}</span>}
        </h2>
        {photos.length > 0 && (
          <ul aria-label="Photos for these facts" className="m-0 grid max-w-[860px] list-none grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-1.5 p-0">
            {photos.map((ph) => (
              <li key={ph.text} className="relative aspect-square overflow-hidden rounded-md">
                <Image src={ph.src} alt={ph.alt} fill sizes="260px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-[rgba(42,36,32,.72)] px-2.5 py-2 text-xs text-white">{ph.text}</span>
              </li>
            ))}
          </ul>
        )}
        <ul aria-label="Facts" className="m-0 flex list-none flex-col gap-3.5 border-t border-[#ece6dc] p-0 pt-3.5">
          {facts.map(([app, , text]) => (
            <li key={text} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5">
              <AppLogo app={app} size={20} />
              <span>
                <strong>{app}</strong> <span className="text-[#7a6e66]">·</span> {text}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Link href="/desk/feed" className="flex h-10 items-center rounded-full bg-[#c4572f] px-4 font-semibold text-white no-underline">
            See {EXAMPLES.length + live.rows.length} hidden finds
          </Link>
          <Link href="/desk/apps" className="flex h-10 items-center rounded-full border border-[#e4ddd3] bg-white px-4 font-semibold no-underline">
            Choose which apps UKK reads
          </Link>
        </div>
      </article>
    </div>
  );
}
