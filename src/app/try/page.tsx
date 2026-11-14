import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { TryForm } from "@/components/try-form";

const title = "Try AIDaddy in the browser";
const description =
  "Describe a life event, pick your country, and watch UKK research it on official sources with Exa.";

export const metadata: Metadata = {
  title,
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
        The same column and the same head as the case file and the chat with UKK.
        The shared badge is a pill; here it gets the site's crisp corner.
      */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14 [&_.rounded-4xl]:rounded-sm">
        <header className="flex flex-col gap-3">
          <p className="site-eyebrow">Try it live</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Try it on your own life</h1>
          <p className="leading-relaxed text-muted-foreground">
            The same engine UKK uses in the family chat. It searches the live web with Exa, official sites first, opens
            every page it cites, and keeps only what it can point at.
          </p>
        </header>
        <TryForm code={code} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Do not paste anything you would not show a stranger: this demo stores the case under an unguessable link.
        </p>
      </main>
    </SiteShell>
  );
}
