import { ImageResponse } from "next/og";
import { type Case, verifiedCount } from "@/lib/case";
import { heading, PreviewCard, printable, tone } from "@/lib/preview-card";
import { loadCase } from "@/lib/store";

// Read from storage on every request, like the case page: a recheck changes the numbers.
export const dynamic = "force-dynamic";
export const alt = "AIDaddy case file: how many of its quotes were found on their pages";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The start of `text` that fits on two lines of about `perLine` characters, cut between words.
 * Widths are estimated from character counts, so the two-line clamp in Title stays on as a backstop.
 */
function twoLines(text: string, perLine: number): string {
  const words = text.split(" ");
  let lines = 1;
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    const next = used ? used + 1 + words[i].length : words[i].length;
    if (next <= perLine) used = next;
    else if (lines === 1) {
      lines = 2;
      used = words[i].length;
    } else return `${words.slice(0, i).join(" ").replace(/[\s,;:.–—-]+$/, "")}…`;
  }
  return text;
}

/** At most two lines: large when the title is short, cut at a word with an ellipsis when it is long. */
function Title({ children }: { children: string }) {
  const fontSize = children.length > 30 ? 58 : 70;
  return (
    <div style={{ display: "block", lineClamp: 2, fontSize, ...heading }}>
      {/* Geist at this tracking averages a little under half its size per character. */}
      {twoLines(children, Math.floor(2150 / fontSize))}
    </div>
  );
}

/** The line under the count: how many of the sources are official, and how many are not. */
function sourcesLine(c: Case): string {
  const official = c.evidence.filter((e) => e.sourceType === "official").length;
  const secondary = c.evidence.length - official;
  return [
    official > 0 && plural(official, "official source", "official sources"),
    secondary > 0 && plural(secondary, "secondary source", "secondary sources"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function CaseCard({ c }: { c: Case }) {
  const total = c.evidence.length;
  const found = verifiedCount(c);
  const place = printable([c.jurisdiction.region, c.jurisdiction.country].filter(Boolean).join(", "));
  // Green only when every quote was found. Anything less is shown in amber.
  const mark = found === total ? tone.found : tone.open;

  return (
    <PreviewCard
      aside={
        place && (
          <div
            style={{
              display: "block",
              lineClamp: 1,
              maxWidth: 560,
              padding: "10px 26px",
              borderRadius: 999,
              background: tone.muted,
              fontSize: 30,
            }}
          >
            {place}
          </div>
        )
      }
    >
      <Title>{printable(c.title) || "Case file"}</Title>
      {total > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 34px 12px",
              borderRadius: 28,
              background: mark.background,
              color: mark.text,
              fontSize: 92,
              letterSpacing: "-0.03em",
            }}
          >
            {`${found} of ${total}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 42, letterSpacing: "-0.01em" }}>
              {total === 1 ? "quote found on its page" : "quotes found on their pages"}
            </span>
            <span style={{ fontSize: 30, color: tone.soft }}>{sourcesLine(c)}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 56, letterSpacing: "-0.02em" }}>No sources yet</span>
          <span style={{ fontSize: 30, color: tone.soft }}>Nothing in this case is confirmed on a page so far.</span>
        </div>
      )}
    </PreviewCard>
  );
}

/** Shown for an id that has no case behind it. It claims nothing about any case. */
function GenericCard() {
  return (
    <PreviewCard>
      <Title>An AIDaddy case file</Title>
      <span style={{ fontSize: 42, letterSpacing: "-0.01em" }}>Every line carries a quote checked on its page.</span>
    </PreviewCard>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await loadCase(id);
  return new ImageResponse(c ? <CaseCard c={c} /> : <GenericCard />, {
    ...size,
    // The default is a year of immutable caching, but a case changes when it is updated or rechecked.
    headers: { "cache-control": "public, max-age=300" },
  });
}
