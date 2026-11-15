import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { TryForm } from "@/components/try-form";
import { demoCodeRequired } from "@/lib/cases";

const title = "Try AIDaddy in the browser";
const description =
  "Describe a life event, pick your country, and watch AIDaddy research it on official sources with Exa.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function TryPage({ searchParams }: PageProps<"/try">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return (
    <SiteShell>
      {/*
        The same column and the same head as the case file and the chat with AIDaddy.
        The shared badge is a pill; here it gets the site's crisp corner.
      */}
      <main className="task-page">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">What’s on your plate?</h1>
          <p className="leading-relaxed text-muted-foreground">
            The same engine AIDaddy uses in the family chat. It searches the live web with Exa, official sites first, opens
            every page it cites, and keeps only what it can point at.
          </p>
        </header>
        <TryForm code={code} needsCode={demoCodeRequired()} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Do not paste anything you would not show a stranger: this demo stores the case under an unguessable link.
        </p>
      </main>
    </SiteShell>
  );
}
