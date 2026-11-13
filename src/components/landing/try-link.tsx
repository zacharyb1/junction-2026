"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const codeFromUrl = () => new URLSearchParams(window.location.search).get("code") ?? "";
const noCode = () => "";

/**
 * Link to the browser demo at /try.
 *
 * The demo asks for an access code, and /try reads it from ?code=... (the QR at the table carries it).
 * If the landing page itself was opened with that code, this link passes it on so nobody has to type it.
 * It is a client component because the page is static: only the browser knows the query string.
 * Without a code, or before the script loads, it is a plain link to /try.
 */
export function TryLink({ className, children }: { className?: string; children: ReactNode }) {
  const code = useSyncExternalStore(subscribe, codeFromUrl, noCode);
  return (
    <Link href={code ? `/try?code=${encodeURIComponent(code)}` : "/try"} className={className}>
      {children}
    </Link>
  );
}
