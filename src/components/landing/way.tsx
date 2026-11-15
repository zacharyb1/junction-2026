import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, type ArrowDirection } from "@/components/landing/glyphs";
import { cn } from "@/lib/utils";

type Look = { tone?: "white" | "primary"; panel?: boolean };
export function wayClasses({ tone = "white" }: Look = {}, className?: string) {
  return cn("l-action", tone === "primary" && "l-action--primary", className);
}
export function WayContent({ children, detail, dir = "right" }: {
  children: ReactNode; detail?: ReactNode; dir?: ArrowDirection;
}) {
  return <><span>{children}{detail && <small className="l-action-detail">{detail}</small>}</span><Arrow dir={dir} /></>;
}
/** Internal links keep client navigation; external actions announce their new tab. */
export function Way({ href, children, detail, dir, className, ...look }: Look & {
  href: string; children: ReactNode; detail?: ReactNode; dir?: ArrowDirection; className?: string;
}) {
  const content = <WayContent detail={detail} dir={dir ?? (href.startsWith("#") ? "down" : "right")}>{children}</WayContent>;
  if (href.startsWith("/") || href.startsWith("#")) return <Link href={href} className={wayClasses(look, className)}>{content}</Link>;
  return <a href={href} target="_blank" rel="noreferrer" className={wayClasses(look, className)}>{content}<span className="sr-only"> (opens in a new tab)</span></a>;
}
