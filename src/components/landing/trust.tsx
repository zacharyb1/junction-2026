import { BadgeCheck, CircleAlert, Hand, History, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Section } from "@/components/landing/section";
import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/i18n";

/** The marks below use the case page's own English labels, so the two pages cannot drift apart. */
const t = labels("en");

/** Same accent tints as the case page. The extra classes let a long badge wrap on a narrow phone. */
const BADGE = "h-auto min-h-5 max-w-full shrink whitespace-normal";
const GOOD = `${BADGE} bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200`;
const WARN = `${BADGE} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`;
const WARN_ICON = "mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400";

function TrustCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  /** A small specimen of what this looks like in a case file. */
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </span>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {/* flex-1 lets the specimen fill the card, so two cards in a row end on the same line. */}
      <div className="flex-1 rounded-lg border border-dashed p-3 text-sm">{children}</div>
    </li>
  );
}

/** One verification mark and what it means for the reader. */
function Mark({ tone, icon: Icon, label, children }: { tone: string; icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <dt className="max-w-full">
        <Badge className={tone}>
          <Icon /> {label}
        </Badge>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The specimens quote src/data/sample-case.json word for word: source 4 with its prior belief,
 * the first unverified item and the step that waits for approval.
 */
export function Trust() {
  return (
    <Section
      id="trust"
      title="Why you can trust it"
      hint="A language model can sound sure and still be wrong. So Kaveri shows where every line comes from, and says what it could not confirm. The examples below are from our sample case."
    >
      <ul className="grid gap-3 md:grid-cols-2">
        <TrustCard
          icon={BadgeCheck}
          title="Every quote is checked"
          text="The assistant does not grade its own work. Our server reads each cited page again, with its own request and through Exa, and looks for the quoted sentence. The result sits next to the quote."
        >
          <dl className="flex flex-col gap-3">
            <Mark tone={GOOD} icon={BadgeCheck} label={t.foundLive}>
              Our own request to the page found the sentence.
            </Mark>
            <Mark tone={GOOD} icon={BadgeCheck} label={t.foundExa}>
              Our own request could not confirm it, for example on a PDF. Exa&apos;s reading of the page has the
              sentence.
            </Mark>
            <Mark tone={WARN} icon={CircleAlert} label={t.notFound}>
              The line is taken out of the plan and listed as unverified.
            </Mark>
          </dl>
        </TrustCard>

        <TrustCard
          icon={History}
          title="Memory versus web"
          text="Before it searches, the assistant writes down what it expects from memory. Where the live page says something else, the case file shows both, and the page wins."
        >
          <dl className="flex flex-col gap-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">From memory</dt>
              <dd>
                Separate maternity, paternity and parental leave periods of different lengths, with most of the days
                going to the mother.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">On the live page</dt>
              <dd className="border-l-2 border-primary/40 pl-3 italic">
                “Both parents are entitled to half of the days, or 160 days, of the parental allowance period.”
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                InfoFinland, “Benefits for a family after a child is born”
              </dd>
            </div>
          </dl>
        </TrustCard>

        <TrustCard
          icon={CircleAlert}
          title="Gaps are listed, not hidden"
          text="No source, no number. What the assistant could not confirm goes on a list in the case file, next to the questions that are still open."
        >
          <p className="flex gap-2">
            <CircleAlert className={WARN_ICON} />
            <span>
              The amount of the cash benefit for this year. The Kela page says the value increased but I did not
              capture the figure, so I am not stating one.
            </span>
          </p>
        </TrustCard>

        <TrustCard
          icon={Hand}
          title="Nothing is sent without you"
          text="It writes the draft. You read it and approve with one tap in the chat. It never sends, files, books or pays on its own."
        >
          <div className="flex gap-2">
            <Hand className={WARN_ICON} />
            <div className="flex min-w-0 flex-col items-start gap-2">
              <p className="font-medium">Tell both employers about parental leave</p>
              <Badge className={WARN}>{t.approveInChat}</Badge>
            </div>
          </div>
        </TrustCard>
      </ul>
    </Section>
  );
}
