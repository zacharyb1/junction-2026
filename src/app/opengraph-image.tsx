import { ImageResponse } from "next/og";
import { loadScorecard, seconds } from "@/components/landing/scorecard-data";
import { heading, PreviewCard, tone } from "@/lib/preview-card";

export const alt = "Kaveri: the butler in your family group chat, with a source on every line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Preview for the landing page and every page without an image of its own.
 * Built once per deploy, like the landing page, so the numbers are those of the committed scorecard.
 * Without a scorecard the tiles are left out.
 */
export default async function Image() {
  const card = await loadScorecard();
  const median = card && seconds(card.totals.medianMs);
  const tiles = card
    ? [
        { value: `${card.totals.verifiedQuotes} of ${card.totals.totalQuotes}`, label: "quotes found on their pages" },
        { value: `${card.totals.passed} of ${card.totals.scenarios}`, label: "live scenarios passed" },
        ...(median ? [{ value: median, label: "median research time" }] : []),
      ]
    : [];

  return new ImageResponse(
    (
      <PreviewCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 66, ...heading }}>
            <span>The butler that lives in your</span>
            <span>family group chat.</span>
          </div>
          <span style={{ fontSize: 30, color: tone.soft }}>
            Silent until a life event comes up. Then a plan with a source on every line.
          </span>
        </div>
        {tiles.length > 0 && (
          <div style={{ display: "flex", gap: 20 }}>
            {tiles.map((tile) => (
              <div
                key={tile.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  padding: "14px 26px 18px",
                  borderRadius: 24,
                  border: `2px solid ${tone.border}`,
                }}
              >
                <span style={{ fontSize: 50, letterSpacing: "-0.03em" }}>{tile.value}</span>
                <span style={{ fontSize: 26, color: tone.soft }}>{tile.label}</span>
              </div>
            ))}
          </div>
        )}
      </PreviewCard>
    ),
    size,
  );
}
