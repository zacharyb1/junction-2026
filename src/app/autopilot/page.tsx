import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AutopilotDemo } from "@/components/autopilot/autopilot-demo";
import { Footer, Section, Wordmark } from "@/components/hud/sections";
import { landingConfig } from "@/components/landing/config";
import "@/components/hud/hud.css";

const title = "AIDaddy autopilot: a demo of proactive help";
const description =
  "A demo of specialist agents that notice a situation and propose a next step. The script is fixed, the lawyer's check runs on official sources with Exa, and nothing is sent.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#05080d" };

export default async function Autopilot({ searchParams }: PageProps<"/autopilot">) {
  const { repoUrl } = landingConfig();
  // The same access code as /try. With it, the lawyer's step runs a live check.
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";

  return (
    <div className="hud">
      <header className="hud-wrap">
        <nav className="hud-top" aria-label="Main">
          <Link href="/" aria-label="AIDaddy home">
            <Wordmark />
          </Link>
          <Link href="/setup" className="hud-top-link">
            Set it up
          </Link>
        </nav>
      </header>
      <main>
        <Section
          id="autopilot"
          index="A1"
          label="Demo"
          title="One step ahead, with the family in control."
          lede="Specialist agents each keep their own context. The orchestrator routes a situation to the right ones, and nothing happens until the family says yes."
        >
          <AutopilotDemo code={code} />
        </Section>
      </main>
      <Footer repoUrl={repoUrl} />
    </div>
  );
}
