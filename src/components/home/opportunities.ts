/**
 * The hidden opportunities on /home: five worked examples for the demo household, and the live ones the Engine finds
 * on the web for the same household (/api/opportunities), each with the page sentence it rests on.
 *
 * The examples' reasons ("from Gmail", "from Wilma") stand for facts read from connected apps, which this demo does not
 * connect yet, so the screens label them as examples.
 */

import type { Opportunity } from "@/lib/engine/opportunities";
import type { AppName } from "@/lib/home-demo";
import { ICON } from "./ui";

export type Who = "Family" | "Laura" | "Eino" | "Aino";
export const TINT: Record<Who, string> = { Family: "#eae6df", Laura: "#f6dccf", Eino: "#d6e4f2", Aino: "#f6e9b8" };

export type Detail = {
  who: Who;
  kind: string;
  title: string;
  intro: string;
  label: string;
  big: string;
  unit: string;
  unitStrike?: boolean;
  note: string;
  photo?: string;
  photoAlt?: string;
  whyTitle: string;
  reasons: [AppName | null, string][];
  /** The page the finding rests on, and a sentence from it when the Engine read it. */
  source: string;
  sourceNote: string;
  url?: string;
  quote?: string;
  primary: string;
  /** Where the primary button goes: a real page outside, or a page of this app (a path starting with /home/). */
  primaryHref?: string;
  primaryNote?: string;
  secondary: string;
  secondaryNote?: string;
  /** The secondary button saves this to the parent's own calendar. */
  remind?: Reminder;
  promise: string;
  demo: boolean;
};

/** A calendar event the parent saves: on the next `weekday` (0 Sunday … 6 Saturday), local time. */
export type Reminder = { title: string; weekday: number; start: string; end: string; weekly?: boolean; where?: string };

const stamp = (d: Date, time: string) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${time.replace(":", "")}00`;

/**
 * The reminder as a calendar file (.ics) the browser saves, so the parent's own calendar reminds them; nothing is
 * stored or sent by AIDaddy. The event is on the next such weekday after today, an hour's alarm before.
 */
export function calendarHref(r: Reminder, today = new Date()): string {
  const day = new Date(today);
  day.setDate(day.getDate() + (((r.weekday - day.getDay() + 7) % 7) || 7));
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIDaddy//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(day, r.start)}-${r.title.replace(/\W+/g, "-")}@aidaddy`,
    `DTSTAMP:${stamp(today, "00:00")}`,
    `DTSTART:${stamp(day, r.start)}`,
    `DTEND:${stamp(day, r.end)}`,
    `SUMMARY:${r.title}`,
    ...(r.where ? [`LOCATION:${r.where}`] : []),
    ...(r.weekly ? ["RRULE:FREQ=WEEKLY"] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${r.title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export type Row = {
  id: string;
  title: string;
  sub: string;
  value: string;
  money: boolean;
  who: Who;
  icon?: string;
  photo?: string;
  detail?: Detail;
};

export const EXAMPLES: Row[] = [
  {
    id: "housing",
    title: "Housing allowance",
    sub: "Kela · backdated 1 month",
    value: "€420/mo",
    money: true,
    who: "Family",
    icon: ICON.home,
    detail: {
      demo: true,
      who: "Family",
      kind: "Money you may be missing",
      title: "Housing allowance",
      intro: "Kela helps pay rent when income is low for the size of the family. You have not applied yet.",
      label: "Your estimate",
      big: "€420",
      unit: "a month",
      note: "Apply now and it can start from last month, so about €840 in the first payment.",
      whyTitle: "Why your family fits",
      reasons: [
        ["Gmail", "You rent in Kallio, €1,180 a month"],
        ["Drive", "Your lease runs until May"],
        ["Outlook", "Back at work part-time since October"],
        ["Wilma", "Two children live with you"],
      ],
      source: "kela.fi · General housing allowance",
      sourceNote: "Example: the estimate is not a Kela decision",
      url: "https://www.kela.fi/general-housing-allowance",
      primary: "Apply on Kela's page",
      primaryHref: "https://www.kela.fi/general-housing-allowance#how-to-apply-for-housing-allowance",
      secondary: "Remind me on Friday",
      remind: { title: "Apply for housing allowance in OmaKela", weekday: 5, start: "09:00", end: "09:30" },
      promise: "You apply in OmaKela yourself; Kela's page shows how. AIDaddy sends nothing for you.",
    },
  },
  {
    id: "boots",
    title: "Winter boots for Aino",
    sub: "Sale ends Sunday · size 20",
    value: "−40%",
    money: true,
    who: "Aino",
    photo: "/home/photos/boots.jpg",
    detail: {
      demo: true,
      who: "Aino",
      kind: "Sale that fits a need",
      title: "Winter boots for Aino, 40% off",
      intro: "Warm first-walker boots in her size are on sale this week. You were already looking for some.",
      label: "Sale price",
      big: "€35",
      unit: "€59",
      unitStrike: true,
      note: "Sale ends Sunday. Size 20 is in stock at a shop 600 m from home.",
      photo: "/home/photos/boots-sale.jpg",
      photoAlt: "Warm winter boots in the snow",
      whyTitle: "Why it showed up",
      reasons: [
        ["Photos", "You snapped her old boots, they are too small"],
        ["WhatsApp", "“Aino needs winter boots” in the family group"],
        ["Calendar", "First snow is forecast for next week"],
      ],
      source: "Shop page · Kids winter boots",
      sourceNote: "Example: price and stock are not checked in this demo",
      primary: "Find boots in shops",
      primaryHref: `/home/search?q=${encodeURIComponent("Warm winter boots for a 9-month-old, size 20")}`,
      secondary: "Remind me on Saturday",
      remind: { title: "Buy winter boots for Aino, size 20", weekday: 6, start: "10:00", end: "10:30" },
      promise: "AIDaddy never buys anything. You decide and pay yourself.",
    },
  },
  {
    id: "art",
    title: "Free art club after daycare",
    sub: "Tuesdays 16.00 · Kallio library",
    value: "Free",
    money: false,
    who: "Eino",
    photo: "/home/photos/art.jpg",
    detail: {
      demo: true,
      who: "Eino",
      kind: "Free for kids",
      title: "Free art club after daycare",
      intro: "A free painting club for 4–6 year olds at Kallio library, right after daycare ends.",
      label: "Every Tuesday",
      big: "Free",
      unit: "16.00–17.00",
      note: "8 places left this term. Materials are provided.",
      photo: "/home/photos/art-club.jpg",
      photoAlt: "A child painting at an art club",
      whyTitle: "Why your family fits",
      reasons: [
        ["Wilma", "Daycare Vilja ends at 15.30 on Tuesdays"],
        ["Instagram", "Eino loves drawing, from your posts"],
        ["Calendar", "Your Tuesday afternoons are free"],
      ],
      source: "hel.fi · Free activities for children",
      sourceNote: "Example: times and places are not checked in this demo",
      url: "https://www.hel.fi/en/culture-and-leisure/libraries-in-helsinki",
      primary: "Find it on Helsinki's events",
      primaryHref: "https://tapahtumat.hel.fi/en/search?keyword=children",
      secondary: "Add to calendar",
      remind: { title: "Art club for Eino", weekday: 2, start: "16:00", end: "17:00", weekly: true, where: "Kallio library, Helsinki" },
      promise: "You sign up on the city's own pages. AIDaddy sends nothing for you.",
    },
  },
  { id: "jazz", title: "Afterwork jazz, Manala", sub: "Thursdays 17–19", value: "Free", money: false, who: "Laura", icon: ICON.music },
  { id: "tax", title: "Tax credit for home help", sub: "Vero · this year", value: "40%", money: true, who: "Family", icon: ICON.coin },
];

const LENS: Record<Opportunity["lens"], { who: Who; kind: string; icon: string }> = {
  situation: { who: "Family", kind: "Fits your situation", icon: ICON.home },
  children: { who: "Eino", kind: "For the kids", icon: ICON.baby },
  money: { who: "Family", kind: "Money you may be missing", icon: ICON.coin },
  interests: { who: "Laura", kind: "For you", icon: ICON.heart },
};

const money = (v: string) => /€|eur|%|\d/i.test(v) && !/^free$/i.test(v.trim());

/** A live finding from the Engine, as a row with its own detail page. Every fact on it comes from the page. */
export function liveRow(found: Opportunity, i: number): Row {
  // The model sometimes writes "None stated" for a field the page does not fill.
  const none = (v: string) => (/^(none|not) (stated|given|specified|mentioned)\.?$/i.test(v.trim()) ? "" : v);
  const o = { ...found, value: none(found.value), deadline: none(found.deadline) };
  const lens = LENS[o.lens];
  const kids = o.lens === "children";
  const who: Who = kids && /baby|infant|vauva|toddler|9 months/i.test(`${o.title} ${o.why}`) ? "Aino" : lens.who;
  const value = o.value || "See page";
  // "by 20 November", but "until your child starts school" stays as the page words it.
  const deadline = o.deadline && (/^(by|until|before|ends?|from|during|on)\b/i.test(o.deadline) ? o.deadline : `by ${o.deadline}`);
  return {
    id: `live-${i}`,
    title: o.title,
    sub: [o.source, deadline].filter(Boolean).join(" · "),
    value: value.length > 10 ? value.slice(0, 9) + "…" : value,
    money: money(value),
    who,
    icon: lens.icon,
    detail: {
      demo: false,
      who,
      kind: lens.kind,
      title: o.title,
      intro: o.why,
      label: deadline ? `Use or apply ${deadline}` : "What it is worth",
      big: value,
      unit: "",
      note: "Found on the web today for your household.",
      whyTitle: "What the page says",
      reasons: [],
      quote: o.quote,
      source: o.source,
      sourceNote: "Read today · the quote is checked on this page",
      url: o.url,
      primary: "Open the page",
      primaryHref: o.url,
      secondary: "Ask AIDaddy about it",
      secondaryNote: "",
      promise: "Research with sources, not advice. AIDaddy never sends, books or pays.",
    },
  };
}
