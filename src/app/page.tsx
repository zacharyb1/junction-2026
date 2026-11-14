import type { Metadata, Viewport } from "next";
import { landingConfig } from "@/components/landing/config";
import { Hero } from "@/components/landing/hero";
import { readingBody, readingDisplay, readingHand, readingSans } from "@/components/landing/fonts";
import { readingPaper } from "@/components/landing/reading-plates";
import "@/components/landing/landing.css";

import { AddBot } from "@/components/landing/add-bot";
import { ChatIllustration } from "@/components/landing/chat-illustration";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Privacy } from "@/components/landing/privacy";
import { Scorecard } from "@/components/landing/scorecard";
import { loadScorecard } from "@/components/landing/scorecard-data";
import { SiteFooter } from "@/components/landing/site-footer";
import { Trust } from "@/components/landing/trust";

const title = "AIDaddy: the butler in your family group chat";
const description = "A butler in your family group chat. Silent until a life event comes up, then it researches the live web with Exa and posts a plan with a source on every line.";
export const metadata: Metadata = { title, description, openGraph: { title, description, siteName: "AIDaddy", type: "website" }, twitter: { card: "summary_large_image", title, description } };
export const viewport: Viewport = { themeColor: "#fffaf1" };
/** Landing-only typography and material never escape this wrapper. */
export default async function Home() {
  const { botUsername, sampleCaseHref, repoUrl } = landingConfig();
  const card = await loadScorecard();
  return (
    <div className={`landing ${readingDisplay.variable} ${readingBody.variable} ${readingHand.variable} ${readingSans.variable}`} style={{ backgroundImage: `url(${readingPaper.src})` }}>
      <main>
        <Hero sampleCaseHref={sampleCaseHref} />
        <section id="sample-plan" className="l-story" aria-labelledby="silent-title">
          <div className="l-wrap">
            <div className="l-story-intro">
              <p>Built first for international families in Finland, who deal with Kela, Vero and landlords in a language they do not read.</p>
              <p>It reads along and says nothing, until someone mentions a life event. Then it researches the live web with Exa and posts a short plan: what to do, by when, and what you are entitled to. Every line carries a source you can check.</p>
              <p>Twelve countries have a checked list of official sites. Elsewhere it searches the open web and labels every source.</p>
            </div>
            <ChatIllustration caseHref={sampleCaseHref} />
            <nav className="l-contents" aria-label="Explore AIDaddy">
              <a href="#how-it-works">How it works</a><a href="#trust">Why trust it</a><a href="#scorecard">Scorecard</a><a href="#privacy">Privacy & limits</a>
            </nav>
          </div>
        </section>
        <HowItWorks />
        <Trust />
        <AddBot username={botUsername} />
        <Scorecard card={card} />
        <Privacy />
      </main>
      <SiteFooter repoUrl={repoUrl} />
    </div>
  );
}
