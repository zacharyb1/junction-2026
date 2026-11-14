import Link from "next/link";
import { ExternalLink } from "lucide-react";
import examples from "@/data/example-cases.json";

type Stored = { label: string; situation: string; id: string; title: string; evidenceVerified: number; evidenceTotal: number };
const CASES = examples.cases as Stored[];
const MADE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/Helsinki" }).format(new Date(examples.generatedAt));

/**
 * Real cases the engine researched earlier for the demo's examples.
 * Shown when live research is not available, so the demo can go on. Always labelled with their date:
 * a stored case is never presented as a live result.
 */
export function EarlierCases({ situation, failed }: { situation: string; failed: boolean }) {
  if (!CASES.length) return null;
  const match = CASES.find((c) => c.situation.trim() === situation.trim());
  const row = (c: Stored) => (
    <li key={c.id}>
      <Link href={`/c/${c.id}`} target="_blank" className="inline-flex items-center gap-1 font-medium hover:underline">
        {c.label}: {c.title} <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
      <span className="text-muted-foreground">
        {" "}
        · {c.evidenceVerified} of {c.evidenceTotal} quotes found
      </span>
    </li>
  );

  if (failed) {
    return (
      <div className="rounded-lg border bg-muted/50 p-3 text-sm">
        <p className="font-medium">Live research is not available right now.</p>
        <p className="mt-1 text-muted-foreground">
          {match ? `Here is the case we researched for this example on ${MADE}:` : `These cases were researched on ${MADE} with the same engine:`}
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">{(match ? [match] : CASES).map(row)}</ul>
      </div>
    );
  }
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">See results researched earlier ({MADE})</summary>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm text-foreground">{CASES.map(row)}</ul>
    </details>
  );
}
