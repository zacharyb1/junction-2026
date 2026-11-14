import { timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import {
  type Case,
  type CaseInput,
  type CasePatch,
  CHECKS_KEPT,
  type Draft,
  type Evidence,
  latestCheck,
  type SourceCheck,
  type Step,
  type Trail,
  verifiedCount,
  type Watcher,
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

/** Money cards show amounts as facts, so every citation must identify verified evidence. */
function withVerifiedMoney(c: Case): Case {
  const citations = new Map<number, Evidence | null>();
  for (const item of c.evidence) {
    citations.set(item.n, citations.has(item.n) ? null : item);
  }
  const withheld: string[] = [];
  const corrected = new Set<string>();
  const money = c.money.filter((item) => {
    const explanation = `Amount "${item.label}": supporting citations could not be verified.`;
    if (item.evidence.length && item.evidence.every((n) => citations.get(n)?.verification === "verified")) {
      corrected.add(explanation);
      return true;
    }
    withheld.push(explanation);
    return false;
  });
  return {
    ...c,
    money,
    unverified: [...new Set([...withheld, ...c.unverified.filter((note) => !corrected.has(note))])].slice(0, 10),
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
  const c = withVerifiedMoney({
    ...input,
    id: nanoid(16),
    createdAt: now,
    updatedAt: now,
    steps: withIds(input.steps) as Step[],
    drafts: withIds(input.drafts) as Draft[],
    evidence: await verifyEvidence(input.evidence, pages),
    trail,
  });
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

  const next = withVerifiedMoney({
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
  });
  await saveCase(next);
  return resultFor(next, origin);
}

export type RecheckResult = {
  /** News for this caller: citation numbers found gone since its own last check. Each watcher hears of a change once. */
  changed: number[];
  unreachable: number[];
  /** The state after this check, as stored on the case: every quote that is gone, not only the new ones. */
  check: SourceCheck;
  case: Case;
};

/**
 * Re-fetches every cited page of a stored case and records the result on it. Used by the bot's change watch,
 * the daily job and the button on the case page.
 * Gone: the sentence was confirmed earlier and is not on a page that still opens. Unreachable: the page did not
 * open this time, which says nothing about the rule, so what was known about a once confirmed quote is kept.
 */
export async function recheckSources(current: Case, by: Watcher): Promise<RecheckResult> {
  // The change watch wants a live reading, so blocked pages go through Oxylabs when a key is set.
  const fresh = await verifyEvidence(current.evidence, undefined, { oxylabs: "blocked", recheck: true });
  const earlier = current.checks ?? [];
  const goneBefore = new Set(latestCheck(current)?.changed);
  const gone: number[] = [];
  const unreachable: number[] = [];
  const evidence = fresh.map((e, i) => {
    const before = current.evidence[i];
    const wasConfirmed = before.verification === "verified" || goneBefore.has(e.n);
    if (e.verification === "unreachable") unreachable.push(e.n);
    const now = e.verification === "unreachable" && wasConfirmed ? before : e;
    if (wasConfirmed && now.verification !== "verified") gone.push(e.n);
    return now;
  });
  const check: SourceCheck = { at: new Date().toISOString(), by, changed: gone, unreachable };
  const told = new Set(earlier.findLast((c) => c.by === by)?.changed);
  const changed = gone.filter((n) => !told.has(n));

  // The case was updated while its pages were being read. That update wins: this check is not stored,
  // and the next one reads the new content.
  const latest = await loadCase(current.id);
  if (latest && latest.updatedAt !== current.updatedAt) {
    return { changed: [], unreachable: [], check: latestCheck(latest) ?? check, case: latest };
  }
  // `updatedAt` stays: it marks the last change to the content, and the daily job stops watching 14 days after it.
  const next: Case = { ...current, evidence, checks: [...earlier, check].slice(-CHECKS_KEPT) };
  await saveCase(next);
  return { changed, unreachable, check, case: next };
}

export async function recheckCase(id: string, by: Watcher = "bot"): Promise<RecheckResult | null> {
  const current = await loadCase(id);
  return current ? recheckSources(current, by) : null;
}

export { loadCase };
