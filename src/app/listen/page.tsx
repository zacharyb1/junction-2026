import type { Metadata, Viewport } from "next";
import { ListenPost } from "@/components/listen/listen-post";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import { demoCodeRequired } from "@/lib/cases";
import "@/components/hud/hud.css";
import "@/components/listen/listen.css";

const title = "Let AIDaddy listen";
const description =
  "Leave this page open on a phone or a laptop. AIDaddy hears the household, researches a life event on its own, and comes back with a call or a ping.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#fffaf1" };

// Whether the demo asks for a code is the server's setting at the time of the visit, not at build time.
export const dynamic = "force-dynamic";

/**
 * The listening post: the closest a web page gets to an assistant that is always in the room.
 * Pressing Start makes this device listen. The page says what it hears, what it sends, and what it cannot do.
 */
export default function ListenPage() {
  return (
    <SiteShell>
      <div className="hud">
        <main className="hud-wrap listen-page">
          <header className="listen-page-head">
            <h1 className="hud-title">A little help, within earshot.</h1>
            <p className="hud-lede">
              Leave this page open on a phone or a laptop. AIDaddy follows the talk in the room and lets the small talk pass.
              When it hears a letter, a deadline, a life event or a plan that has rules, a desk looks up the official pages
              without being asked and comes back: a call when the plan has a deadline, a ping for everything else.
            </p>
            <p className="hud-note">A first version. It works while this page is open, in Chrome, Edge and Safari.</p>
          </header>

          <ListenPost needsCode={demoCodeRequired()} />

          <section className="listen-facts" aria-label="What it does and what it cannot do">
            <div>
              <h2>What happens to what it hears</h2>
              <ul>
                <li>
                  <strong>It listens only after you press Start,</strong> on this device, while this page is open and on
                  screen. A red dot shows it.
                </li>
                <li>
                  <strong>Your browser turns speech into text.</strong> Chrome and Edge use Google&apos;s speech service for
                  that, Safari uses Apple&apos;s. AIDaddy never receives sound.
                </li>
                <li>
                  <strong>Sentences are judged on this device.</strong> Only a sentence AIDaddy notices, with the two
                  sentences before and after it, goes to the research engine.
                </li>
                <li>
                  <strong>What it heard stays in this page</strong> and is gone when you close it. A researched matter is
                  stored as a case file under a link nobody can guess.
                </li>
                <li>
                  <strong>It hears everyone near the device.</strong> Tell the people in the room.
                </li>
              </ul>
            </div>
            <div>
              <h2>What it cannot do yet</h2>
              <ul>
                <li>
                  <strong>It is a web page, not an app.</strong> It stops when the screen locks or another app is in front.
                  It keeps the screen on where the browser allows that.
                </li>
                <li>
                  <strong>The call rings on this device.</strong> It cannot ring your phone number or reach your other
                  devices. A ping is a notification from this browser.
                </li>
                <li>
                  <strong>It needs Chrome, Edge or Safari.</strong> On some phones the browser beeps each time it starts
                  listening again.
                </li>
                <li>
                  <strong>At most five matters in half an hour,</strong> and the same matter not twice in twenty minutes, so a lively room cannot spend the research credit.
                </li>
                <li>
                  <strong>It never sends, files, books or pays.</strong> It researches and tells you. This is research with
                  sources, not legal advice.
                </li>
              </ul>
            </div>
          </section>

          <p className="hud-note">
            Prefer to ask one thing? <SiteLink href="/try">Try AIDaddy without setup</SiteLink>, or{" "}
            <SiteLink href="/setup">see everything AIDaddy may follow</SiteLink>.
          </p>
        </main>
      </div>
    </SiteShell>
  );
}
