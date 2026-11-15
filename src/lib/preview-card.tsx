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
  background: "#fbf8f3",
  foreground: "#211b17",
  primary: "#b84f2a",
  primaryForeground: "#ffffff",
  muted: "#f1ebe2",
  // The site's dim text: 5.6:1 on the ground.
  soft: "#6b625b",
  // The site's hairline.
  border: "#e5dccf",
  // The green and honey of the badges on the case page, as text on a light tint of themselves.
  found: { background: "#e3f1e8", text: "#23744a" },
  open: { background: "#f6ead3", text: "#96600f" },
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

/**
 * The small mark of DESIGN.md, AIDaddy's face for small sizes (the same drawing as src/app/icon.svg): the orb in
 * peach, apricot, butter and rose. Passed as an image, so the renderer draws the gradients as they are.
 */
const MARK = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><radialGradient id="c" cx="0.74" cy="0.22" r="0.6"><stop offset="0" stop-color="#f59aa8"/><stop offset="1" stop-color="#f59aa8" stop-opacity="0"/></radialGradient><radialGradient id="b" cx="0.24" cy="0.76" r="0.6"><stop offset="0" stop-color="#ffb38a"/><stop offset="1" stop-color="#ffb38a" stop-opacity="0"/></radialGradient><radialGradient id="a" cx="0.7" cy="0.72" r="0.55"><stop offset="0" stop-color="#ffd76e"/><stop offset="1" stop-color="#ffd76e" stop-opacity="0"/></radialGradient><radialGradient id="s" cx="0.32" cy="0.26" r="0.42"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="16.0" cy="16.0" r="15.04" fill="#ffe3cf"/><circle cx="16.0" cy="16.0" r="15.04" fill="url(#c)"/><circle cx="16.0" cy="16.0" r="15.04" fill="url(#b)"/><circle cx="16.0" cy="16.0" r="15.04" fill="url(#a)"/><circle cx="16.0" cy="16.0" r="15.04" fill="url(#s)"/><circle cx="16.0" cy="16.0" r="15.04" fill="none" stroke="#e9a17f" stroke-opacity="0.55" stroke-width="0.64"/></svg>',
)}`;

/** The small mark at 60px, then the name with "AI" in the accent colour, as in the site's header. */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not a page */}
      <img src={MARK} width={60} height={60} alt="" />
      <div style={{ display: "flex", fontSize: 44, letterSpacing: "-0.02em" }}>
        <span style={{ color: tone.primary }}>AI</span>
        <span>Daddy</span>
      </div>
    </div>
  );
}

/** Dark card with the wordmark on top and the promise at the bottom. `aside` sits opposite the wordmark. */
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
