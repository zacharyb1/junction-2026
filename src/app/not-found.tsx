import type { Metadata } from "next";
import Link from "next/link";
import { linkButtonClasses } from "@/components/site/link-button";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "Page not found" };

/**
 * The page for an address that leads nowhere.
 * The likeliest way here is a link to a case file whose case is not in this server's store,
 * so the page says that first and then offers the ways back in.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <main className="site-wrap flex flex-1 flex-col justify-center gap-6 py-16 sm:py-24">
        <p className="site-eyebrow">Error 404</p>
        <h1 className="max-w-[16ch] text-4xl font-semibold tracking-tight text-balance sm:text-6xl">This page is not here.</h1>
        <p className="max-w-[58ch] text-lg text-muted-foreground">
          If a link to a case file brought you here, the case is not stored on this server. It may have been removed, or it
          was researched on another one. The link is the only key to a case, so we cannot look it up for you.
        </p>
        <div className="flex flex-wrap gap-3">
          <SiteLink href="/try" className={linkButtonClasses({ size: "cta" })}>
            Research your own question
          </SiteLink>
          <Link href="/demo" className={linkButtonClasses({ variant: "outline", size: "cta" })}>
            See AIDaddy at work
          </Link>
          <Link href="/" className={linkButtonClasses({ variant: "outline", size: "cta" })}>
            Front page
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
