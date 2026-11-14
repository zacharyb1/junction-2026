import type { Metadata } from "next";
import Link from "next/link";
import { Core } from "@/components/site/core";
import { linkButtonClasses } from "@/components/site/link-button";
import { PageHead, Slash } from "@/components/site/page-head";
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
      <main className="site-wrap site-page">
        <PageHead
          label={
            <>
              Error
              <Slash />
              404
            </>
          }
          labelTone="amber"
          title="This page is not here."
          lede="If a link to a case file brought you here, the case is not stored on this server. It may have been removed, or it was researched on another one. The link is the only key to a case, so we cannot look it up for you."
          aside={<Core state="idle" />}
        >
          <div className="site-actions">
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
        </PageHead>
      </main>
    </SiteShell>
  );
}
