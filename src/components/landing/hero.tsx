import { ChatIllustration } from "@/components/landing/chat-illustration";
import { Bell } from "@/components/landing/glyphs";
import type { Scorecard } from "@/components/landing/scorecard-data";
import { TryLink } from "@/components/landing/try-link";
import { Way, WayContent, wayClasses } from "@/components/landing/way";

/** The sections further down, as listed on a wide screen. Keep the names equal to the section titles. */
const DIRECTORY = [
  { href: "#how-it-works", name: "How it works" },
  { href: "#trust", name: "Why you can trust it" },
  { href: "#add-the-bot", name: "Add the bot" },
  { href: "#scorecard", name: "Scorecard" },
  { href: "#privacy", name: "Privacy and limits" },
];

/**
 * The overhead sign: name, promise and the ways in. Under it, the example chat, then who it is for
 * and the promise in full.
 * The sample case row hides when no sample case is configured, the scorecard row when there is no run yet.
 */
export function Hero({
  sampleCaseHref,
  totals,
}: {
  sampleCaseHref: string | null;
  totals: Scorecard["totals"] | null;
}) {
  return (
    <section aria-labelledby="hero-title">
      <div className="l-sign">
        <div className="l-wrap">
          <div className="l-id">
            <p className="l-name">
              <span className="l-mark">
                <Bell />
              </span>
              Kaveri <span className="l-gloss">Finnish for “buddy”</span>
            </p>
            <nav aria-label="On this page" className="l-nav">
              {DIRECTORY.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.name}
                </a>
              ))}
            </nav>
          </div>

          <h1 id="hero-title">The butler that lives in your family group chat.</h1>

          <div className="l-sign-row">
            {/* The page description's own sentence. The longer paragraph follows the example below. */}
            <p className="l-lead">
              <strong>Silent</strong> until a life event comes up, then it researches the live web with Exa and posts
              a plan with <strong>a source on every line</strong>.
            </p>
            <ul className="l-ways">
              <li>
                <TryLink className={wayClasses({ tone: "primary" })}>
                  <WayContent>Try it in the browser</WayContent>
                </TryLink>
              </li>
              {sampleCaseHref && (
                <li>
                  <Way href={sampleCaseHref}>See a sample case file</Way>
                </li>
              )}
              {totals && (
                <li>
                  <Way
                    href="#scorecard"
                    detail={`${totals.passed}/${totals.scenarios} scenarios passed · ${totals.verifiedQuotes}/${totals.totalQuotes} quotes verified`}
                  >
                    Scorecard
                  </Way>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="l-wrap l-hero-body">
        <ChatIllustration caseHref={sampleCaseHref} />
        <div className="l-pitch">
          <p className="l-pitch-main">
            Built first for international families in Finland, who deal with Kela, Vero and landlords in a language
            they do not read.
          </p>
          <div className="l-pitch-for">
            <p>
              It reads along and <strong>says nothing</strong>, until someone mentions a life event. Then it
              researches the live web with Exa and posts a short plan: what to do, by when, and what you are entitled
              to. Every line carries <strong>a source you can check</strong>.
            </p>
            <p>
              Twelve countries have a checked list of official sites. Elsewhere it searches the open web and labels
              every source.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
