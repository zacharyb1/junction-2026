import { cn } from "@/lib/utils";

/**
 * The landing page's whole icon set. Each glyph is drawn on a 24 unit grid with one stroke
 * weight and square ends, the way arrows are drawn on a station sign. All are decoration:
 * the text next to them carries the meaning.
 */
type GlyphProps = { className?: string };

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const;

export type ArrowDirection = "right" | "up-right" | "down";

const TURN: Record<ArrowDirection, string> = { right: "0deg", "up-right": "-45deg", down: "90deg" };

/** Right: a page of this site. Up and right: leaves the site. Down: further down this page. */
export function Arrow({ dir = "right", className }: GlyphProps & { dir?: ArrowDirection }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("l-glyph", className)} style={{ rotate: TURN[dir] }}>
      <path d="M3.5 12h16M13 5.5l6.5 6.5-6.5 6.5" {...STROKE} />
    </svg>
  );
}

export function Check({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("l-glyph", className)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" {...STROKE} />
    </svg>
  );
}

export function Cross({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("l-glyph", className)}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...STROKE} />
    </svg>
  );
}

/** An exclamation mark: something here needs the reader's attention. */
export function Attention({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("l-glyph", className)}>
      <path d="M12 5.5v8" {...STROKE} />
      <rect x="10.5" y="17" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

/** A service bell, the pictogram for a desk where someone helps you. Kaveri's mark. */
export function Bell({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("l-glyph", className)} fill="currentColor">
      <rect x="10.5" y="4" width="3" height="3" />
      <path d="M4.5 16a7.5 7.5 0 0 1 15 0z" />
      <rect x="3" y="17.5" width="18" height="2.5" />
    </svg>
  );
}
