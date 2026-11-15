import type { Metadata, Viewport } from "next";
import { SetupPanel } from "@/components/hud/setup-panel";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/hud/hud.css";

const title = "Set up AIDaddy";
const description = "Choose what AIDaddy may follow: your Telegram chat, the microphone of this device, and your browser.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#fffaf1" };

/** The setup screen (issue #42). Telegram and listening on this device are real; the browser extension is built but not published. The page says so. */
export default function SetupPage() {
  return (
    <SiteShell>
      <div className="hud">
        <main className="hud-wrap hud-setup">
          <header className="hud-setup-header">
            <div>
              <h1 className="hud-title hud-setup-h1">A place in your everyday life.</h1>
              <p className="hud-lede">
                Choose what AIDaddy may follow. Nothing switches on without you, and you can switch any of it off again.
              </p>
            </div>
          </header>

          <SetupPanel />

          <div className="hud-setup-footer">
            <p className="hud-note">
              Of these three, the Telegram chat and listening work today. Listening runs as a web page on the device where
              you start it, and stops when that page is closed. The browser extension is built but not published, so its
              connection is not available here yet. AIDaddy is an independent hackathon project, not an official service.
            </p>
            <p className="hud-note">
              You can also <SiteLink href="/chat">talk to AIDaddy on the web</SiteLink>.
            </p>
          </div>
        </main>
      </div>
    </SiteShell>
  );
}
