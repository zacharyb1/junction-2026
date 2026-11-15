import type { Metadata } from "next";
import Link from "next/link";
import { Core } from "@/components/site/core";
import { PageHead } from "@/components/site/page-head";
import {
  caseLink,
  groupRows,
  hostOf,
  loadScorecard,
  ranAt,
  type Scorecard,
  type ScorecardRow,
  seconds,
} from "@/components/site/scorecard-data";
import { SiteShell } from "@/components/site/site-shell";
import { labels } from "@/lib/i18n";
import "./scorecard.css";

const title = "Scorecard";
const description =
  "Every scenario of the latest live scorecard run: whether it passed, how many of its quotes were verified, how long it took and the case file it produced.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} · AIDaddy`, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title: `${title} · AIDaddy`, description },
};

const HINT =
  "We run a fixed set of everyday scenarios through the live engine and show what happened, failures included. A pass checks source grounding, not whether every possible step is covered.";
const AUDIENCE =
  "Built first for international families in Finland, who deal with Kela, Vero and landlords in a language they do not read.";
const TWELVE =
  "Twelve countries have a checked list of official sites. Elsewhere it searches the open web and labels every source.";

const DASH = "–";

/** The check labels use the case page's own English words, so the two pages cannot drift apart. */
const t = labels("en");

/** The run's totals. The caption comes first in the markup; the shared readouts draw it under the figure. */
function Totals({ card }: { card: Scorecard }) {
  const { totals, refusals } = card;
  const p90 = seconds(totals.p90Ms);
  const allVerified = totals.totalQuotes > 0 && totals.verifiedQuotes === totals.totalQuotes;
  const items = [
    { label: "scenarios passed", value: `${totals.passed}/${totals.scenarios}` },
    {
      label: "quotes verified",
      value: `${totals.verifiedQuotes}/${totals.totalQuotes}`,
      className: allVerified ? "text-(--hud-green)" : undefined,
    },
    {
      label: totals.unsourcedClaims === 1 ? "plan line without a source" : "plan lines without a source",
      value: String(totals.unsourcedClaims),
    },
    { label: "median time", value: seconds(totals.medianMs) ?? DASH, note: p90 ? `90% within ${p90}` : undefined },
    ...(refusals ? [{ label: "non-events refused", value: `${refusals.passed}/${refusals.total}` }] : []),
  ];
  return (
    <dl className="site-readouts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>
            {item.label}
            {item.note && <span className="score-note">{item.note}</span>}
          </dt>
          <dd className={item.className}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Open" for a case file. A site path stays in this tab; an absolute address opens a new one. */
function CaseLink({ href, title }: { href: string; title: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="site-arrow">
        Open<span className="sr-only"> the case file for: {title}</span> <span aria-hidden="true">→</span>
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="site-arrow">
      Open<span className="sr-only"> the case file for: {title} (opens in a new tab)</span>{" "}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function Row({ row }: { row: ScorecardRow }) {
  const quotes = row.evidence > 0 ? `${row.verified}/${row.evidence}` : null;
  const time = seconds(row.ms);
  const href = caseLink(row.url);
  // Below 768px the middle columns fold into one line under the title.
  const folded = [row.country, quotes && `${quotes} quotes`, time].filter(Boolean).join(" · ");

  return (
    <tr>
      <td>
        <span className={row.pass ? "site-state site-state--green" : "site-state site-state--amber"}>
          {row.pass ? "Pass" : "Fail"}
        </span>
      </td>
      <th scope="row">
        {row.title}
        {folded && <span className="score-fold">{folded}</span>}
        {row.error && <span className="score-error">{row.error}</span>}
      </th>
      <td className="hidden md:table-cell">{row.country || DASH}</td>
      <td className="score-figure hidden md:table-cell">{quotes ?? DASH}</td>
      <td className="score-figure hidden md:table-cell">{time ?? DASH}</td>
      <td className="score-figure">
        {href ? (
          <CaseLink href={href} title={row.title} />
        ) : (
          <span>
            <span aria-hidden="true">{DASH}</span>
            <span className="sr-only">No case file</span>
          </span>
        )}
      </td>
    </tr>
  );
}

function Table({ rows }: { rows: ScorecardRow[] }) {
  return (
    <div className="score-scroll">
      <table className="score-table">
        <caption className="sr-only">Result of each scenario in this run</caption>
        <thead>
          <tr>
            <th scope="col">Result</th>
            <th scope="col">Scenario</th>
            <th scope="col" className="hidden md:table-cell">
              Country
            </th>
            <th scope="col" className="score-figure hidden md:table-cell">
              Quotes verified
            </th>
            <th scope="col" className="score-figure hidden md:table-cell">
              Time
            </th>
            <th scope="col" className="score-figure">
              Case file
            </th>
          </tr>
        </thead>
        {groupRows(rows).map((group, g) => (
          <tbody key={`${g}-${group.name}`}>
            {group.name && (
              <tr className="score-group">
                <th scope="rowgroup" colSpan={6}>
                  {group.name}
                </th>
              </tr>
            )}
            {group.rows.map((row, i) => (
              <Row key={`${i}-${row.id}`} row={row} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function Results({ card }: { card: Scorecard }) {
  const when = ranAt(card.ranAt);
  const host = hostOf(card.base);
  const run = [card.label, card.depth && `${card.depth} mode`, host && `against ${host}`].filter(Boolean).join(" · ");
  return (
    <>
      <Totals card={card} />
      {(run || when || card.rows.length > 0) && (
        <div className="site-panel">
          <p className="site-panel-title">
            <span>This run</span>
            {when && <span>Ran {when}</span>}
          </p>
          {/* The run label is a sentence, not a title bar item. */}
          {run && <p className="site-note px-4 pt-3">{run}</p>}
          {card.rows.length > 0 && <Table rows={card.rows} />}
        </div>
      )}
    </>
  );
}

function Coming() {
  return (
    <div className="site-panel">
      <div className="site-panel-body grid gap-2">
        <h2 className="site-h2">First scorecard run is coming</h2>
        <p className="site-note">
          Each scenario will get a row here: whether it passed, how many of its quotes were verified, how long it took
          and a link to the case file it produced.
        </p>
      </div>
    </div>
  );
}

/** The three labels a quote can carry on a case file, and what each one means. */
function Checked() {
  const rows = [
    { tone: "site-row site-row--green", mark: "✓", label: t.foundLive, text: "Our own request to the page found the sentence." },
    {
      tone: "site-row site-row--green",
      mark: "✓",
      label: t.foundExa,
      text: "Our own request could not confirm it, for example on a PDF. Exa's reading of the page has the sentence.",
    },
    { tone: "site-row site-row--amber", mark: "✕", label: t.notFound, text: "The line is taken out of the plan and listed as unverified." },
  ];
  return (
    <div className="site-section">
      <div className="site-section-head">
        <h2 className="site-h2">Every quote is checked</h2>
        <p className="site-note">
          The assistant does not grade its own work. Our server reads each cited page again, with its own request and
          through Exa, and looks for the quoted sentence. The result sits next to the quote.
        </p>
      </div>
      <dl className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className={row.tone}>
            <dt className="font-medium">
              <span aria-hidden="true" className={row.mark === "✓" ? "text-(--hud-green)" : "text-(--hud-amber)"}>
                {row.mark}
              </span>{" "}
              {row.label}
            </dt>
            <dd className="site-note">{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The source-grounding ledger: totals and one row per scenario from src/data/scorecard.json, or a placeholder until
 * the first run. Static like the front page: the file is read at build time, because the container's runtime image
 * holds only .next and public.
 */
export default async function ScorecardPage() {
  const card = await loadScorecard();
  const passed = card?.totals.passed ?? 0;
  const scenarios = card?.totals.scenarios ?? 0;
  const allPassed = !!card && scenarios > 0 && passed === scenarios;
  return (
    <SiteShell>
      <main className="site-wrap site-page">
        <PageHead
          label="Measured"
          state={card ? { tone: allPassed ? "green" : "amber", text: `${passed}/${scenarios} passed` } : undefined}
          title="Scorecard"
          titleId="scorecard-title"
          lede={HINT}
          aside={<Core state={allPassed ? "done" : "idle"} />}
        >
          <p className="site-note">
            {AUDIENCE} {TWELVE}
          </p>
        </PageHead>
        <section id="scorecard" aria-labelledby="scorecard-title" className="site-stack">
          {card ? <Results card={card} /> : <Coming />}
          <Checked />
        </section>
      </main>
    </SiteShell>
  );
}
