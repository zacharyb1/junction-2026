import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Arrow, type ArrowDirection } from "@/components/landing/glyphs";
import { cn } from "@/lib/utils";

type Look = {
  /** "primary" is the black row with the yellow arrow: one per screen. */
  tone?: "white" | "primary" | "blue" | "yellow";
  /** A row that stands alone inside a section gets corners. Rows on the overhead sign run edge to edge. */
  panel?: boolean;
};

/** Which way the arrow moves when the row is hovered or pressed. */
const TRAVEL: Record<ArrowDirection, { x: number; y: number }> = {
  right: { x: 1, y: 0 },
  "up-right": { x: 1, y: -1 },
  down: { x: 0, y: 1 },
};

/**
 * A direction row: the landing page's link that acts like a button. A label on the left and an
 * arrow square on the right, like one line of a station sign. Use the classes on any link,
 * for example <TryLink>, and put <WayContent> inside it.
 */
export function wayClasses({ tone = "white", panel = false }: Look = {}, className?: string) {
  return cn("l-way", tone !== "white" && `l-way--${tone}`, panel && "l-way--panel", className);
}

export function WayContent({
  children,
  detail,
  dir = "right",
}: {
  children: ReactNode;
  /** A second, smaller line under the label. */
  detail?: ReactNode;
  dir?: ArrowDirection;
}) {
  const travel = { "--dx": TRAVEL[dir].x, "--dy": TRAVEL[dir].y } as CSSProperties;
  return (
    <>
      <span className="l-way-label">
        <span>{children}</span>
        {detail && <span className="l-way-detail">{detail}</span>}
      </span>
      <span className="l-way-arrow" style={travel}>
        <Arrow dir={dir} />
      </span>
    </>
  );
}

/** Site paths and anchors use next/link. Everything else opens in a new tab and says so. */
export function Way({
  href,
  children,
  detail,
  dir,
  className,
  ...look
}: Look & { href: string; children: ReactNode; detail?: ReactNode; dir?: ArrowDirection; className?: string }) {
  const classes = wayClasses(look, className);

  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={classes}>
        <WayContent detail={detail} dir={dir ?? (href.startsWith("#") ? "down" : "right")}>
          {children}
        </WayContent>
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      <WayContent detail={detail} dir={dir ?? "up-right"}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </WayContent>
    </a>
  );
}
