import type { Metadata } from "next";
import { AIDaddyChat } from "@/components/aidaddy-chat";
import { landingConfig } from "@/components/site/config";
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
  const link = "text-foreground underline underline-offset-4 hover:text-primary";
  return (
    <SiteShell>
      {/* The same column and the same head as /try and the case file. */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14">
        <header className="flex flex-col gap-3">
          <p className="site-eyebrow">One step ahead</p>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aidaddy-avatar.svg" alt="" width={48} height={48} className="size-12 rounded-full border" />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Talk to AIDaddy</h1>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Tell AIDaddy about a life event or an official letter, and it answers with a plan and quotes from official
            pages.
          </p>
        </header>
        <AIDaddyChat code={code} needsCode={demoCodeRequired()} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Prefer Telegram?{" "}
          <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer" className={link}>
            Add AIDaddy to your group
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          . Or{" "}
          <SiteLink href="/try" className={link}>
            run one research case
          </SiteLink>{" "}
          without the chat.
        </p>
      </main>
    </SiteShell>
  );
}
