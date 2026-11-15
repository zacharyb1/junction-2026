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
  /** Where the primary button goes: outside (a real page) or a note about what UKK would prepare. */
  primaryHref?: string;
  primaryNote?: string;
  secondary: string;
  secondaryNote: string;
  promise: string;
  demo: boolean;
};

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
      url: "https://www.kela.fi/",
      primary: "Prepare the application",
      primaryNote: "UKK would fill in the form for you to check. In this demo nothing is filled in or sent.",
      secondary: "Remind me on Friday",
      secondaryNote: "A reminder needs your yes in the family chat. In this demo none is set.",
      promise: "UKK fills in the form for you to check. Nothing is sent without your yes.",
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
      primary: "Open the shop page",
      primaryNote: "In this demo there is no real shop page behind the example.",
      secondary: "Remind me on Saturday",
      secondaryNote: "A reminder needs your yes in the family chat. In this demo none is set.",
      promise: "UKK never buys anything. You decide and pay yourself.",
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
      url: "https://www.hel.fi/",
      primary: "Sign Eino up",
      primaryNote: "UKK would prepare the sign-up for you to check. In this demo nothing is sent.",
      secondary: "Add to calendar",
      secondaryNote: "Calendar entries need your yes. In this demo none is added.",
      promise: "UKK prepares the sign-up for you to check. Nothing is sent without your yes.",
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
      secondary: "Ask UKK about it",
      secondaryNote: "",
      promise: "Research with sources, not advice. UKK never sends, books or pays.",
    },
  };
}
