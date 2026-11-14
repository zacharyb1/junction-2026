import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { ReadingPlate } from "@/components/landing/reading-plates";
import { InkReveal, ReadingMotion } from "@/components/landing/reading-motion";
import { planLines } from "@/components/landing/sample";
import { TryLink } from "@/components/landing/try-link";

const INK = ["wordmark-ink", "headline-highlight", "intro-ink", "sample-circle", "case-underline", "plan-highlight", "proof-bracket", "bracket-underline", "plan-arrow", "publisher-highlight", "source-highlight", "source-arrow", "divider"] as const;

/** Source-first reading is real text. The marks never carry information alone. */
export function Hero({ sampleCaseHref }: { sampleCaseHref: string | null }) {
  const line = planLines.find(item => item.source.n === 5)!;
  return (
    <section className="reading-hero" aria-labelledby="hero-title">
      <ReadingMotion>
        {INK.map(name => <ReadingPlate key={name} name={name} />)}
        <h1 id="hero-title" className="r-headline">Your family’s next<br />step, sourced.</h1>
        <p className="r-intro">The butler in your family group chat.</p>
        <p className="r-sample-label">Sample case</p>
        <h2 className="r-case-title">Expecting a baby</h2>
        <MapPin className="r-location-icon" aria-hidden="true" />
        <p className="r-location">Espoo, Finland</p>
        <h3 className="r-plan">{line.what}</h3>
        <span className="r-task-notation" aria-label="Source 5">5</span>
        <CalendarDays className="r-calendar" aria-hidden="true" />
        <p className="r-deadline">{line.when}</p>
        <span className="r-plan-label" aria-hidden="true">plan</span>
        <span className="r-bracket-label" aria-hidden="true">supported<br />by</span>
        <p className="r-publisher">5 · {line.source.publisher}</p>
        <blockquote className="r-source" cite={line.source.href}>“{line.source.quote}”</blockquote>
        <span className="r-source-label" aria-hidden="true">source</span>
        <span className="r-source-rule" aria-hidden="true" />
        <a className="r-source-link" href={line.source.href} target="_blank" rel="noreferrer">Read the source <ArrowRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
        <div className="r-try"><TryLink className="reading-action">Try it in the browser <ArrowRight aria-hidden="true" /></TryLink></div>
        <div className="r-sample-link">{sampleCaseHref ? <Link className="reading-action reading-action--secondary" href={sampleCaseHref}>View sample case</Link> : <a className="reading-action reading-action--secondary" href="#sample-plan">View sample plan</a>}</div>
        <h2 id="silent-title" className="r-next-title">Silent until it matters.</h2>
        <InkReveal className="r-next-underline"><ReadingPlate name="next-underline" className="reading-ink-inner" /></InkReveal>
        <p className="r-next-intro">A life event. Live research. A sourced plan.</p>
      </ReadingMotion>
    </section>
  );
}
