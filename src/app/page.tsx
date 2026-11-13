import type { Metadata, Viewport } from "next";
import { AddBot } from "@/components/landing/add-bot";
import { landingConfig } from "@/components/landing/config";
import { boardFont, signFont } from "@/components/landing/fonts";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Privacy } from "@/components/landing/privacy";
import { Scorecard } from "@/components/landing/scorecard";
import { loadScorecard } from "@/components/landing/scorecard-data";
import { SiteFooter } from "@/components/landing/site-footer";
import { Trust } from "@/components/landing/trust";
import "@/components/landing/landing.css";

const title = "Kaveri: the butler in your family group chat";
const description =
  "A butler in your family group chat. Silent until a life event comes up, then it researches the live web with Exa and posts a plan with a source on every line.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "Kaveri", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The phone's browser bar takes the colour of the overhead sign. Same value as --sign-yellow in landing.css. */
export const viewport: Viewport = { themeColor: "#ffd109" };

/**
 * Landing page. Static: the environment (see landingConfig) and src/data/scorecard.json
 * are read when the page is built, so a new scorecard or bot name shows after the next deploy.
 *
 * The .landing wrapper carries the page's own visual world (landing.css, DESIGN.md).
 * Nothing outside it changes, so /try and /c/[id] keep the shared look.
 */
export default async function Home() {
  const { botUsername, sampleCaseHref, repoUrl } = landingConfig();
  const card = await loadScorecard();

  return (
    <div className={`landing ${signFont.variable} ${boardFont.variable}`}>
      <main>
        <Hero sampleCaseHref={sampleCaseHref} totals={card?.totals ?? null} />
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
