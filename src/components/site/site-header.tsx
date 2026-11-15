"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteLink } from "@/components/site/site-link";
import { Wordmark } from "@/components/site/wordmark";

/**
 * The four places a visitor can go. `under` lists the paths that count as being there. `short` is the label
 * below 380px, where the four full labels do not fit; the full one stays the link's accessible name.
 */
const NAV: { href: string; label: string; short?: string; under: string[] }[] = [
  { href: "/demo", label: "Demos", under: ["/demo", "/autopilot"] },
  { href: "/try", label: "Try AIDaddy without setup", under: ["/try", "/c/"] },
  { href: "/chat", label: "Talk to AIDaddy", short: "Talk", under: ["/chat"] },
  { href: "/setup", label: "Set up", under: ["/setup"] },
];

/** The same header on every page: the name leads home, four links lead everywhere else. */
export function SiteHeader() {
  const path = usePathname() ?? "";
  return (
    <header className="site-header">
      <div className="site-wrap site-header-row">
        <Link href="/" className="site-brand" aria-label="AIDaddy home">
          <Wordmark />
        </Link>
        <nav className="site-nav" aria-label="Main">
          {NAV.map((item) => {
            const here = item.under.some((prefix) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
            return (
              <SiteLink
                key={item.href}
                href={item.href}
                aria-current={here ? "page" : undefined}
                aria-label={item.short ? item.label : undefined}
              >
                {item.short ? (
                  <>
                    <span className="site-nav-full">{item.label}</span>
                    <span className="site-nav-short" aria-hidden="true">
                      {item.short}
                    </span>
                  </>
                ) : (
                  item.label
                )}
              </SiteLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
