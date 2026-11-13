import type { Metadata } from "next";
import { AddBot } from "@/components/landing/add-bot";
import { ChatIllustration } from "@/components/landing/chat-illustration";
import { landingConfig } from "@/components/landing/config";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Privacy } from "@/components/landing/privacy";
import { Scorecard } from "@/components/landing/scorecard";
import { SiteFooter } from "@/components/landing/site-footer";
import { Trust } from "@/components/landing/trust";

const title = "Kaveri: the butler in your family group chat";
const description =
  "A butler in your family group chat. Silent until a life event comes up, then it researches the live web with Exa and posts a plan with a source on every line.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "Kaveri", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * Landing page. Static: the environment (see landingConfig) and src/data/scorecard.json
 * are read when the page is built, so a new scorecard or bot name shows after the next deploy.
 */
export default function Home() {
  const { botUsername, sampleCaseHref, repoUrl } = landingConfig();

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-10 sm:gap-20 sm:px-6 sm:py-14 lg:gap-24 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
          <Hero sampleCaseHref={sampleCaseHref} />
          <ChatIllustration caseHref={sampleCaseHref} className="max-w-md lg:max-w-none" />
        </div>
        <HowItWorks />
        <Trust />
        <AddBot username={botUsername} />
        <Scorecard />
        <Privacy />
      </main>
      <SiteFooter repoUrl={repoUrl} />
    </>
  );
}
