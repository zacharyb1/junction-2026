import { BadgeCheck, BellRing, Ear, type LucideIcon, Search } from "lucide-react";
import { Section } from "@/components/landing/section";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Ear,
    title: "Overhears",
    text: "It sits in your family group chat and reads along. Small talk gets no reply. A life event does: “I'm pregnant”, a photo of a rent-increase letter, “our flight got cancelled”.",
  },
  {
    icon: Search,
    title: "Researches with Exa",
    text: "It searches the live web with Exa, official sources first, pinned to your country and city. The answer comes from the page as it reads today, not from what a model remembers.",
  },
  {
    icon: BadgeCheck,
    title: "Verifies every quote",
    text: "Every claim keeps the sentence it came from. Our server opens each cited page again and checks the sentence is really there. A step whose sentence is not on the page is left out, and a figure without a sentence is removed.",
  },
  {
    icon: BellRing,
    title: "Follows through",
    text: "The plan stays as a case file: one link with every step, deadline and source. A re-check opens each cited page again and reports a quote that is no longer there. Nothing is sent, filed, booked or paid without you.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" title="How it works" hint="From one message in the chat to a plan you can check.">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <step.icon className="size-4" />
              </span>
              {/* The list itself is ordered, so the printed number is decoration. */}
              <span aria-hidden className="font-mono text-xs text-muted-foreground">
                {i + 1} / {STEPS.length}
              </span>
            </div>
            <h3 className="font-medium">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
