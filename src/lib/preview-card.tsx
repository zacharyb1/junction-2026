import type { ReactNode } from "react";

/**
 * Pieces shared by the link preview images (the opengraph-image files).
 * They are drawn by next/og, which lays out with flexbox only and draws with the one font it ships: Geist Regular.
 */

/**
 * The site's warm palette (src/components/site/site.css) as hex, because the renderer does not read CSS variables.
 * A case link posted in a chat shows this card, so it is drawn in the same colours as the page it opens.
 */
export const tone = {
  background: "#fffaf1",
  foreground: "#211b1d",
  primary: "#98112c",
  primaryForeground: "#fffaf1",
  muted: "#f5ecdd",
  // The site's dim text. A preview is shown small, and this is more than 6:1 on the ground.
  soft: "#65544e",
  // The site's warm paper rule.
  border: "#dfcdb8",
  // The green and amber of the badges on the case page, as text on a light tint of themselves.
  found: { background: "#e8eee3", text: "#38604a" },
  open: { background: "#f5ecdd", text: "#86551b" },
};

/** Line height and tracking of a large heading. */
export const heading = { lineHeight: 1.12, letterSpacing: "-0.025em" };

// Everything outside the glyphs of Geist Regular: Latin with its accents (ä, ö, å, š), Cyrillic,
// and the common dashes, quotes and currency signs.
const NO_GLYPH =
  /[^ -~¡-¬®-ēĖ-īĮ-ķĹ-ľŁ-ňŊ-ōŐ-žЀ-џҐ-ғ–—‘-‚“-„…€]/g;

/**
 * Text as the bundled font can draw it. For any other character the renderer would send the text to
 * a font service at request time, and a failed download breaks the image. An emoji or another script
 * is dropped instead: a case title is family data and stays on this server.
 */
export const printable = (text: string) => text.normalize("NFC").replace(NO_GLYPH, " ").replace(/\s+/g, " ").trim();

/** Lucide's concierge bell on a cranberry tile, then the name with "AI" in the accent colour, as in the site's header. */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 60,
          height: 60,
          borderRadius: 16,
          background: tone.primary,
        }}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tone.primaryForeground}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z" />
          <path d="M20 16a8 8 0 1 0-16 0" />
          <path d="M12 4v4" />
          <path d="M10 4h4" />
        </svg>
      </div>
      <div style={{ display: "flex", fontSize: 44, letterSpacing: "-0.02em" }}>
        <span style={{ color: tone.primary }}>AI</span>
        <span>Daddy</span>
      </div>
    </div>
  );
}

/** Warm card with the wordmark on top and the promise at the bottom. `aside` sits opposite the wordmark. */
export function PreviewCard({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "52px 64px 44px",
        background: tone.background,
        color: tone.foreground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
        <Wordmark />
        {aside}
      </div>
      {children}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${tone.border}`,
          paddingTop: 22,
          fontSize: 28,
          color: tone.soft,
        }}
      >
        <span>Research with sources, not legal advice</span>
        <span>Found with Exa</span>
      </div>
    </div>
  );
}
