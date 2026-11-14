import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  ExternalLink,
  Hand,
  HelpCircle,
  Highlighter,
  History,
  MapPin,
  Scale,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLog } from "@/components/action-log";
import { CopyButton } from "@/components/copy-button";
import { DeadlineDate } from "@/components/deadline-date";
import { ListenButton } from "@/components/listen-button";
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

function Refs({ refs, t }: { refs: number[]; t: Labels }) {
  if (!refs.length) return null;
  return (
    <span className="ml-1 inline-flex gap-1 align-baseline">
      {refs.map((n) => (
        <a
          key={n}
          href={`#source-${n}`}
          aria-label={t.sourceNumber(n)}
          // 24 px each way: the smallest target a finger can hit without catching its neighbour.
          className="min-w-6 rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-1 text-center font-mono text-xs text-primary no-underline hover:bg-primary hover:text-primary-foreground"
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
          <Refs refs={step.evidence} t={t} />
        </p>
        {step.detail && <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>}
        {step.conflict && (
          <p className={`mt-2 flex gap-2 rounded-lg border p-2 text-sm ${AMBER}`}>
            <Scale className="mt-0.5 size-4 shrink-0" /> {step.conflict}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {!confirmed && (
            <Badge className={AMBER}>
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
      <Badge className={GREEN}>
        <BadgeCheck /> {e.checkedVia === "exa" ? t.foundExa : e.checkedVia === "oxylabs" ? t.foundOxylabs : t.foundLive}
      </Badge>
    );
  }
  return (
    <Badge className={AMBER}>
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
    <li id={`source-${e.n}`} className="scroll-mt-4 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 font-mono text-xs text-primary">
          {e.n}
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-6 items-center gap-1 font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
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
      <blockquote className="mt-3 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed italic">“{e.quote}”</blockquote>
      {e.quoteTranslation && <p className="mt-2 pl-3.5 text-sm text-muted-foreground">{e.quoteTranslation}</p>}
      {e.verification === "verified" && highlightUrl(e.url, e.quote) && (
        <a
          href={highlightUrl(e.url, e.quote) ?? e.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-6 items-center gap-1 pl-3.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Highlighter className="size-3.5 shrink-0" /> {t.showOnPage}
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
    // A hairline above every part, as in a printed report.
    <section className="flex flex-col gap-4 border-t pt-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Header({ c, t }: { c: Case; t: Labels }) {
  const verified = verifiedCount(c);
  const found = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));
  const deadlines = c.steps.filter((s) => s.due && s.evidence.some((n) => found.has(n))).length;
  // Both kinds of waiting are on this page: a step that needs a yes, and a proposal in the action log that needs a click.
  const approvals =
    c.steps.filter((s) => s.status === "needs_approval").length +
    (c.actions?.filter((a) => a.kind === "irreversible" && a.status === "waiting").length ?? 0);
  const place = [c.jurisdiction.region, t.country(c.jurisdiction.country)].filter(Boolean).join(", ");
  const quotesTone = !c.evidence.length ? "" : verified === c.evidence.length ? "text-(--hud-green)" : "text-(--hud-amber)";
  return (
    // The same head as /try and /chat: a small label, the title, one paragraph.
    <header className="flex flex-col gap-3">
      <p className="site-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{place}</span>
        <span className="text-muted-foreground">
          · {t.updated} {when(c.updatedAt, t)}
        </span>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{c.title}</h1>
      <p className="leading-relaxed text-muted-foreground">{c.summary}</p>
      {process.env.ELEVENLABS_API_KEY && (
        <ListenButton src={`/api/cases/${c.id}/audio`} label={t.listen} loadingLabel={t.listenLoading} errorLabel={t.listenError} />
      )}
      <dl className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { value: `${verified}/${c.evidence.length}`, label: t.quotesVerified, tone: quotesTone },
          { value: deadlines, label: deadlines === 1 ? t.deadline : t.deadlines, tone: "" },
          { value: approvals, label: t.waiting, tone: approvals ? "text-(--hud-amber)" : "" },
        ].map((stat) => (
          // The label comes first for a screen reader and sits under its number on the page.
          <div key={stat.label} className="flex flex-col-reverse justify-end gap-1 rounded-lg border bg-card p-3">
            <dt className="text-xs leading-snug text-muted-foreground">{stat.label}</dt>
            <dd className={`text-2xl font-semibold tabular-nums ${stat.tone}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </header>
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
      {/*
        A word longer than the screen (a Finnish compound, a pasted address) breaks instead of widening the page.
        The shared badge is a pill; here it gets the site's crisp corner.
      */}
      <main
        lang={langOf(c.language)}
        className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10 wrap-anywhere sm:py-14 [&_.rounded-4xl]:rounded-sm"
      >
        <Header c={c} t={t} />

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
                      <Refs refs={m.evidence} t={t} />
                    </CardDescription>
                    <CardTitle className="text-base">{m.amount}</CardTitle>
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
                    className="inline-flex min-h-6 items-start gap-1 font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
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
        <p className="border-t pt-6 text-xs leading-relaxed text-muted-foreground">{t.footer}</p>
      </main>
    </SiteShell>
  );
}
