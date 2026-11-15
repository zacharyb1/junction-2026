/**
 * The programme behind "Demos": four scripted replays and the autopilot demo, in the order a visitor sees them.
 *
 * One list feeds the hub at /demo, the links between the replays and each replay's own heading, so a scene
 * cannot be called one thing on the hub and another on its page. `real` says what in the scene comes from a
 * real research run and what does not: it is the honesty label, so change it only together with the scene.
 */
export type SceneSlug = "chat" | "browser" | "talk" | "calendar";

export type Scene = {
  href: string;
  /** The short name in the links between the replays. */
  nav: string;
  /** The shortest name, for those links on a narrow phone (under 560px). */
  navShort?: string;
  /** The name on the hub. */
  place: string;
  /** The heading on the scene's own page. */
  title: string;
  story: string;
  real: string;
  /** The label next to the title: what kind of thing the visitor is looking at. */
  tag: string;
  /** A concept is not built; a real scene replays research that really ran. */
  tone: "real" | "concept";
  /** How long the replay runs, the same as its DURATION. */
  seconds?: number;
};

export const REPLAYS: Record<SceneSlug, Scene> = {
  chat: {
    href: "/demo/chat",
    nav: "Group chat",
    navShort: "Chat",
    place: "In the group chat",
    title: "AIDaddy in the group chat",
    story: "A family shares big news. AIDaddy stays silent through the small talk, then answers with a plan in four steps.",
    real: "Fictional family. The plan, its sources and the case link come from a real run.",
    tag: "Plan from a real run",
    tone: "real",
    seconds: 36,
  },
  browser: {
    href: "/demo/browser",
    nav: "Browser",
    navShort: "Browser",
    place: "In the browser",
    title: "AIDaddy in the browser",
    story: "Someone is stuck on a tax form. AIDaddy shows what the rule says and corrects the form. Submitting stays with the person.",
    real: "Concept. The form is illustrative and the call is a concept. The rules AIDaddy quotes come from a real run.",
    tag: "Concept",
    tone: "concept",
    seconds: 36,
  },
  talk: {
    href: "/demo/talk",
    nav: "Kitchen table",
    navShort: "Table",
    place: "At the kitchen table",
    title: "AIDaddy at the kitchen table",
    story: "Two people talk about a rent increase. AIDaddy checks the rules in the background while they go on talking.",
    real: "Concept: a phone that wakes on its name is not built yet. A first version listens while its page is open. The research and its quotes come from a real run.",
    tag: "Concept",
    tone: "concept",
    seconds: 38,
  },
  calendar: {
    href: "/demo/calendar",
    nav: "Calendar",
    navShort: "Calendar",
    place: "In the calendar",
    title: "AIDaddy in the calendar",
    story: "A 60th birthday is two weeks away. AIDaddy finds three options, drafts the invitation and books nothing.",
    real: "Concept: AIDaddy cannot read or write a calendar yet. In Telegram you tell AIDaddy the birthdays. The three options and their facts come from a real run.",
    tag: "Concept",
    tone: "concept",
    seconds: 31,
  },
};

export const REPLAY_ORDER: SceneSlug[] = ["chat", "browser", "talk", "calendar"];

/** The fifth scene is not a replay: it is the autopilot page, which asks for the access code. */
export const AUTOPILOT: Scene = {
  href: "/autopilot",
  nav: "One step ahead",
  place: "One step ahead",
  title: "One step ahead",
  story: "A family mentions a move and a letter from the bank. Specialists propose the next step, and nothing happens until the family says yes.",
  real: "A fixed script with one live check: the lawyer's question can be researched while you watch.",
  tag: "One live check",
  tone: "real",
};

/** Every scene has a place in the programme, counted from one. */
export const SCENE_COUNT = REPLAY_ORDER.length + 1;
