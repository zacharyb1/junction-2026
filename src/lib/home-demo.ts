/**
 * The pure parts of the /home and /desk app: the example household, its jobs and the household map. No network, no
 * React, so they can be tested on their own.
 *
 * What is real and what is an example:
 * - Real (from the Engine, each with the page it came from): live hidden opportunities (/api/opportunities), companies
 *   for a job (/api/helpers), community threads for a question (/api/communities), and the calls for quotes, which
 *   ring the team's test phones (/api/calls).
 * - Examples, and labelled so on screen: the connected apps and the facts read from them.
 */

import type { Community } from "@/lib/engine/communities";

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

/** The job Get it done starts with: the leaking kitchen tap from the family's Telegram. */
export const FIRST_JOB = "Kitchen tap is leaking";

/** Is a job one of the household jobs AIDaddy rings companies for, rather than a question for the chat? */
export const isJob = (text: string) =>
  /\b(leak|leaking|drip|broke|broken|fix|repair|clean|cleaning|plumb|plumber|tap|washer|washing machine|babysit|babysitter|electrician|paint|move|moving)\w*/i.test(text);

/** The first job has a photo of its own. */
export const isLeakingTap = (text: string) => /\btap\b/i.test(text) && /leak|drip/i.test(text);

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
