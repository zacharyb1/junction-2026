import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AutopilotDemo } from "@/components/autopilot/autopilot-demo";
import { Section } from "@/components/hud/sections";
import { SiteShell } from "@/components/site/site-shell";
import { demoCodeRequired } from "@/lib/cases";
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
  // The lawyer's step runs a live check: with the same access code as /try, or for everyone where the demo is open.
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";

  return (
    <SiteShell>
      <div className="hud">
        <main>
          <Section
            id="autopilot"
            index="Demo"
            label="Scripted, with one live check"
            title="One step ahead, with the family in control."
            lede="UKK has specialists for law, money and travel, and each keeps its own notes. In this demo a situation goes to the ones that have something to add, and nothing happens until the family says yes."
            pageTitle
          >
            <AutopilotDemo code={code} needsCode={demoCodeRequired()} />
            <p className="hud-note hud-autopilot-after">
              What UKK may follow is the family&apos;s choice. <Link href="/setup">See the setup screen</Link>, a mockup.
            </p>
          </Section>
        </main>
      </div>
    </SiteShell>
  );
}
