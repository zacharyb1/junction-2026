/**
 * The three ways AIDaddy can follow a household, as shown on /setup.
 * The Telegram chat works. Listening works on the device where it is started, as the web page /listen.
 * The browser extension is built (extension/ in the repository) but not published, so its switch connects nothing.
 * Each card says which of these it is, so the page never reads as a claim that something exists when it does not.
 */
export type Connection = {
  id: "telegram" | "phone" | "browser";
  label: string;
  title: string;
  description: string;
  /** live: works for a visitor now. built: exists, but a visitor cannot switch it on here. concept: an idea. */
  status: "live" | "built" | "concept";
  /** Shown when the switch is on. */
  whenOn: string;
  /** Shown when the switch is off. */
  whenOff: string;
  /** `internal` is a page of this site; otherwise the link opens Telegram in a new tab. */
  action?: { label: string; href: string; internal?: boolean };
  /** Switching the channel on opens this page of the site, where it really starts. */
  opens?: string;
  /** The scripted replay that shows this channel at work. `of` finishes the link's label for screen readers. */
  replay: { href: string; of: string };
};

export const CONNECTIONS: Connection[] = [
  {
    id: "telegram",
    label: "Channel 01",
    title: "Read your Telegram chat",
    description:
      "AIDaddy joins your family or flat group and reads along. Small talk is dropped on our own server; AIDaddy speaks only when paperwork appears.",
    status: "live",
    whenOn: "On. Once AIDaddy is in your group, it reads along and stays silent until it matters.",
    whenOff: "Off. Add AIDaddy to a group to switch this on.",
    action: { label: "Add AIDaddy to a group", href: "https://t.me/junction_kaveri_bot?startgroup=true" },
    replay: { href: "/demo/chat", of: "AIDaddy in a group chat" },
  },
  {
    id: "phone",
    label: "Channel 02",
    title: "Listen on this device",
    description:
      "Leave a phone or a laptop on the table with the listening page open. AIDaddy hears the room, keeps small talk on the device, researches a life event on its own, and comes back with a call or a ping.",
    status: "live",
    whenOn: "Opening the listening page. It listens on this device, only while that page is open and on screen.",
    whenOff: "Off. Switch it on to open the listening page on this device.",
    action: { label: "Start listening on this device", href: "/listen", internal: true },
    opens: "/listen",
    replay: { href: "/demo/talk", of: "AIDaddy at the kitchen table" },
  },
  {
    id: "browser",
    label: "Channel 03",
    title: "Look at your browser",
    description:
      "When you open a Kela, Vero or Migri page, AIDaddy reads it with you and points at the sentence that matters for your case.",
    status: "built",
    whenOn: "Built as a Chrome extension, but not in the Chrome Web Store. This switch connects nothing and no page is read.",
    whenOff: "Off.",
    replay: { href: "/demo/browser", of: "AIDaddy in the browser" },
  },
];
