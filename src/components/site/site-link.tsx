"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAccessCode, withCode } from "@/components/site/access-code";

/**
 * A link to another page of the site.
 * It hands the demo's access code on to the pages that ask for one (/try, /chat, /autopilot), so a visitor who
 * scanned the QR at the table never has to type it. Without a code, or before the script loads, it is a plain link.
 */
export function SiteLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
  "aria-label"?: string;
}) {
  const code = useAccessCode();
  return (
    <Link href={withCode(href, code)} className={className} {...rest}>
      {children}
    </Link>
  );
}
