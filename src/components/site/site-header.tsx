"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteLink } from "@/components/site/site-link";
import { Wordmark } from "@/components/site/wordmark";

/** The four places a visitor can go. `under` lists the paths that count as being there. */
const NAV = [
  { href: "/demo", label: "Demos", under: ["/demo", "/autopilot"] },
  { href: "/try", label: "Try AIDaddy without setup", under: ["/try", "/c/"] },
  { href: "/chat", label: "Talk to AIDaddy", under: ["/chat"] },
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
              <SiteLink key={item.href} href={item.href} aria-current={here ? "page" : undefined}>
                {item.label}
              </SiteLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
