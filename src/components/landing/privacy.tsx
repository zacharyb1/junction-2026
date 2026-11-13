import { Section } from "@/components/landing/section";

/**
 * Keep every line in this file true. What the bot reads, remembers and forgets follows hermes/SOUL.md
 * and the "Known limits" in hermes/README.md. The small print follows src/lib/verify.ts and docs/CONTRACTS.md.
 */
const POINTS: { title: string; text: string }[] = [
  {
    title: "What it reads",
    text: "The messages in the chats it has been added to, and the letters and photos shared there. That is how it notices a life event. It remembers household basics only: country, city, first names and open cases.",
  },
  {
    title: "“Forget everything”",
    text: "Say “forget everything” and it wipes what it remembers about your household and cancels its reminders. Published case files stay online, and so do logs on the machine that runs the bot.",
  },
  {
    title: "Research, not legal advice",
    text: "It finds official pages and quotes them. It can miss things, and rules change. Check the linked page before you act.",
  },
];

const SMALL_PRINT = [
  "A checked quote shows that the sentence is on the page. It does not show that the rule fits your exact situation.",
  "A case file is a web page with a random address. Anyone who has the link can open it.",
];

export function Privacy() {
  return (
    <Section
      id="privacy"
      title="Privacy and limits"
      hint="A bot that reads a family chat should be plain about what it does and where it stops."
    >
      <ul className="l-notices">
        {POINTS.map((point) => (
          <li key={point.title} className="l-notice">
            <h3>{point.title}</h3>
            <p>{point.text}</p>
          </li>
        ))}
      </ul>
      <ul className="l-small-print">
        {SMALL_PRINT.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Section>
  );
}
