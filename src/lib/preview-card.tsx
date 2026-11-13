import type { ReactNode } from "react";

/**
 * Pieces shared by the link preview images (the opengraph-image files).
 * They are drawn by next/og, which lays out with flexbox only and draws with the one font it ships: Geist Regular.
 */

/** The light theme of src/app/globals.css as hex, because the renderer does not read OKLCH. */
export const tone = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#171717",
  primaryForeground: "#fafafa",
  muted: "#f5f5f5",
  // One step darker than muted-foreground: a preview is shown small, so the grey has to carry.
  soft: "#525252",
  border: "#e5e5e5",
  // The emerald and amber of the badges on the case page.
  found: { background: "#d1fae5", text: "#064e3b" },
  open: { background: "#fef3c7", text: "#78350f" },
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

/** Lucide's concierge bell on a dark tile, then the name: the same mark as on the landing page. */
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
      <span style={{ fontSize: 44, letterSpacing: "-0.02em" }}>Kaveri</span>
    </div>
  );
}

/** White card with the wordmark on top and the promise at the bottom. `aside` sits opposite the wordmark. */
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
