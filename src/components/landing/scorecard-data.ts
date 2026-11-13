import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

/**
 * The scorecard is written by the eval harness to src/data/scorecard.json.
 * It may not exist yet, so it is read from disk at render time instead of being imported:
 * a missing file must not break the build.
 */
const FILE = path.join(process.cwd(), "src", "data", "scorecard.json");

/** Counts and timings the page can live without fall back to a neutral value. */
const count = z.number().catch(0);
const text = z.string().catch("");

const Row = z.object({
  id: text,
  title: z.string().min(1),
  group: text,
  country: text,
  pass: z.boolean(),
  verified: count,
  evidence: count,
  official: count,
  ms: count,
  url: z.string().nullish().catch(null),
  error: z.string().nullish().catch(null),
});

const ScorecardFile = z.object({
  label: text,
  ranAt: text,
  base: text,
  depth: text,
  totals: z.object({
    scenarios: z.number(),
    passed: z.number(),
    verifiedQuotes: z.number(),
    totalQuotes: z.number(),
    unsourcedClaims: z.number(),
    medianMs: z.number().nullish().catch(null),
    p90Ms: z.number().nullish().catch(null),
  }),
  rows: z.array(Row),
});

export type Scorecard = z.infer<typeof ScorecardFile>;
export type ScorecardRow = z.infer<typeof Row>;

/** Returns null when there is no usable scorecard yet. A broken file is reported in the server log. */
export async function loadScorecard(): Promise<Scorecard | null> {
  let raw: string;
  try {
    raw = await readFile(FILE, "utf8");
  } catch {
    return null; // not written yet
  }
  try {
    const parsed = ScorecardFile.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    const where = parsed.error.issues.map((issue) => issue.path.join(".") || "(root)").join(", ");
    console.warn(`[landing] src/data/scorecard.json does not have the expected shape (${where}). Showing the placeholder.`);
  } catch {
    console.warn("[landing] src/data/scorecard.json is not valid JSON. Showing the placeholder.");
  }
  return null;
}

/** Rows in file order, split wherever the group changes. Group slugs such as "must_stay_silent" get spaces. */
export function groupRows(rows: ScorecardRow[]): { name: string; rows: ScorecardRow[] }[] {
  const groups: { name: string; rows: ScorecardRow[] }[] = [];
  for (const row of rows) {
    const name = row.group.replace(/[-_]+/g, " ").trim();
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.rows.push(row);
    else groups.push({ name, rows: [row] });
  }
  return groups;
}

/** "8.4 s", "31.3 s", "125 s", "<0.1 s", or null when there is no timing. The space does not break. */
export function seconds(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  if (ms < 100) return "<0.1\u00a0s";
  const s = ms / 1000;
  return `${s < 100 ? s.toFixed(1) : Math.round(s)}\u00a0s`;
}

/** Day and time in Helsinki, the same format as the case page. */
export function ranAt(iso: string): string | null {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(date);
}

/** The public host a run was made against. A run against a local server has no host worth showing. */
export function hostOf(url: string): string | null {
  try {
    const { host, hostname } = new URL(url);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return null;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Only site paths and http(s) links become clickable. */
export function caseLink(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
