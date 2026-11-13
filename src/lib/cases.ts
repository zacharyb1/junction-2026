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
  const unsourced = c.steps.filter((s) => !s.evidence.length).length;
  return {
    id: c.id,
    url: `${origin}/c/${c.id}`,
    evidenceTotal: c.evidence.length,
    evidenceVerified: verifiedCount(c),
    failed,
    advice: failed.length
      ? "Some quotes were not found on their pages. Re-read those pages and send the exact sentence with case_update, or remove the claims that depend on them and say you could not verify them."
      : !c.evidence.length
        ? "This case has no evidence, so nothing in it is confirmed. Add a quote and URL for every step with case_update before you share it."
        : unsourced
          ? `All quotes were found on their pages, but ${unsourced} step${unsourced === 1 ? " has" : "s have"} no evidence number. The case page marks them as not confirmed. Add evidence or remove them.`
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

/** Items that match by key are updated field by field. New items get the defaults a full item would have. */
function mergeBy<T>(
  current: T[],
  incoming: Partial<T>[] | undefined,
  key: (item: Partial<T>) => string | number | undefined,
  defaults: Partial<T> = {},
): T[] {
  if (!incoming) return current;
  const out = [...current];
  for (const item of incoming) {
    const i = out.findIndex((existing) => key(existing) === key(item));
    if (i >= 0) out[i] = { ...out[i], ...item };
    else out.push({ ...defaults, ...item } as T);
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
    const checked = await verifyEvidence(changed.map((item) => ({ sourceType: "secondary" as const, ...item })));
    evidence = mergeBy(evidence, checked, (e) => e.n).sort((a, b) => a.n - b.n);
  }

  const next: Case = {
    ...current,
    title: patch.title ?? current.title,
    summary: patch.summary ?? current.summary,
    steps: mergeBy<Step>(
      current.steps,
      // An id is only made up for a step that is new. A patched step keeps the one it has.
      patch.steps?.map((s, i) => (current.steps.some((old) => old.title === s.title) ? s : { ...s, id: s.id ?? slug(s.title, current.steps.length + i) })),
      (s) => s.title,
      { status: "todo", evidence: [] },
    ),
    money: mergeBy(current.money, patch.money, (m) => m.label, { evidence: [] }),
    drafts: mergeBy(current.drafts, patch.drafts ? (withIds(patch.drafts) as Draft[]) : undefined, (d) => d.title),
    evidence,
    unverified: patch.unverified ?? current.unverified,
    openQuestions: patch.openQuestions ?? current.openQuestions,
    updatedAt: new Date().toISOString(),
  };
  await saveCase(next);
  return resultFor(next, origin);
}

/**
 * Re-fetches every cited page. Used by the daily change watch.
 * `changed`: the sentence is gone from a page that still opens. `unreachable`: the page did not open
 * this time, which says nothing about the rule, so the last confirmed state is kept.
 */
export async function recheckCase(
  id: string,
): Promise<{ changed: number[]; unreachable: number[]; case: Case } | null> {
  const current = await loadCase(id);
  if (!current) return null;
  // The change watch wants a live reading, so blocked pages go through Oxylabs when a key is set.
  const fresh = await verifyEvidence(current.evidence, undefined, { oxylabs: "blocked", recheck: true });
  const changed: number[] = [];
  const unreachable: number[] = [];
  const evidence = fresh.map((e, i) => {
    const before = current.evidence[i];
    if (e.verification === "unreachable") {
      unreachable.push(e.n);
      return before.verification === "verified" ? before : e;
    }
    if (before.verification === "verified" && e.verification === "not_found") changed.push(e.n);
    return e;
  });
  const next = { ...current, evidence, updatedAt: new Date().toISOString() };
  await saveCase(next);
  return { changed, unreachable, case: next };
}

export { loadCase };
