import type { Metadata } from "next";
import Image from "next/image";
import { landingConfig } from "@/components/landing/config";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import { UkkChat } from "@/components/ukk-chat";
import { demoCodeRequired } from "@/lib/cases";

const title = "Talk to UKK";
const description =
  "UKK is Finland's FAQ for newcomers: tell him a life event or an official letter and get a plan with quotes from official pages.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function UkkPage({ searchParams }: PageProps<"/ukk">) {
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
          <p className="site-eyebrow">Finland&apos;s FAQ for newcomers</p>
          <div className="flex items-center gap-3">
            <Image src="/ukk-avatar.jpg" alt="" width={48} height={48} className="size-12 rounded-full border" priority />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Talk to UKK</h1>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            UKK is the butler of AIDaddy. Tell him about a life event or an official letter, and he answers with a plan and
            quotes from official pages.
          </p>
        </header>
        <UkkChat code={code} needsCode={demoCodeRequired()} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Prefer Telegram?{" "}
          <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer" className={link}>
            Add UKK to your group
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
