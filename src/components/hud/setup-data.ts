/**
 * The three connections of /setup: what a household can let AIDaddy follow.
 *
 * Each one is real and says how far it goes. "Live" runs on the team's server and has been used in real groups.
 * "First version" works on the person's own device and is new: the page names its limits next to the button.
 * Keep every line true to what the code does: hermes/SOUL.md for the chat, src/lib/listen.ts for the microphone,
 * extension/README.md for the browser.
 */
export type Connection = {
  id: "telegram" | "voice" | "browser";
  label: string;
  title: string;
  description: string;
  status: "live" | "first version";
  /** How it stays in the person's hands: what switches it off, and what it never does. */
  control: string;
  /** Where it works today and where it stops. */
  limits: string;
  action: { label: string; href: string; kind: "telegram" | "page" | "download" };
  /** What to do after the button, when the button alone is not enough. */
  steps?: string[];
  /** The scripted replay that shows this connection at work. `of` finishes the link's label for screen readers. */
  replay: { href: string; of: string };
};

export const CONNECTIONS: Connection[] = [
  {
    id: "telegram",
    label: "Connection 01",
    title: "In your group chat",
    description:
      "AIDaddy joins your family or flat group in Telegram and reads along. Small talk is dropped on our own server. When paperwork comes up, it answers with a plan and the official sentence behind every line.",
    status: "live",
    control: "Remove it from the group and it reads nothing. Say \"forget everything\" and it wipes what it remembers about your household.",
    limits: "Telegram groups and direct chats. It never sends, files, books or pays: sending anything waits for your click.",
    action: { label: "Add AIDaddy to a group", href: "https://t.me/junction_kaveri_bot?startgroup=true", kind: "telegram" },
    replay: { href: "/demo/chat", of: "AIDaddy in a group chat" },
  },
  {
    id: "voice",
    label: "Connection 02",
    title: "Listening on your phone or laptop",
    description:
      "Leave AIDaddy open on a device in the room. It follows what is said and lets small talk pass. When it hears a letter, a deadline, a life event or a plan that has rules, it looks up the official pages and shows what to do, before anyone asks.",
    status: "first version",
    control: "It hears only while its page is open, and one button stops it. What it heard stays on the device and is gone when the page closes.",
    limits: "Chrome, Edge and Safari, while the page is open and in front. It cannot listen from a locked phone, and the browser's own speech service turns the sound into text.",
    action: { label: "Let AIDaddy listen", href: "/listen", kind: "page" },
    replay: { href: "/demo/talk", of: "AIDaddy at the kitchen table" },
  },
  {
    id: "browser",
    label: "Connection 03",
    title: "Looking at your browser",
    description:
      "A browser extension looks at the page you have open. On a Kela, Vero or Migri page, or on any application form, it tells you what to do and by when, with the official sentence, without being asked. It fills a form only when you click, and never submits one.",
    status: "first version",
    control: "You say yes once on its welcome page, and its icon pauses it on one site or everywhere. It never reads what you type, or a page with a password or payment field.",
    limits: "Chrome, Edge or Brave on a computer. It is not in the Chrome Web Store yet, so it is loaded by hand.",
    action: { label: "Download the extension", href: "/aidaddy-extension.zip", kind: "download" },
    steps: [
      "Unpack the downloaded zip.",
      "Open chrome://extensions and switch on Developer mode.",
      "Click Load unpacked and choose the aidaddy-extension folder.",
      "Say yes on the welcome page that opens.",
    ],
    replay: { href: "/demo/browser", of: "AIDaddy in the browser" },
  },
];
