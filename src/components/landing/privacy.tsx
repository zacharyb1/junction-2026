import { Eraser, Eye, type LucideIcon, Scale } from "lucide-react";
import { Section } from "@/components/landing/section";

/**
 * Keep every line in this file true. What the bot reads, remembers and forgets follows hermes/SOUL.md
 * and the "Known limits" in hermes/README.md. The small print follows src/lib/verify.ts and docs/CONTRACTS.md.
 */
const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Eye,
    title: "What it reads",
    text: "The messages in the chats it has been added to, and the letters and photos shared there. That is how it notices a life event. It remembers household basics only: country, city, first names and open cases.",
  },
  {
    icon: Eraser,
    title: "“Forget everything”",
    text: "Say “forget everything” and it wipes what it remembers about your household and cancels its reminders. Published case files stay online, and so do logs on the machine that runs the bot.",
  },
  {
    icon: Scale,
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
      <ul className="grid gap-3 md:grid-cols-3">
        {POINTS.map((point) => (
          <li key={point.title} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <point.icon className="size-4" />
            </span>
            <h3 className="font-medium">{point.title}</h3>
            <p className="text-sm text-muted-foreground">{point.text}</p>
          </li>
        ))}
      </ul>
      <ul className="flex max-w-2xl list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        {SMALL_PRINT.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Section>
  );
}
