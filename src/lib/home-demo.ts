/**
 * The pure parts of the /home phone app: the example household, the simulated "Get it done" calls and the household
 * map. No network, no React, so the timelines can be tested and replay the same way in every demo.
 *
 * What is real and what is simulated:
 * - Real (from the Engine, each with the page it came from): live hidden opportunities (/api/opportunities), companies
 *   for a typed job (/api/helpers), and community threads for a typed question (/api/communities).
 * - Simulated, and labelled so on screen: the connected apps, the facts read from them, the calls, quotes and slots.
 */

import type { Community } from "@/lib/engine/communities";
import type { Helper } from "@/lib/engine/helpers";

export const ACCENT = "#c4572f";

/** The example family the demo is about, as /api/opportunities expects it. */
export const HOUSEHOLD = {
  city: "Helsinki",
  country: "FI",
  members: ["Laura, 38, nurse working evening shifts", "Eino, 4, goes to daycare", "Aino, 9 months"],
  situation: ["Renting a flat in Kallio, Helsinki", "Back at work part-time after parental leave"],
  interests: ["jazz", "swimming"],
};

export type AppName =
  | "WhatsApp"
  | "Telegram"
  | "Gmail"
  | "Calendar"
  | "Wilma"
  | "Photos"
  | "Outlook"
  | "Instagram"
  | "Drive"
  | "Messenger"
  | "Facebook"
  | "Signal";

/** Where each app's logo lives in /public. */
export const logo = (app: AppName) => `/home/logos/${app.toLowerCase()}.${app === "Wilma" ? "png" : "svg"}`;

// ---------------------------------------------------------------- Get it done

export type Channel = "phone" | "wa" | "mail";
export const CHANNEL: Record<Channel, { name: string; app?: AppName }> = {
  phone: { name: "Phone" },
  wa: { name: "WhatsApp", app: "WhatsApp" },
  mail: { name: "Gmail", app: "Gmail" },
};

export type Firm = {
  name: string;
  /** As shown while searching: masked in the scripted demo, as the page writes it in a live search. */
  phone: string;
  hours: string;
  open: boolean;
  /** Ticks (0.95 s each) at which the firm is found, answers and gives its quote. 99 means never. */
  found: number;
  answer: number;
  quote: number;
  price: number | null;
  /** What AIDaddy hears on the call. */
  heard: string;
  /** The line under the name once the quote is in. */
  result: string;
  /** Whether the offered time fits the parent's week. */
  fits: boolean;
  /** How the company can be reached; the first is the one AIDaddy uses. */
  channels: Channel[];
  /** A live search's company page, where its phone number and any listed price come from. */
  url?: string;
  listed?: string;
};

const firm = (
  name: string,
  phone: string,
  hours: string,
  open: boolean,
  [found, answer, quote]: [number, number, number],
  price: number | null,
  heard: string,
  result: string,
  fits: boolean,
  channels: Channel[],
): Firm => ({ name, phone, hours, open, found, answer, quote, price, heard, result, fits, channels });

/** The scripted run from the design: six plumbers near Kallio, five quotes, about 17 seconds. */
export const DEMO_JOB = "Kitchen tap is leaking";
export const DEMO_FIRMS: Firm[] = [
  firm("Wirmax", "040 ••• 45 21", "7–20", true, [1, 8, 13], 51, "“Tuesday 16:00 works, and 15% off.”", "Tue 16:00 · got 15% off", true, ["wa", "phone", "mail"]),
  firm("Tinko Finland", "010 ••• 20 00", "8–16", true, [2, 9, 12], 99, "“We can do Tuesday morning.”", "Tue 10:00", true, ["phone", "mail"]),
  firm("KH-Suomi Putki", "044 ••• 73 10", "24/7", true, [3, 7, 11], 113, "“About an hour and a half.”", "about 1.5 h", true, ["phone", "wa"]),
  firm("Vintek", "050 ••• 18 64", "8–17", true, [4, 10, 14], 120, "“Only Monday 9:00.”", "during your shift", false, ["mail", "phone"]),
  firm("Putkimies Helsinki", "045 ••• 90 02", "7–22", true, [5, 8, 15], 128, "“Tuesday 16:00 is free.”", "Tue 16:00", true, ["wa", "phone"]),
  firm("Putkityö Nieminen", "040 ••• 33 87", "8–16, opens Mon", false, [6, 99, 99], null, "", "closed now", false, ["mail", "phone"]),
];

/** Is a job one of the household jobs AIDaddy rings companies for, rather than a question for the chat? */
export const isJob = (text: string) =>
  /\b(leak|leaking|drip|broke|broken|fix|repair|clean|cleaning|plumb|plumber|tap|washer|washing machine|babysit|babysitter|electrician|paint|move|moving)\w*/i.test(text);

/** The scripted run plays for the job it was recorded with; anything else is searched live. */
export const isDemoJob = (text: string) => /\btap\b/i.test(text) && /leak|drip/i.test(text);

// The same company always gets the same simulated answer, so a replay matches the last one.
function seed(text: string) {
  let h = 7;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h;
}

const SLOTS: [string, boolean][] = [
  ["Tue 16:00", true],
  ["Tue 10:00", true],
  ["Mon 9:00", false],
  ["Wed 17:30", true],
  ["Thu 13:00", false],
  ["Fri 15:00", true],
];

/**
 * Real companies from /api/helpers, with simulated calls: a quote that starts from the price the company lists, when
 * it lists one. Companies without a phone number on their page are shown but not called.
 */
export function firmsFromHelpers(helpers: Helper[]): Firm[] {
  return helpers.slice(0, 6).map((h, i) => {
    const s = seed(h.name);
    const listed = Number(h.price.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".")) || 0;
    const hourly = /\/\s*h|tunti|hour/i.test(h.price);
    const discount = s % 3 === 0 ? 0 : s % 2 ? 10 : 15;
    const base = listed ? (hourly ? listed * 1.5 + 20 : listed) : 80 + (s % 60);
    const price = Math.round(base * (1 - discount / 100));
    const [slot, fits] = SLOTS[s % SLOTS.length];
    const callable = Boolean(h.phone);
    const found = i + 1;
    return {
      name: h.name,
      phone: h.phone || h.site,
      hours: h.price ? `listed ${h.price}` : h.service || "price not listed",
      open: callable,
      found,
      answer: callable ? 7 + ((s + i) % 3) : 99,
      quote: callable ? 11 + ((s + i * 2) % 5) : 99,
      price: callable ? price : null,
      heard: `“${slot.replace("Tue", "Tuesday").replace("Wed", "Wednesday").replace("Mon", "Monday").replace("Thu", "Thursday").replace("Fri", "Friday")} works${discount ? `, and ${discount}% off` : ""}.”`,
      result: fits ? `${slot}${discount ? ` · got ${discount}% off` : ""}` : `${slot} · during your shift`,
      fits,
      channels: ["phone"],
      url: h.url,
      listed: h.price,
    };
  });
}

export type FirmRow = {
  firm: Firm;
  state: "found" | "closed" | "reaching" | "talking" | "quoted";
  icon: "pin" | "clock" | "phone" | "message" | "check";
  line: string;
  /** Which channel AIDaddy uses, when it is an app. */
  via?: AppName;
};

export type TaskFrame = {
  stage: 0 | 1 | 2;
  busy: boolean;
  headline: string;
  clock: string;
  rows: FirmRow[];
  best: Firm | null;
};

/** Everything the "Get it done" screen shows at tick `t`: search (1–6), calls (7–16), pick (17+). */
export function taskFrame(t: number, firms: Firm[], place = "Kallio", trade = "plumbers"): TaskFrame {
  const searching = t <= 6;
  const picked = t >= 17;
  const calling = !searching && !picked;
  const rows: FirmRow[] = firms
    .filter((f) => t >= f.found)
    .map((f) => {
      const ch = CHANNEL[f.channels[0]];
      if (searching || !f.open) {
        return { firm: f, state: f.open ? "found" : "closed", icon: f.open ? "pin" : "clock", line: `${f.phone} · ${f.hours}` };
      }
      const isCall = ch.name === "Phone";
      if (t < f.answer) {
        const line = isCall ? `Calling ${f.phone}…` : ch.name === "WhatsApp" ? "Messaged on WhatsApp…" : "Emailed from Gmail…";
        return { firm: f, state: "reaching", icon: isCall ? "phone" : "message", line, via: ch.app };
      }
      if (t < f.quote) return { firm: f, state: "talking", icon: isCall ? "phone" : "message", line: f.heard, via: ch.app };
      return { firm: f, state: "quoted", icon: "check", line: f.result, via: ch.app };
    });
  const quoted = rows.filter((r) => r.state === "quoted");
  const best = picked ? ([...quoted].filter((r) => r.firm.fits).sort((a, b) => (a.firm.price ?? 1e9) - (b.firm.price ?? 1e9))[0]?.firm ?? null) : null;
  const ordered = picked
    ? [
        ...quoted.filter((r) => r.firm !== best).sort((a, b) => (a.firm.price ?? 0) - (b.firm.price ?? 0)),
        ...rows.filter((r) => r.state !== "quoted"),
      ]
    : rows;
  const live = rows.filter((r) => r.state === "talking").length;
  const reachable = firms.filter((f) => f.open).length;
  const headline =
    t === 0
      ? `Searching ${trade} near ${place}…`
      : searching
        ? `Found ${rows.length} · phones, chats, hours`
        : calling
          ? live
            ? `${live} talking · ${quoted.length} quotes in`
            : `Reaching ${reachable} by call, WhatsApp, email`
          : `${quoted.length} quotes in · ${best ? "best one picked" : "none fits your week"}`;
  return {
    stage: picked ? 2 : calling ? 1 : 0,
    busy: !picked,
    headline,
    clock: `0:${String(Math.min(t, 18) * 3).padStart(2, "0")}`,
    rows: ordered,
    best,
  };
}

// ---------------------------------------------------------------- Your household

export const MAP_APPS: AppName[] = ["WhatsApp", "Calendar", "Instagram", "Gmail", "Drive", "Telegram", "Photos", "Wilma", "Messenger", "Outlook", "Facebook", "Signal"];
export const MAP_CENTRE: [number, number] = [171, 165];

/** Twelve apps scattered around AIDaddy at uneven distances, like a hand-drawn map (342 × 330 box). */
export const MAP_NODES = MAP_APPS.map((app, i) => {
  const a = ((i * 30 - 80 + [6, -8, 4, -5, 9, -4, 7, -9, 3, -6, 8, -3][i]) * Math.PI) / 180;
  const r = [150, 118, 156, 124, 146, 112, 152, 128, 148, 116, 154, 122][i];
  return { app, x: Math.round(MAP_CENTRE[0] + r * Math.cos(a)), y: Math.round(MAP_CENTRE[1] + r * Math.sin(a) * 1.02) };
});

export type Person = "Laura" | "Eino" | "Aino" | "Home";

/** What AIDaddy learns, in order, and from which app. Examples for the demo household. */
export const FACTS: [AppName, Person, string][] = [
  ["Gmail", "Home", "Renting in Kallio"],
  ["Outlook", "Laura", "Evening shifts"],
  ["Wilma", "Eino", "Daycare Vilja"],
  ["Calendar", "Eino", "Turns 5 on 12 Dec"],
  ["Instagram", "Laura", "Loves jazz"],
  ["Drive", "Home", "Lease runs to May"],
  ["Photos", "Aino", "Needs winter boots"],
  ["WhatsApp", "Laura", "Swims Sundays"],
  ["Telegram", "Home", "Kitchen tap leaking"],
  ["Facebook", "Laura", "Kallio parents group"],
  ["Messenger", "Eino", "Wants a bike"],
  ["Signal", "Aino", "Grandma babysits Fridays"],
  ["Gmail", "Aino", "Kela child benefit"],
];

const AGES: Record<Person, string> = { Laura: "38", Eino: "4", Aino: "9 months", Home: "" };

/** The household map at tick `t` (0.7 s each): one fact per tick, done once all are read. */
export function householdFrame(t: number) {
  const known = FACTS.slice(0, t);
  const done = t > FACTS.length;
  const current: AppName | null = !done && t > 0 ? FACTS[t - 1][0] : null;
  const nodes = MAP_NODES.map((n) => ({ ...n, seen: known.some((f) => f[0] === n.app), now: n.app === current }));
  const people = (["Laura", "Eino", "Aino", "Home"] as Person[]).map((name) => {
    const mine = known.filter((f) => f[1] === name);
    return { name, age: AGES[name], apps: [...new Set(mine.map((f) => f[0]))], facts: mine.map((f) => f[2]).join(" · ") };
  });
  const status = done ? `Ready · ${FACTS.length} things from ${MAP_APPS.length} apps` : current ? `Reading ${current}…` : "Reading your apps…";
  return { done, current, nodes, people, status, learned: known.length };
}

// ---------------------------------------------------------------- Ask parents like you

export type CommunityFilter = "All" | "Forums" | "Groups" | "Podcasts";
export type CommunityRow = { kind: Exclude<CommunityFilter, "All">; title: string; meta: string; action: string; href: string; quote?: string };

/** The real video the demo opens, at the minute about night wakings. */
export const NIGHT_WAKING_VIDEO = "https://www.youtube.com/watch?v=kgAyxAxJqaU&t=421s";

export const DEMO_QUESTION = "Eino wakes up every night";
export const DEMO_COMMUNITIES: CommunityRow[] = [
  { kind: "Forums", title: "Night wakings at 11 months: your experience?", meta: "vauva.fi forum · parents in Finland", action: "Reply", href: "https://www.vauva.fi/keskustelu" },
  { kind: "Groups", title: "Helsinki parents of toddlers", meta: "Facebook group · ask the members", action: "Ask here", href: "https://www.facebook.com/groups/" },
  { kind: "Groups", title: "r/Finland: sleep and daycare threads", meta: "Reddit · comment on a thread", action: "Ask here", href: "https://www.reddit.com/r/Finland/" },
  {
    kind: "Podcasts",
    title: "Why kids wake up at night, and what to do",
    meta: "YouTube · The Mom Psychologist · from 7:01",
    action: "7:01 ↗",
    href: NIGHT_WAKING_VIDEO,
  },
];

/** A live community result, sorted into the screen's three filters. */
export function communityRow(c: Community): CommunityRow {
  const kind: CommunityRow["kind"] = c.kind === "Podcast" || c.kind === "Video" ? "Podcasts" : c.kind === "Facebook group" || c.kind === "Reddit" ? "Groups" : "Forums";
  const action = kind === "Podcasts" ? "Listen ↗" : kind === "Groups" ? "Ask here" : "Reply";
  return { kind, title: c.title, meta: `${c.site} · ${c.kind}`, action, href: c.url, quote: c.quote };
}
