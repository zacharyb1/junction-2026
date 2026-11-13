import { timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import {
  type Case,
  type CaseInput,
  type CasePatch,
  type Draft,
  type Evidence,
  type Step,
  type Trail,
  verifiedCount,
} from "@/lib/case";
import { loadCase, saveCase } from "@/lib/store";
import { type FetchedPage, verifyEvidence } from "@/lib/verify";

export function baseUrl(req?: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (req) {
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Writes need the shared secret. Without one configured, only local development may write. */
export function isAuthorised(req: Request): boolean {
  const secret = process.env.CASEFILE_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization") ?? "";
  const given = header.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Research is open to the bot (secret) and to the public demo (access code). */
export function mayResearch(req: Request): boolean {
  if (isAuthorised(req)) return true;
  const code = process.env.DEMO_ACCESS_CODE;
  if (!code) return false;
  const given = req.headers.get("x-demo-code") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}

const slug = (text: string, i: number) =>
  `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "item"}-${i + 1}`;

const withIds = <T extends { id?: string; title: string }>(items: T[]) =>
  items.map((item, i) => ({ ...item, id: item.id ?? slug(item.title, i) }));

export type PublishResult = {
  id: string;
  url: string;
  evidenceTotal: number;
  evidenceVerified: number;
  /** Citation numbers whose quote could not be confirmed on the page. */
  failed: { n: number; reason: Evidence["verification"]; match: number }[];
  advice: string;
};

function resultFor(c: Case, origin: string): PublishResult {
  const failed = c.evidence
    .filter((e) => e.verification !== "verified")
    .map((e) => ({ n: e.n, reason: e.verification, match: e.match }));
  return {
    id: c.id,
    url: `${origin}/c/${c.id}`,
    evidenceTotal: c.evidence.length,
    evidenceVerified: verifiedCount(c),
    failed,
    advice: failed.length
      ? "Some quotes were not found on their pages. Re-read those pages and send the exact sentence with case_update, or remove the claims that depend on them and say you could not verify them."
      : "All quotes were found on their pages. Share the url with the user.",
  };
}

/** `pages`: page texts the caller already fetched, so the verifier does not download them twice. */
export async function publishCase(
  input: CaseInput,
  origin: string,
  pages?: Map<string, FetchedPage>,
  trail?: Trail,
): Promise<PublishResult> {
  const now = new Date().toISOString();
  const c: Case = {
    ...input,
    id: nanoid(16),
    createdAt: now,
    updatedAt: now,
    steps: withIds(input.steps) as Step[],
    drafts: withIds(input.drafts) as Draft[],
    evidence: await verifyEvidence(input.evidence, pages),
    trail,
  };
  await saveCase(c);
  return resultFor(c, origin);
}

function mergeBy<T>(current: T[], incoming: T[] | undefined, key: (item: T) => string | number): T[] {
  if (!incoming) return current;
  const out = [...current];
  for (const item of incoming) {
    const i = out.findIndex((existing) => key(existing) === key(item));
    if (i >= 0) out[i] = { ...out[i], ...item };
    else out.push(item);
  }
  return out;
}

export async function updateCase(id: string, patch: CasePatch, origin: string): Promise<PublishResult | null> {
  const current = await loadCase(id);
  if (!current) return null;

  // Only new or changed evidence is fetched again.
  let evidence = current.evidence;
  if (patch.evidence) {
    const changed = patch.evidence.filter((item) => {
      const old = current.evidence.find((e) => e.n === item.n);
      return !old || old.url !== item.url || old.quote !== item.quote;
    });
    evidence = mergeBy(evidence, await verifyEvidence(changed), (e) => e.n).sort((a, b) => a.n - b.n);
  }

  const next: Case = {
    ...current,
    title: patch.title ?? current.title,
    summary: patch.summary ?? current.summary,
    steps: mergeBy(current.steps, patch.steps ? (withIds(patch.steps) as Step[]) : undefined, (s) => s.title),
    money: mergeBy(current.money, patch.money, (m) => m.label),
    drafts: mergeBy(current.drafts, patch.drafts ? (withIds(patch.drafts) as Draft[]) : undefined, (d) => d.title),
    evidence,
    unverified: patch.unverified ?? current.unverified,
    openQuestions: patch.openQuestions ?? current.openQuestions,
    updatedAt: new Date().toISOString(),
  };
  await saveCase(next);
  return resultFor(next, origin);
}

/** Re-fetches every cited page. Used by the daily change watch. */
export async function recheckCase(id: string): Promise<{ changed: number[]; case: Case } | null> {
  const current = await loadCase(id);
  if (!current) return null;
  const fresh = await verifyEvidence(current.evidence);
  const changed = fresh
    .filter((e, i) => current.evidence[i].verification === "verified" && e.verification === "not_found")
    .map((e) => e.n);
  const next = { ...current, evidence: fresh, updatedAt: new Date().toISOString() };
  await saveCase(next);
  return { changed, case: next };
}

export { loadCase };
