import type { Metadata, Viewport } from "next";
import { SetupPanel } from "@/components/hud/setup-panel";
import { Core } from "@/components/site/core";
import { PageHead, Slash } from "@/components/site/page-head";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/hud/hud.css";

const title = "Set up AIDaddy";
const description = "Choose what AIDaddy may follow: your Telegram chat today, your phone and browser as concepts.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** A mockup of the setup screen (issue #42). Only the Telegram channel is real; the page says so. */
export default function SetupPage() {
  return (
    <SiteShell>
      <div className="hud">
        <main className="site-wrap site-page">
          <PageHead
            label={
              <>
                Setup
                <Slash />
                Mockup
              </>
            }
            title="Give AIDaddy eyes and ears."
            lede="Choose what AIDaddy may follow. Nothing switches on without you, and you can switch any of it off again."
            aside={<Core state="idle" />}
          />

          <SetupPanel />

          <div className="hud-setup-footer">
            <p className="hud-note">
              Of these three, only the Telegram chat works today. Phone and browser are concepts shown for discussion:
              switching them on here connects nothing. AIDaddy is an independent hackathon project, not an official service.
            </p>
            <p className="hud-note">
              You can also <SiteLink href="/chat">talk to AIDaddy on the web</SiteLink>.
            </p>
          </div>

          {/*
            Keep every line true. What the bot reads, remembers and forgets follows hermes/SOUL.md and the "Known limits"
            in hermes/README.md. The small print follows src/lib/verify.ts and docs/CONTRACTS.md.
          */}
          <section id="privacy" className="site-section" aria-labelledby="privacy-title">
            <div className="site-section-head">
              <h2 id="privacy-title" className="site-h2">Privacy and limits</h2>
              <p className="site-note">A bot that reads a family chat should be plain about what it does and where it stops.</p>
            </div>
            <ul className="hud-rules">
              <li>
                <h3>What it reads</h3>
                <p>The messages in the chats it has been added to, and the letters and photos shared there. That is how it notices a life event. It remembers household basics only: country, city, first names and open cases.</p>
              </li>
              <li>
                <h3>“Forget everything”</h3>
                <p>Say “forget everything” and it wipes what it remembers about your household. Published case files stay online, and so do logs on the machine that runs the bot.</p>
              </li>
              <li>
                <h3>Research, not legal advice</h3>
                <p>It finds official pages and quotes them. It can miss things, and rules change. Check the linked page before you act.</p>
              </li>
            </ul>
            <ul className="grid gap-2">
              <li className="site-note">A checked quote shows that the sentence is on the page. It does not show that the rule fits your exact situation.</li>
              <li className="site-note">A case file is a web page with a random address. Anyone who has the link can open it.</li>
            </ul>
          </section>
        </main>
      </div>
    </SiteShell>
  );
}
