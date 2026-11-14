import type { ReactNode } from "react";
import { Attention, Check, Cross } from "@/components/landing/glyphs";
import { approvalStep, firstGap } from "@/components/site/sample";
import { Section } from "@/components/landing/section";
import { labels } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The marks below use the case page's own English labels, so the two pages cannot drift apart. */
const t = labels("en");

const MARK = {
  /** The quote was found. */
  go: { className: "l-lamp--go", Glyph: Check },
  /** The quote was not found. */
  stop: { className: "l-lamp--stop", Glyph: Cross },
  /** Something the reader has to look at or decide. */
  attention: { className: "", Glyph: Attention },
} as const;

/** Keeps a figure and its unit on one line. The words are unchanged. */
const NBSP = "\u00a0";

/** A status line: a verification glyph, then the words. Colour is never the only signal. */
function Status({ tone, strong = false, children }: { tone: keyof typeof MARK; strong?: boolean; children: ReactNode }) {
  const { className, Glyph } = MARK[tone];
  return (
    <span className={cn("l-status", strong && "l-status--strong")}>
      <span className={cn("l-lamp", className)}>
        <Glyph />
      </span>
      <span>{children}</span>
    </span>
  );
}

/** One promise, with a specimen of what it looks like in a case file. */
function Claim({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <li className="l-claim">
      <div className="l-claim-text">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="l-specimen">{children}</div>
    </li>
  );
}

/**
 * Two specimens are read from src/data/sample-case.json (see sample.ts): the first unverified item and
 * the step that waits for approval. The "Two figures found" specimen is not in the sample case. It shows
 * the wording the case page uses, with made-up figures. Keep the section hint true when you edit.
 */
export function Trust() {
  return (
    <Section
      id="trust"
      title="Why you can trust it"
      hint="A language model can sound sure and still be wrong. So AIDaddy shows where every line comes from, and says what it could not confirm. The sample case and an explicitly labelled illustration show how this works."
    >
      <ul>
        <Claim
          title="Every quote is checked"
          text="The assistant does not grade its own work. Our server reads each cited page again, with its own request and through Exa, and looks for the quoted sentence. The result sits next to the quote."
        >
          <dl className="l-legend">
            <div>
              <dt>
                <Status tone="go" strong>
                  {t.foundLive}
                </Status>
              </dt>
              <dd>Our own request to the page found the sentence.</dd>
            </div>
            <div>
              <dt>
                <Status tone="go" strong>
                  {t.foundExa}
                </Status>
              </dt>
              <dd>
                Our own request could not confirm it, for example on a PDF. Exa&apos;s reading of the page has the
                sentence.
              </dd>
            </div>
            <div>
              <dt>
                <Status tone="stop" strong>
                  {t.notFound}
                </Status>
              </dt>
              <dd>The line is taken out of the plan and listed as unverified.</dd>
            </div>
          </dl>
        </Claim>

        <Claim
          title="When sources disagree"
          text="Two pages can give different figures for the same step, for example last year's rate and this year's. The case file shows both with their sources. It does not pick one for you in silence."
        >
          <p className="l-illustrative">Illustrative example</p>
          <dl className="l-fields">
            <div>
              <dt>Step</dt>
              <dd>Claim the tax credit for household expenses</dd>
            </div>
            <div>
              <dt>In the case file</dt>
              <dd>
                <Status tone="attention">
                  Two figures found: “35{NBSP}%” [2] and “40{NBSP}%” [5]. Check which one applies to you.
                </Status>
              </dd>
            </div>
          </dl>
        </Claim>

        <Claim
          title="Gaps are listed, not hidden"
          text="No source, no number. What the assistant could not confirm goes on a list in the case file, next to the questions that are still open."
        >
          <Status tone="attention">{firstGap}</Status>
        </Claim>

        <Claim
          title="Nothing is sent without you"
          text="AIDaddy researches and prepares. It never sends, files, books or pays on its own. A step that needs your decision is marked and waits for you."
        >
          <Status tone="attention" strong>
            {approvalStep}
          </Status>
          <p className="l-decision-note">
            <span className="l-chip">Needs your decision</span>
          </p>
        </Claim>
      </ul>
    </Section>
  );
}
