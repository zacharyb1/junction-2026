/**
 * The three ways AIDaddy can follow a household, as shown on the /setup mockup.
 * Only the Telegram chat works today. The other two are concepts and are labelled as such,
 * so the page never reads as a claim that they exist.
 */
export type Connection = {
  id: "telegram" | "phone" | "browser";
  label: string;
  title: string;
  description: string;
  status: "live" | "concept";
  /** Shown when the switch is on. */
  whenOn: string;
  /** Shown when the switch is off. */
  whenOff: string;
  action?: { label: string; href: string };
  /** The scripted replay that shows this channel at work. `of` finishes the link's label for screen readers. */
  replay: { href: string; of: string };
};

export const CONNECTIONS: Connection[] = [
  {
    id: "telegram",
    label: "Channel 01",
    title: "Read your Telegram chat",
    description:
      "AIDaddy joins your family or flat group and reads along. It stays quiet during small talk, then uses recent messages from the same chat and topic when paperwork needs attention.",
    status: "live",
    whenOn: "On. Once AIDaddy is in your group, it reads along and stays silent until it matters.",
    whenOff: "Off. Add AIDaddy to a group to switch this on.",
    action: { label: "Add AIDaddy to a group", href: "https://t.me/junction_kaveri_bot?startgroup=true" },
    replay: { href: "/demo/chat", of: "AIDaddy in a group chat" },
  },
  {
    id: "phone",
    label: "Channel 02",
    title: "Listen on your phone",
    description:
      "Say \"AIDaddy\" out loud and the next sentence becomes a message: \"AIDaddy, a letter from Migri just came.\" Nothing is heard before its name.",
    status: "concept",
    whenOn: "Concept, not built yet. Nothing is connected and nothing is recorded.",
    whenOff: "Off.",
    replay: { href: "/demo/talk", of: "AIDaddy at the kitchen table" },
  },
  {
    id: "browser",
    label: "Channel 03",
    title: "Look at your browser",
    description:
      "When you open a Kela, Vero or Migri page, AIDaddy reads it with you and points at the sentence that matters for your case.",
    status: "concept",
    whenOn: "Concept, not built yet. Nothing is connected and no page is read.",
    whenOff: "Off.",
    replay: { href: "/demo/browser", of: "AIDaddy in the browser" },
  },
];
