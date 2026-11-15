import { ArrowDown, ArrowRight, Check, ChevronDown, ExternalLink, Headphones, MessageCircle, Send } from "lucide-react";
import type { LandingConfig } from "@/components/landing/config";
import { ReadingPlate } from "@/components/landing/reading-plates";
import { caseLink, ranAt, type Scorecard } from "@/components/landing/scorecard-data";
import { SiteLink } from "@/components/site/site-link";
import { HeroMotion } from "./hero-motion";
import { SampleConversation } from "./sample-conversation";
import sample from "@/data/sample-case.json";


/** The same recorded cases are seeded on each deployment, so review links stay in this design. */
function recordedCaseLink(value: string | null | undefined) {
  const safe = caseLink(value);
  if (!safe) return null;
  const url = new URL(safe, "https://aidaddy.example");
  return /^\/c\/[A-Za-z0-9_-]{8,40}$/.test(url.pathname) ? url.pathname : safe;
}

export function WarmHome({ config, card }: { config: LandingConfig; card: Scorecard | null }) {
  return (
    <>
      <main className="warm-home">
        <HeroMotion>
          <div className="wh-promise">
            <h1 id="wh-title">A little help<br />with life’s<br /><span>bigger moments.<span className="wh-headline-ink" data-home-ink><ReadingPlate name="headline-highlight" /></span></span></h1>
            <p className="wh-role">The butler in your family group chat.</p>
            <p className="wh-intro">A new baby. A new home. A letter you don’t understand. AIDaddy finds what you need to do next, with sources you can read for yourself.</p>
            <div className="wh-actions">
              <SiteLink href="/try" className="wh-button">Try your own question <ArrowRight aria-hidden="true" size={19} /></SiteLink>
              <a href="#wh-plan" className="wh-text-link">Read an example <ArrowDown aria-hidden="true" size={16} /></a>
            </div>
            <p className="wh-small">Try it in your browser. No Telegram setup needed.</p>
          </div>
          <SampleConversation />
        </HeroMotion>
        <section id="wh-how" className="wh-how wh-wrap" aria-labelledby="wh-how-title">
          <div className="wh-section-intro"><h2 id="wh-how-title">For the things that<br />don’t come with instructions.</h2><p>Built first for international families in Finland, navigating Kela, Vero and everyday paperwork in a language they may not read.</p></div>
          <div className="wh-process">
            <article><h3>Start with your everyday chat.</h3><p>AIDaddy lets the small talk pass. When a life event comes up, it can research what matters to your family.</p></article>
            <article><h3>Find the official answer.</h3><p>It searches the live web with Exa, then opens the sources again to check the sentences it cites.</p></article>
            <article><h3>Decide what happens next.</h3><p>You get a short plan with dates and sources. You choose what to do. AIDaddy never sends, books, files or pays.</p></article>
          </div>
        </section>
        <section id="wh-plan" className="wh-plan-section" aria-labelledby="wh-plan-title">
          <div className="wh-wrap wh-plan-layout">
            <div className="wh-plan-intro"><h2 id="wh-plan-title">One less thing<br />to figure out alone.</h2><p>This sample plan is for a family expecting a baby in Espoo. Open any step to read the sentence behind it.</p><p className="wh-note">Every step has a source.</p><SiteLink href="/try" className="wh-text-link">Make a plan for your family <ArrowRight aria-hidden="true" size={17} /></SiteLink></div>
            <div className="wh-plan-document"><div className="wh-document-heading"><h3>Expecting a baby</h3><p>Sample plan · Espoo, Finland</p></div>
              {sample.steps.map((step, index) => {
                const evidence = sample.evidence.find((item) => item.n === step.evidence[0])!;
                return <details className="wh-plan-step" name="wh-sample-source" key={step.title} open={index === 3}>
                  <summary><span><strong>{step.title}</strong><small>{step.due ?? "Before applying"}</small></span><span className="wh-source-number">[{evidence.n}]</span><ChevronDown size={17} aria-hidden="true" /></summary>
                  <div className="wh-plan-evidence"><span>{evidence.publisher} · {evidence.title}</span><blockquote>“{evidence.quote}”</blockquote><a href={evidence.url} target="_blank" rel="noreferrer">Read the source <ExternalLink size={13} aria-hidden="true" /><span className="wh-sr"> (opens in a new tab)</span></a></div>
                </details>;
              })}
              <p className="wh-document-foot">A sample, not a personal recommendation. The dates depend on your family’s circumstances.</p>
            </div>
          </div>
        </section>
        <section className="wh-ways wh-wrap" aria-labelledby="wh-ways-title">
          <div className="wh-section-intro"><h2 id="wh-ways-title">A place in your<br />everyday life.</h2><p>Start with a question in your browser, bring AIDaddy into the family chat, or try a listening post at home.</p></div>
          <div className="wh-way-list">
            <SiteLink href="/chat" className="wh-way"><MessageCircle size={23} aria-hidden="true" /><span><strong>Have a conversation</strong><span>Ask a question, then work through the next steps together.</span></span><ArrowRight size={23} aria-hidden="true" /></SiteLink>
            <SiteLink href="/listen" className="wh-way"><Headphones size={23} aria-hidden="true" /><span><strong>Make room at the table</strong><span>Try the listening post on a device you leave open.</span></span><ArrowRight size={23} aria-hidden="true" /></SiteLink>
            <SiteLink href="/setup" className="wh-way"><Send size={23} aria-hidden="true" /><span><strong>Join the family chat</strong><span>Connect Telegram and see the other ways to get set up.</span></span><ArrowRight size={23} aria-hidden="true" /></SiteLink>
          </div>
        </section>
        <section id="wh-proof" className="wh-proof wh-wrap" aria-labelledby="wh-proof-title">
          <div className="wh-section-intro"><h2 id="wh-proof-title">You shouldn’t have<br />to take our word for it.</h2><p>A plan is only useful if you can check it. We publish the results of our live tests, including what didn’t work.</p></div>
          {card ? <>
            <div className="wh-test-summary"><p><strong>{card.totals.verifiedQuotes} of {card.totals.totalQuotes}</strong> cited quotes found on their pages.</p><p><strong>{card.totals.passed} of {card.totals.scenarios}</strong> test scenarios passed.</p><p className="wh-run-date">Recorded {ranAt(card.ranAt) ?? card.ranAt} Helsinki time.</p></div>
            <details className="wh-results"><summary>Read every test result <ChevronDown size={19} aria-hidden="true" /></summary><p className="wh-small">A pass checks source grounding, not completeness or whether a rule applies to you. These are recorded results; older case links may no longer be available. {card.label}</p><div className="wh-table-scroll"><table><caption className="wh-sr">Recorded live research test results</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Quotes found</th><th scope="col">Result</th><th scope="col">Case</th></tr></thead><tbody>{card.rows.map((row) => <tr key={row.id}><th scope="row">{row.title}{row.error ? <small>{row.error}</small> : null}</th><td>{row.verified}/{row.evidence}</td><td>{row.pass ? "Pass" : "Fail"}</td><td>{recordedCaseLink(row.url) ? <a href={recordedCaseLink(row.url)!} target="_blank" rel="noreferrer" aria-label={`Open ${row.title} case in a new tab`}>Read <ExternalLink size={12} aria-hidden="true" /></a> : "Unavailable"}</td></tr>)}</tbody></table></div></details>
          </> : <p>There isn’t a published test run available yet. You can still try a question and inspect its sources.</p>}
          <div className="wh-boundaries"><article><Check size={18} aria-hidden="true" /><h3>Clear about the gaps.</h3><p>If a figure cannot be confirmed, it stays out. If sources disagree, you see the disagreement.</p></article><article><Check size={18} aria-hidden="true" /><h3>Your family decides.</h3><p>Drafts and reminders need your approval. This is research with sources, not legal advice.</p></article></div>
        </section>
        <section className="wh-close" aria-labelledby="wh-close-title"><div className="wh-wrap"><h2 id="wh-close-title">What’s on your<br /><span>family’s mind?</span></h2><p>Start with one question. We’ll help you find the next step.</p><div className="wh-actions"><SiteLink href="/try" className="wh-button">Try your own question <ArrowRight size={19} aria-hidden="true" /></SiteLink>{config.botUsername ? <a className="wh-text-link" href={`https://t.me/${config.botUsername}`} target="_blank" rel="noreferrer">Open in Telegram <ExternalLink size={15} aria-hidden="true" /><span className="wh-sr"> (opens in a new tab)</span></a> : <SiteLink href="/setup" className="wh-text-link">Explore Telegram setup <ArrowRight size={16} aria-hidden="true" /></SiteLink>}</div></div></section>
      </main>
    </>
  );
}
