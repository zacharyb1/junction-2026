import type { Metadata, Viewport } from "next";
import { landingConfig } from "@/components/site/config";
import { loadScorecard } from "@/components/site/scorecard-data";
import { SiteShell } from "@/components/site/site-shell";
import { WarmHome } from "@/components/home/warm-home";
import "@/components/home/warm.css";

const title = "AIDaddy: a little help with life’s bigger moments";
const description = "A butler in your family’s group chat. AIDaddy finds the next steps for life’s bigger moments, with official sources you can read for yourself.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};
export const viewport: Viewport = { themeColor: "#fffaf1" };

export default async function Home() {
  return <SiteShell><WarmHome config={landingConfig()} card={await loadScorecard()} /></SiteShell>;
}
