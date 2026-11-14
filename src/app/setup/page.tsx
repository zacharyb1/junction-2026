import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { SetupPanel } from "@/components/hud/setup-panel";
import "@/components/hud/hud.css";

const title = "Set up UKK";
const description = "Choose what UKK may follow: your Telegram chat today, your phone and browser as concepts.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "UKK", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** A mockup of the setup screen (issue #42). Only the Telegram channel is real; the page says so. */
export default function SetupPage() {
  return (
    <div className="hud">
      <main className="hud-wrap hud-setup">
        <header className="hud-setup-header">
          <Image src="/ukk-avatar.jpg" alt="" width={64} height={64} className="hud-setup-avatar" priority />
          <div>
            <p className="hud-label">Setup · mockup</p>
            <h1 className="hud-setup-h1">Give UKK eyes and ears.</h1>
            <p className="hud-lede">
              Choose what UKK may follow. Nothing switches on without you, and you can switch any of it off again.
            </p>
          </div>
        </header>

        <SetupPanel />

        <footer className="hud-setup-footer">
          <p className="hud-note">
            Only the Telegram chat works today. Phone and browser are concepts shown for discussion: switching them on here
            connects nothing. UKK is a made-up character, not an official service.
          </p>
          <p className="hud-note">
            <Link href="/">Back to the control room</Link> · <Link href="/ukk">Talk to UKK on the web</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
