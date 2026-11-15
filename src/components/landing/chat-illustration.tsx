import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "@/components/landing/glyphs";
import { type PlanLine, planLines, planTitle } from "@/components/landing/sample";
import { WayContent, wayClasses } from "@/components/landing/way";
import { labels } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The link under a quote uses the case page's own label, so the two pages cannot drift apart. */
const t = labels("en");

/**
 * The plan line whose quote is open when the page loads. Source 5 is the one to show first: its sentence
 * is plain text on the page, so the link under it lands on the highlighted sentence, also on a phone.
 * Source 3 sits inside a folded section of its page, where the browser cannot scroll to it.
 */
const OPEN_SOURCE = 5;

/**
 * The plan, its source numbers and the quotes come from src/data/sample-case.json, see sample.ts.
 * The acknowledgement is the line from hermes/skills/butler/life-event-butler/SKILL.md.
 * Only the two lines of small talk are invented. Keep it that way when you edit.
 */
function Message({
  from,
  kind,
  smallTalk = false,
  children,
}: {
  from: string;
  kind: "other" | "self" | "bot";
  /** Small talk. A phone leaves these messages out and keeps their note, see .l-msg--small-talk. */
  smallTalk?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={cn(`l-msg l-msg--${kind}`, smallTalk && "l-msg--small-talk")}>
      <p className="l-from">{from}</p>
      <div className="l-bubble">{children}</div>
    </li>
  );
}

/** A stage direction between messages. It explains the scene and is not part of the chat. */
function Note({ children }: { children: ReactNode }) {
  return <li className="l-note">{children}</li>;
}

/**
 * One line of the plan. The whole row is the control: it opens the sentence the line is based on.
 * A native <details> needs no script, and the shared name lets one row be open at a time.
 */
function PlanRow({ line }: { line: PlanLine }) {
  const { source } = line;
  return (
    <li>
      <details name="kaveri-plan-source" open={source.n === OPEN_SOURCE}>
        <summary>
          <span className="l-plan-what">{line.what}</span>
          <span className="l-plan-when">{line.when}</span>
          <span className="l-num">
            <span className="sr-only">source </span>
            {source.n}
            <svg className="l-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path className="l-expand-vertical" d="M12 5v14" />
            </svg>
          </span>
        </summary>
        <div className="l-quote">
          <blockquote cite={source.href}>“{source.quote}”</blockquote>
          <p className="l-quote-source">
            <span>
              {source.publisher} · {source.host}
            </span>
            <a href={source.href} target="_blank" rel="noreferrer" className="l-link">
              {t.showOnPage}
              <Arrow dir="up-right" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </details>
    </li>
  );
}

/**
 * A picture of the product, built from HTML so it stays sharp and readable: a family chat where
 * small talk gets no reply and a life event gets a plan. With a sample case configured,
 * "Open case file" is a real link to that case.
 */
export function ChatIllustration({ caseHref, className }: { caseHref: string | null; className?: string }) {
  return (
    <figure aria-labelledby="chat-example-caption" className={className}>
      <div className="l-thread">
        <div className="l-thread-head">
          <p>
            <b>Family</b>
            <span>Anna, Mikko and AIDaddy</span>
          </p>
          <span className="l-tag">Example</span>
        </div>

        <div className="l-thread-body">
          <ol className="l-msgs">
            <Message from="Mikko" kind="other" smallTalk>
              Bus is late again. Home around six.
            </Message>
            <Message from="Anna" kind="self" smallTalk>
              No rush. I&apos;ll start dinner.
            </Message>
            <Note>Small talk. AIDaddy stays silent.</Note>

            <Message from="Anna" kind="self">
              I&apos;m pregnant!
            </Message>
            <Note>A life event. AIDaddy steps in.</Note>

            <Message from="AIDaddy" kind="bot">
              On it, checking official sources for Finland.
            </Message>
          </ol>

          {/* AIDaddy's second message. It sits beside the chat on a wide screen and under it on a phone. */}
          <div className="l-board">
            <p className="sr-only">AIDaddy</p>
            <div className="l-board-head">
              <p className="l-board-title">{planTitle}</p>
              {/* Names the number column for the eye. Each number already announces itself as a source. */}
              <p className="l-board-col" aria-hidden>
                Source
              </p>
            </div>
            <ol className="l-plan">
              {planLines.map((line) => (
                <PlanRow key={line.source.n} line={line} />
              ))}
            </ol>
            <p className="l-board-hint">Tap a line to read the sentence it is based on.</p>
            <div className="l-board-foot">
              {caseHref ? (
                <Link href={caseHref} className={wayClasses()}>
                  <WayContent>Open case file</WayContent>
                </Link>
              ) : (
                <p className="l-board-hint">The sample sources are available above.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <figcaption id="chat-example-caption" className="l-caption">
        Example conversation. The plan, its source numbers and the quotes come from our sample case file.
      </figcaption>
    </figure>
  );
}
