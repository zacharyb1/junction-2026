import type { Metadata } from "next";
import { AIDaddyChat } from "@/components/aidaddy-chat";
import { landingConfig } from "@/components/site/config";
import { PageHead } from "@/components/site/page-head";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import { demoCodeRequired } from "@/lib/cases";

const title = "Talk to AIDaddy";
const description =
  "Tell AIDaddy about a life event or an official letter and get a plan with quotes from official pages.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function ChatPage({ searchParams }: PageProps<"/chat">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  // The same bot as on the front page when it is configured there; otherwise the team's bot.
  const bot = landingConfig().botUsername ?? "junction_kaveri_bot";
  return (
    <SiteShell>
      {/* The same wrap, head and split as /try and the case file: the work at the left, the orb at the right. */}
      <main className="site-wrap site-page">
        <div className="site-split site-split--three">
          <PageHead
            label="One step ahead"
            title="Talk to AIDaddy"
            lede="Tell AIDaddy about a life event or an official letter, and it answers with a plan and quotes from official pages."
          />
          <AIDaddyChat code={code} needsCode={demoCodeRequired()} />
          <p className="site-note">
            Prefer Telegram?{" "}
            <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer">
              Add AIDaddy to your group
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            . Or <SiteLink href="/try">run one research case</SiteLink> without the chat.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
