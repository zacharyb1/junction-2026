import type { Metadata, Viewport } from "next";
import { SetupPanel } from "@/components/hud/setup-panel";
import { Core } from "@/components/site/core";
import { PageHead, Slash } from "@/components/site/page-head";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/hud/hud.css";

const title = "Get your own AIDaddy";
const description =
  "Connect AIDaddy to your Telegram group, let it listen on your phone or laptop, and add it to your browser. Each connection is your choice.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

/**
 * Get your own AIDaddy: the three connections a household can switch on. It began as a mockup (issue #42);
 * now each card leads to something that works, and says how far it goes.
 */
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
                Three connections
              </>
            }
            title="Get your own AIDaddy."
            lede="Connect what AIDaddy may follow: your group chat, the talk in the room, the page in your browser. The more it follows, the sooner it can step in without being asked. Nothing switches on without you, and you can switch any of it off again."
            aside={<Core state="idle" />}
          />

          <SetupPanel />

          <div className="hud-setup-footer">
            <p className="hud-note">
              The Telegram chat runs on our server. Listening runs as a web page on the device where you start it, and stops
              when that page is closed. The browser extension runs in your own browser and is a first version. All three
              look things up and show them: AIDaddy never sends, files, books or pays. It is an independent hackathon
              project, not an official service.
            </p>
            <p className="hud-note">
              You can also <SiteLink href="/chat">talk to AIDaddy on the web</SiteLink>.
            </p>
          </div>

          {/*
            Keep every line true. What the bot reads, remembers and forgets follows hermes/SOUL.md and the "Known limits"
            in hermes/README.md. What is heard follows src/lib/listen.ts and the /listen page; what the extension reads
            follows extension/README.md. The small print follows src/lib/verify.ts and docs/CONTRACTS.md.
          */}
          <section id="privacy" className="site-section" aria-labelledby="privacy-title">
            <div className="site-section-head">
              <h2 id="privacy-title" className="site-h2">Privacy and limits</h2>
              <p className="site-note">A butler that reads, listens and looks should be plain about what it does and where it stops.</p>
            </div>
            <ul className="hud-rules">
              <li>
                <h3>What it reads</h3>
                <p>The messages in the chats it has been added to, and the letters and photos shared there. That is how it notices a life event. It remembers household basics only: country, city, first names and open cases.</p>
              </li>
              <li>
                <h3>What it hears</h3>
                <p>Only while the listening page is open. Your browser turns the sound into text with its maker&apos;s speech service; our server receives no sound. Small talk stays on the page. The sentences it notices are sent as one research question.</p>
              </li>
              <li>
                <h3>What it sees in the browser</h3>
                <p>The page you have open, never what you type, never a page with a password or payment field. An ordinary page is read on your computer and nothing is sent. A page about life admin sends its address, title, field labels and first 500 characters as one research question.</p>
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
