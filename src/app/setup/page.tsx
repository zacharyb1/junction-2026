import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Footer, Section, Wordmark } from "@/components/hud/sections";
import { landingConfig } from "@/components/landing/config";
import { TryLink } from "@/components/landing/try-link";
import "@/components/hud/hud.css";

const title = "Set up AIDaddy in three steps";
const description =
  "Add AIDaddy to your family's Telegram group, tell it where you live once, and carry on. It speaks first when life brings paperwork.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** What the family does once. Everything after step 3 is AIDaddy's job, which is the point of the page. */
const STEPS = [
  {
    name: "Add AIDaddy to your family's Telegram group",
    tech: "On the phones you already use",
    text: "Add it like any other member. No new app. Its first message says what it reads and what it keeps.",
  },
  {
    name: "Tell it where you live",
    tech: "Once, with one tap",
    text: "It asks for your country and city with buttons and remembers them, so every search starts on the right official sites.",
  },
  {
    name: "Carry on with your life",
    tech: "It speaks first",
    text: "It reads along and says nothing. When someone mentions a baby, a move or a lost job, or shares an official letter, it comes back on its own with a plan.",
  },
];

/** Things AIDaddy does without being asked, each one already in the product. */
const AHEAD = [
  {
    name: "Notices the moment",
    tech: "Local gate, then Exa",
    text: "A life event in the chat is enough. Nobody has to ask the bot a question.",
  },
  {
    name: "Brings the plan, with proof",
    tech: "Official pages, quoted",
    text: "What to do, by when, and the sentence on the official page that says so. No source, no line.",
  },
  {
    name: "Keeps the dates",
    tech: "Reminders, after your yes",
    text: "Deadlines from the plan become reminders in the same chat, once the family approves.",
  },
  {
    name: "Keeps watching the sources",
    tech: "Every night",
    text: "Cited pages are opened again each night, and the case file shows when a quote is no longer there.",
  },
];

export default function Setup() {
  const { botUsername, repoUrl } = landingConfig();
  const botUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div className="hud">
      <header className="hud-wrap">
        <nav className="hud-top" aria-label="Main">
          <Link href="/" aria-label="AIDaddy home">
            <Wordmark />
          </Link>
          <TryLink className="hud-top-link">Try it live</TryLink>
        </nav>
      </header>

      <main>
        <Section
          id="setup"
          index="01"
          label="Set it up"
          title="Three steps. Then it is one step ahead."
          lede="You set it up once. After that you do not ask it for help: it notices what is happening in the family chat and comes to you."
        >
          <ol className="hud-flow">
            {STEPS.map((step) => (
              <li key={step.name}>
                <h3>{step.name}</h3>
                <p className="hud-flow-tech">{step.tech}</p>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="hud-actions" style={{ marginTop: "2rem" }}>
            {botUrl ? (
              <a href={botUrl} className="hud-btn hud-btn--primary" target="_blank" rel="noopener noreferrer">
                Open AIDaddy in Telegram
              </a>
            ) : null}
            <TryLink className={botUrl ? "hud-btn" : "hud-btn hud-btn--primary"}>Try it on your own question</TryLink>
          </div>
          <p className="hud-note" style={{ marginTop: "1rem" }}>
            AIDaddy is a hackathon beta. During Junction it answers only families the team has added. The browser demo
            runs the same research on the live web, for anyone.
          </p>
        </Section>

        <Section
          id="ahead"
          index="02"
          label="One step ahead"
          title="What it does without being asked."
          lede="This is the difference from a chatbot: you never have to remember to ask."
        >
          <ol className="hud-flow">
            {AHEAD.map((item) => (
              <li key={item.name}>
                <h3>{item.name}</h3>
                <p className="hud-flow-tech">{item.tech}</p>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="keeps"
          index="03"
          label="What it keeps"
          title="Household basics, and nothing else."
          lede="Country, city, first names and open cases. A small model on the family's own machine decides which messages need AIDaddy at all. Say “forget everything” in the chat and it does."
        >
          <p className="hud-note">Research with sources, not legal advice. The family approves every draft and reminder; AIDaddy never sends, files or pays.</p>
        </Section>
      </main>
      <Footer repoUrl={repoUrl} />
    </div>
  );
}
