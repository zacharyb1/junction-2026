import { ArrowUpRight, ConciergeBell, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The plan below is copied from src/data/sample-case.json: the case title, three of its steps
 * (title and deadline) and the citation number each step carries on the case page. The lines are
 * laid out the way the engine writes plan lines for the chat: "what: by when [n]".
 * The acknowledgement is the line from hermes/skills/butler/life-event-butler/SKILL.md.
 * Only the two lines of small talk are invented. Keep it that way when you edit.
 */
const PLAN_TITLE = "Expecting a baby: what to do and when";
const PLAN: { what: string; when: string; source: number }[] = [
  { what: "Book the maternity clinic check-up", when: "before the end of month 4", source: 1 },
  { what: "Apply for the maternity grant from Kela", when: "2 months before the due date", source: 3 },
  { what: "Tell both employers about parental leave", when: "2 months before leave begins", source: 5 },
];

const BUBBLE = {
  /** Someone else in the group. */
  other: "rounded-tl-sm bg-muted",
  /** The person holding the phone. */
  self: "rounded-tr-sm bg-primary text-primary-foreground",
  /** Kaveri. */
  bot: "rounded-tl-sm border bg-background",
} as const;

function Message({
  from,
  kind,
  hideSender = false,
  children,
}: {
  from: string;
  kind: keyof typeof BUBBLE;
  /** For the second message in a row from the same sender. Screen readers still get the name. */
  hideSender?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={cn("flex flex-col gap-1", kind === "self" ? "items-end" : "items-start")}>
      <p className={cn("flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground", hideSender && "sr-only")}>
        {kind === "bot" && <ConciergeBell className="size-3.5" />}
        {from}
      </p>
      <div className={cn("max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", BUBBLE[kind])}>{children}</div>
    </li>
  );
}

/** A stage direction between messages. It explains the scene and is not part of the chat. */
function Note({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
      <span aria-hidden className="h-px flex-1 bg-border" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </li>
  );
}

function SourceChip({ n }: { n: number }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">
      <span className="sr-only">source </span>
      {n}
    </span>
  );
}

/**
 * A static picture of the product, built from HTML so it stays sharp and readable.
 * With a sample case configured, "Open case file" is a real link to that case.
 */
export function ChatIllustration({ caseHref, className }: { caseHref: string | null; className?: string }) {
  const chip =
    "inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground";

  return (
    <figure aria-labelledby="chat-example-caption" className={cn("flex w-full flex-col gap-3", className)}>
      <div className="overflow-hidden rounded-2xl bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Users className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-tight font-medium">Family</p>
            <p className="text-xs text-muted-foreground">Anna, Mikko and Kaveri</p>
          </div>
          <Badge variant="outline">Example</Badge>
        </div>

        <ol className="flex flex-col gap-3 p-4">
          <Message from="Mikko" kind="other">
            Bus is late again. Home around six.
          </Message>
          <Message from="Anna" kind="self">
            No rush. I&apos;ll start dinner.
          </Message>
          <Note>Small talk. Kaveri stays silent.</Note>

          <Message from="Anna" kind="self">
            I&apos;m pregnant!
          </Message>
          <Note>A life event. Kaveri steps in.</Note>

          <Message from="Kaveri" kind="bot">
            On it, checking official sources for Finland.
          </Message>
          <Message from="Kaveri" kind="bot" hideSender>
            <p className="font-medium">{PLAN_TITLE}</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted-foreground">
              {PLAN.map((line) => (
                <li key={line.source}>
                  <span className="font-medium">{line.what}:</span> {line.when}
                  {/* A non-breaking space keeps the number on the same line as the last word. */}
                  {"\u00a0"}
                  <SourceChip n={line.source} />
                </li>
              ))}
            </ol>
            <p className="mt-3 mb-1">
              {caseHref ? (
                <Link href={caseHref} className={cn(chip, "hover:bg-muted")}>
                  Open case file <ArrowUpRight className="size-3.5" />
                </Link>
              ) : (
                <span className={chip}>
                  Open case file <ArrowUpRight className="size-3.5" />
                </span>
              )}
            </p>
          </Message>
        </ol>
      </div>

      <figcaption id="chat-example-caption" className="text-center text-xs text-pretty text-muted-foreground">
        Example conversation. The plan and its source numbers come from our sample case file.
      </figcaption>
    </figure>
  );
}
