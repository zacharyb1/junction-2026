"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAccessCode, withCode } from "@/components/site/access-code";

/**
 * Link to the browser demo at /try.
 *
 * The demo asks for an access code, and /try reads it from ?code=... (the QR at the table carries it).
 * If this tab was opened with that code, on this page or an earlier one, the link passes it on so nobody has to
 * type it. It is a client component because the page is static: only the browser knows the query string.
 * Without a code, or before the script loads, it is a plain link to /try.
 */
export function TryLink({ className, children }: { className?: string; children: ReactNode }) {
  const code = useAccessCode();
  return (
    <Link href={withCode("/try", code)} className={className}>
      {children}
    </Link>
  );
}
