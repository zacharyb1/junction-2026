import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Look = {
  variant?: "default" | "outline" | "secondary";
  /** "cta" is a taller target for the main calls to action. */
  size?: "default" | "cta";
};

/**
 * The classes that make a link look like a button.
 *
 * The shared Button is a Base UI button. It forces button semantics and logs an error in
 * development when it is rendered as a link. Base UI's advice for links is to style the
 * <a> directly, so this hands out the same class recipe for use on a real link.
 */
export function linkButtonClasses({ variant = "default", size = "default" }: Look = {}, className?: string) {
  return cn(buttonVariants({ variant, size: "lg" }), size === "cta" && "h-11 px-5 text-base", className);
}

/** A link that looks like a button. Site paths use next/link, everything else opens in a new tab. */
export function LinkButton({
  href,
  children,
  className,
  ...look
}: Look & { href: string; children: ReactNode; className?: string }) {
  const classes = linkButtonClasses(look, className);

  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
