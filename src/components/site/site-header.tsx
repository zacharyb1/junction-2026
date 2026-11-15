"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { Wordmark } from "@/components/site/wordmark";

const NAV = [
  { href: "/demo", label: "See it work", under: ["/demo", "/autopilot"] },
  { href: "/chat", label: "Have a chat", under: ["/chat"] },
  { href: "/listen", label: "Listen together", under: ["/listen"] },
  { href: "/setup", label: "Set up", under: ["/setup"] },
  { href: "/try", label: "Make a plan", under: ["/try", "/c/"] },
];

export function SiteHeader() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <div className="site-wrap site-header-row">
        <Link href="/" className="site-brand" aria-label="AIDaddy home" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>
        <button ref={trigger} className="site-menu-toggle" type="button" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          {open ? "Close" : "Menu"}
        </button>
        <nav id="main-navigation" className="site-nav" data-open={open} aria-label="Main" onClick={(event) => {
          if ((event.target as Element).closest("a")) setOpen(false);
        }}>
          {NAV.map((item) => {
            const here = item.under.some((prefix) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
            return <SiteLink key={item.href} href={item.href} className={item.href === "/try" ? "site-nav-action" : undefined} aria-current={here ? "page" : undefined}>{item.label}</SiteLink>;
          })}
        </nav>
      </div>
    </header>
  );
}
