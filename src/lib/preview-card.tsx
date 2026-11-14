import type { ReactNode } from "react";

/**
 * Pieces shared by the link preview images (the opengraph-image files).
 * They are drawn by next/og, which lays out with flexbox only and draws with the one font it ships: Geist Regular.
 */

/**
 * The site's dark palette (src/components/site/site.css) as hex, because the renderer does not read CSS variables.
 * A case link posted in a chat shows this card, so it is drawn in the same colours as the page it opens.
 */
export const tone = {
  background: "#05080d",
  foreground: "#e6f1ff",
  primary: "#4fd8ff",
  primaryForeground: "#03131c",
  muted: "#0e1a28",
  // The site's dim text. A preview is shown small, and this is 9:1 on the ground.
  soft: "#9db0c9",
  // The site's hairline, cyan at 18%, mixed onto the ground.
  border: "#122d39",
  // The green and amber of the badges on the case page, as text on a dark tint of themselves.
  found: { background: "#0c2b22", text: "#3ddc97" },
  open: { background: "#33260f", text: "#ffb547" },
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
 * The small mark of DESIGN.md, AIDaddy's face for small sizes (the same drawing as src/app/icon.svg): one broken ring,
 * a soft heart and a white centre on the ground. Passed as an image, so the renderer draws the gradient as it is.
 */
const MARK = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<defs><radialGradient id="g"><stop offset="0" stop-color="#e6f9ff"/><stop offset="0.35" stop-color="#4fd8ff"/>' +
    '<stop offset="1" stop-color="#4fd8ff" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="32" height="32" rx="3" fill="#05080d"/>' +
    '<circle cx="16" cy="16" r="11.5" fill="none" stroke="#4fd8ff" stroke-width="2.6" stroke-dasharray="39 7.5 17 8.76" transform="rotate(-62 16 16)"/>' +
    '<circle cx="16" cy="16" r="7" fill="url(#g)"/>' +
    '<circle cx="16" cy="16" r="2.6" fill="#f2fcff"/>' +
    "</svg>",
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
