import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  ExternalLink,
  Hand,
  HelpCircle,
  History,
  Scale,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLog } from "@/components/action-log";
import { CopyButton } from "@/components/copy-button";
import { DeadlineDate } from "@/components/deadline-date";
import { ListenButton } from "@/components/listen-button";
import { Core } from "@/components/site/core";
import { PageHead, Slash } from "@/components/site/page-head";
import { SiteShell } from "@/components/site/site-shell";
import { SourceCheckPanel } from "@/components/source-check-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Case, type Evidence, type Step, verifiedCount } from "@/lib/case";
import { type Labels, labels, langOf } from "@/lib/i18n";
import { loadCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await loadCase(id);
  const title = c ? c.title : "Case not found";
  // A link preview shows this under the title, so a long summary is cut between words.
  const description =
    c && c.summary.length > 200 ? `${c.summary.slice(0, 200).replace(/[,;:.]?\s+\S*$/, "")}…` : c?.summary;
  return {
    title,
    description,
    robots: { index: false },
    // The image comes from opengraph-image.tsx in this folder.
    openGraph: { title, description, siteName: "AIDaddy", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** A stored value that is not a real date must never break the page. */
const validDate = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Link to the page with the quoted sentence highlighted, using a text fragment (`#:~:text=start,end`).
 * Chrome, Edge and Safari scroll to the sentence and mark it. Other browsers just open the page.
 * Not used for PDFs or for addresses that already carry a fragment.
 */
function highlightUrl(url: string, quote: string): string | null {
  if (url.includes("#") || /\.pdf($|\?)/i.test(url)) return null;
  const words = quote.replace(/\s+/g, " ").trim().split(" ");
  if (words.length < 3) return null;
  // A dash, comma or ampersand has a meaning inside a text fragment, so each is encoded.
  const part = (list: string[]) => encodeURIComponent(list.join(" ")).replace(/-/g, "%2D");
  const fragment = words.length > 10 ? `${part(words.slice(0, 5))},${part(words.slice(-5))}` : part(words);
  return `${url}#:~:text=${fragment}`;
}

const when = (iso: string | undefined, t: Labels) => {
  const date = validDate(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat(t.locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(date);
};

function due(value: string | undefined, t: Labels) {
  if (!value) return null;
  // Only a plain ISO date is reformatted. "2026-11-30 at the latest" stays as written.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? validDate(value.trim()) : null;
  if (date) {
    return new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return value;
}

/**
 * One scheme for the whole page, in the site's own colours: amber waits or needs attention, green is confirmed,
 * cyan is the neutral accent.
 */
const AMBER = "border-(--hud-amber)/40 bg-(--hud-amber)/10 text-(--hud-amber)";
const GREEN = "border-(--hud-green)/40 bg-(--hud-green)/10 text-(--hud-green)";

/**
 * Source numbers: green where the quote was found on its page, an amber outline where it was not.
 * `row` puts them on a line of their own at 44px, as under a step of the front page's plan.
 */
function Refs({ refs, t, verified, row = false }: { refs: number[]; t: Labels; verified: Set<number>; row?: boolean }) {
  if (!refs.length) return null;
  const size = row ? " site-chip--lg" : "";
  return (
    <span className={row ? "site-chips mt-2" : "ml-1 inline-flex gap-1 align-baseline"}>
      {refs.map((n) => (
        <a
          key={n}
          href={`#source-${n}`}
          aria-label={t.sourceNumber(n)}
          className={verified.has(n) ? `site-chip${size}` : `site-chip site-chip--open${size}`}
        >
          {n}
        </a>
      ))}
    </span>
  );
}

const STATUS = {
  todo: { icon: CircleDashed, label: "todo", tone: "text-muted-foreground" },
  needs_approval: { icon: Hand, label: "needsApproval", tone: "text-(--hud-amber)" },
  done: { icon: CircleCheck, label: "done", tone: "text-(--hud-green)" },
} as const;

function StepRow({ step, t, verified }: { step: Step; t: Labels; verified: Set<number> }) {
  const status = STATUS[step.status];
  const Icon = status.icon;
  // A step stands only on quotes that were found on their pages. Without one, its deadline is not shown as fact.
  const confirmed = step.evidence.some((n) => verified.has(n));
  const deadline = confirmed ? due(step.due, t) : null;
  return (
    <li className="flex gap-3">
      <Icon className={`mt-0.5 size-5 shrink-0 ${status.tone}`} role="img" aria-label={t[status.label]} />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">
          {step.title}
        </p>
        <Refs refs={step.evidence} t={t} verified={verified} row />
        {step.detail && <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>}
        {step.conflict && (
          <p className={`mt-2 flex gap-2 rounded-lg border p-2 text-sm ${AMBER}`}>
            <Scale className="mt-0.5 size-4 shrink-0" /> {step.conflict}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {!confirmed && (
            <Badge className={`${AMBER} whitespace-normal`}>
              <CircleAlert /> {t.notConfirmed}
            </Badge>
          )}
          {deadline && (
            // A deadline can be a whole phrase, so the badge may wrap on a narrow screen.
            <Badge variant="secondary" className="h-auto max-w-full items-start whitespace-normal py-1 text-left">
              <CalendarClock className="mt-0.5" />
              <span>
                <span className="sr-only">{t.spokenDeadline}: </span>
                {deadline}
              </span>
            </Badge>
          )}
          {step.owner && <Badge variant="outline">{step.owner}</Badge>}
          {step.confidence && step.confidence !== "high" && (
            <Badge variant="outline">
              {t.exaConfidence}: {t.confidence[step.confidence]}
            </Badge>
          )}
          {step.status === "needs_approval" && (
            <Badge className={AMBER}>{t.approveInChat}</Badge>
          )}
        </div>
        {deadline && <DeadlineDate step={step} source={step.evidence.find((n) => verified.has(n))} locale={t.locale} t={t.date} />}
      </div>
    </li>
  );
}

function Mark({ e, t }: { e: Evidence; t: Labels }) {
  if (e.verification === "verified") {
    return (
      <Badge className={`${GREEN} whitespace-normal`}>
        <BadgeCheck /> {e.checkedVia === "exa" ? t.foundExa : e.checkedVia === "oxylabs" ? t.foundOxylabs : t.foundLive}
      </Badge>
    );
  }
  return (
    <Badge className={`${AMBER} whitespace-normal`}>
      <CircleAlert /> {e.verification === "unreachable" ? t.unreachable : t.notFound}
    </Badge>
  );
}

/** The year the quote was checked, if the quoted sentence itself names it: a sign the rule is this year's. */
function thisYear(e: Evidence): number | null {
  const year = validDate(e.fetchedAt)?.getUTCFullYear();
  return year && e.verification === "verified" && new RegExp(`(?<!\\d)${year}(?!\\d)`).test(e.quote) ? year : null;
}

function EvidenceCard({ e, t }: { e: Evidence; t: Labels }) {
  return (
    <li
      id={`source-${e.n}`}
      className={`site-row site-row--roomy scroll-mt-4 ${e.verification === "verified" ? "site-row--green" : "site-row--amber"}`}
    >
      <div className="flex items-start gap-3">
        <span className={e.verification === "verified" ? "site-chip shrink-0" : "site-chip site-chip--open shrink-0"}>{e.n}</span>
        <div className="min-w-0 flex-1">
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
          >
            {e.title} <ExternalLink className="size-3.5 shrink-0" />
            <span className="sr-only">({t.newTab})</span>
          </a>
          <p className="text-xs text-muted-foreground">
            {e.publisher && e.publisher !== host(e.url) ? `${e.publisher} · ` : ""}
            {host(e.url)}
          </p>
        </div>
      </div>
      <blockquote className="mt-3 border-l-2 border-primary/50 pl-3">“{e.quote}”</blockquote>
      {e.quoteTranslation && <p className="mt-2 pl-3.5 text-sm text-muted-foreground">{e.quoteTranslation}</p>}
      {e.verification === "verified" && highlightUrl(e.url, e.quote) && (
        <a
          href={highlightUrl(e.url, e.quote) ?? e.url}
          target="_blank"
          rel="noreferrer"
          className="site-arrow mt-1 pl-3.5"
        >
          {t.showOnPage} <span aria-hidden="true">↗</span>
          {/* Every source has this link, so a screen reader also hears which one it belongs to. */}
          <span className="sr-only">
            : {t.sourceNumber(e.n)}, {e.title} ({t.newTab})
          </span>
        </a>
      )}
      {e.priorBelief && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <History className="size-4" /> {t.memoryVsWeb}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t.memoryExpected} {e.priorBelief} {t.memoryWins}
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Mark e={e} t={t} />
        <Badge variant="outline">{e.sourceType === "official" ? t.official : t.secondary}</Badge>
        {thisYear(e) && <Badge variant="outline">{t.mentionsYear(thisYear(e) as number)}</Badge>}
        {e.pageDate && (
          <span>
            {t.pageDated} {e.pageDate}
          </span>
        )}
        <span>
          {t.checked} {when(e.fetchedAt, t)}
        </span>
      </div>
    </li>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    // A soft line above every part, and a counter ("01 //") drawn by the parent's site-numbered.
    <section className="site-section">
      <div className="site-section-head">
        <h2 className="site-h2">{title}</h2>
        {hint && <p className="site-note">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Header({ c, t }: { c: Case; t: Labels }) {
  const place = [c.jurisdiction.region, t.country(c.jurisdiction.country)].filter(Boolean).join(", ");
  return (
    <PageHead
      label={
        <>
          {place}
          <Slash />
          {t.updated} {when(c.updatedAt, t)}
        </>
      }
      title={c.title}
      titleId="case-title"
      lede={c.summary}
    />
  );
}

/** The instrument at the right: the core, "Listen" and the three figures. On a phone it follows the head. */
function Rail({ c, t }: { c: Case; t: Labels }) {
  const verified = verifiedCount(c);
  const found = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));
  const deadlines = c.steps.filter((s) => s.due && s.evidence.some((n) => found.has(n))).length;
  // Both kinds of waiting are on this page: a step that needs a yes, and a proposal in the action log that needs a click.
  const approvals =
    c.steps.filter((s) => s.status === "needs_approval").length +
    (c.actions?.filter((a) => a.kind === "irreversible" && a.status === "waiting").length ?? 0);
  const quotesTone = !c.evidence.length ? "" : verified === c.evidence.length ? "text-(--hud-green)" : "text-(--hud-amber)";
  // Green when the case has quotes and every one of them was found on its page.
  const seal = c.evidence.length > 0 && verified === c.evidence.length ? "done" : "idle";
  return (
    <div className="site-rail site-rail--sticky">
      <div className="flex flex-wrap items-center gap-3">
        <Core state={seal} className="hud-core--tiny" />
        {process.env.ELEVENLABS_API_KEY && (
          <ListenButton src={`/api/cases/${c.id}/audio`} label={t.listen} loadingLabel={t.listenLoading} errorLabel={t.listenError} />
        )}
      </div>
      <dl className="site-readouts site-readouts--stack">
        {[
          { value: `${verified}/${c.evidence.length}`, label: t.quotesVerified, tone: quotesTone },
          { value: deadlines, label: deadlines === 1 ? t.deadline : t.deadlines, tone: "" },
          { value: approvals, label: t.waiting, tone: approvals ? "text-(--hud-amber)" : "" },
        ].map((stat) => (
          // The label comes first for a screen reader and sits under its number on the page.
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd className={stat.tone}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function CasePage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const c = await loadCase(id);
  if (!c) notFound();
  // English unless the case itself was written in a language we have labels for.
  const t = labels(c.language);
  const verified = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));

  return (
    <SiteShell>
      {/* A word longer than the screen (a Finnish compound, a pasted address) breaks instead of widening the page. */}
      <main lang={langOf(c.language)} className="site-wrap site-page wrap-anywhere">
        <div className="site-split">
          <Header c={c} t={t} />
          <Rail c={c} t={t} />
          <div className="site-stack site-numbered">

            {c.steps.length > 0 && (
              <Section title={t.whatToDo} hint={t.whatToDoHint}>
                <ol className="flex flex-col gap-6">
                  {c.steps.map((step) => (
                    <StepRow key={step.id} step={step} t={t} verified={verified} />
                  ))}
                </ol>
              </Section>
            )}

            {c.money.length > 0 && (
              <Section title={t.money}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {c.money.map((m) => (
                    <Card key={`${m.label} ${m.amount}`} className="ring-border">
                      <CardHeader>
                        <CardDescription>
                          {m.label}
                          <Refs refs={m.evidence} t={t} verified={verified} />
                        </CardDescription>
                        <CardTitle className="font-mono text-base">{m.amount}</CardTitle>
                      </CardHeader>
                      {m.note && <CardContent className="text-sm text-muted-foreground">{m.note}</CardContent>}
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {c.drafts.length > 0 && (
              <Section title={t.drafts} hint={t.draftsHint}>
                {c.drafts.map((d) => (
                  <Card key={d.id} className="ring-border">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{d.title}</CardTitle>
                        <CardDescription className="capitalize">{t.draftKind[d.kind]}</CardDescription>
                      </div>
                      <CopyButton text={d.body} label={t.copy} copiedLabel={t.copied} />
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm leading-relaxed">{d.body}</pre>
                    </CardContent>
                  </Card>
                ))}
              </Section>
            )}

            {(c.unverified.length > 0 || c.openQuestions.length > 0) && (
              <Section title={t.gaps} hint={t.gapsHint}>
                <ul className="flex flex-col gap-2 text-sm">
                  {c.unverified.map((u) => (
                    <li key={u} className="flex gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-(--hud-amber)" /> {u}
                    </li>
                  ))}
                  {c.openQuestions.map((q) => (
                    <li key={q} className="flex gap-2">
                      <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {q}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {c.evidence.length > 0 && (
              <Section title={t.sources} hint={t.sourcesHint}>
                <SourceCheckPanel c={c} t={t} />
                <ol className="flex flex-col gap-3">
                  {c.evidence.map((e) => (
                    <EvidenceCard key={e.n} e={e} t={t} />
                  ))}
                </ol>
              </Section>
            )}

            {c.news && c.news.length > 0 && (
              <Section title={t.news} hint={t.newsHint}>
                <ul className="flex flex-col gap-2">
                  {c.news.map((n) => (
                    <li key={n.url} className="rounded-lg border bg-card p-3 text-sm">
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-start gap-1 font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
                      >
                        {n.title} <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                        <span className="sr-only">({t.newTab})</span>
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {due(n.date, t)} · {n.publisher && n.publisher !== host(n.url) ? `${n.publisher} · ` : ""}
                        {host(n.url)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {c.actions?.length ? (
              <Section title={t.actions} hint={t.actionsHint}>
                <ActionLog
                  caseId={c.id}
                  actions={c.actions}
                  t={{
                    actionKind: t.actionKind,
                    actionTrigger: t.actionTrigger,
                    approve: t.approve,
                    approved: t.approved,
                    approvedNote: t.approvedNote,
                    approvedLetter: t.approvedLetter,
                    approveFailed: t.approveFailed,
                  }}
                />
              </Section>
            ) : null}

            {c.trail && (
              <Section title={t.researched}>
                <details className="rounded-lg border bg-card p-4 text-sm">
                  {/* Stretched over the padding of the box, so the whole row opens it. */}
                  <summary className="-m-4 cursor-pointer p-4 font-medium">
                    {t.trail(c.trail.searches, c.trail.pagesRead, (c.trail.ms / 1000).toFixed(1))}
                  </summary>
                  <ol className="mt-3 flex flex-col gap-1.5">
                    {c.trail.events.map((event, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {(event.ms / 1000).toFixed(1)}s
                        </span>
                        <span>{event.detail}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t.trailNote(c.trail.officialDomains, c.trail.costDollars.toFixed(3))}
                  </p>
                </details>
              </Section>
            )}

            {/* In the language of the case, which the site's own footer is not. */}
            <p className="site-note border-t border-(--hud-line-soft) pt-6">{t.footer}</p>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
