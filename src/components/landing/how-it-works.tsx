import { Section } from "@/components/landing/section";

const STEPS: { title: string; text: string }[] = [
  {
    title: "Overhears",
    text: "It sits in your family group chat and reads along. Small talk gets no reply. A life event does: “I'm pregnant”, a photo of a rent-increase letter, “our flight got cancelled”.",
  },
  {
    title: "Researches with Exa",
    text: "It searches the live web with Exa, official sources first, pinned to your country and city. The answer comes from the page as it reads today, not from what a model remembers.",
  },
  {
    title: "Verifies every quote",
    text: "Every claim keeps the sentence it came from. Our server opens each cited page again and checks the sentence is really there. A step whose sentence is not on the page is left out, and a figure without a sentence is removed.",
  },
  {
    title: "Follows through",
    text: "The plan stays as a case file: one link with every step, deadline and source. A re-check opens each cited page again and reports a quote that is no longer there. Nothing is sent, filed, booked or paid without you.",
  },
];

/** The four stages in the order a family message follows. */
export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      title="How it works"
      hint="From one message in the chat to a plan you can check."
    >
      <ol className="l-line">
        {STEPS.map((step) => (
          <li key={step.title} className="l-stop">
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
