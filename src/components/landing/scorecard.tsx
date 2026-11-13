import { ArrowUpRight, CircleCheck, CircleX, ClipboardList } from "lucide-react";
import {
  caseLink,
  groupRows,
  hostOf,
  loadScorecard,
  ranAt,
  type Scorecard as ScorecardData,
  type ScorecardRow,
  seconds,
} from "@/components/landing/scorecard-data";
import { Section } from "@/components/landing/section";

const DASH = "–";

function Tiles({ card }: { card: ScorecardData }) {
  const { totals } = card;
  const p90 = seconds(totals.p90Ms);
  const tiles = [
    { label: "scenarios passed", value: `${totals.passed}/${totals.scenarios}` },
    { label: "quotes verified", value: `${totals.verifiedQuotes}/${totals.totalQuotes}` },
    { label: totals.unsourcedClaims === 1 ? "unsourced claim" : "unsourced claims", value: String(totals.unsourcedClaims) },
    { label: "median time", value: seconds(totals.medianMs) ?? DASH, note: p90 ? `90% within ${p90}` : undefined },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
      {tiles.map((tile) => (
        // The label comes first for screen readers, the number comes first for the eye.
        <div key={tile.label} className="flex flex-col rounded-xl border bg-card px-2 py-3">
          <dt className="order-2 text-xs text-muted-foreground">{tile.label}</dt>
          <dd className="order-1 text-xl font-semibold tabular-nums">{tile.value}</dd>
          {tile.note && <dd className="order-3 text-xs text-muted-foreground">{tile.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Result({ pass }: { pass: boolean }) {
  const Icon = pass ? CircleCheck : CircleX;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className={pass ? "size-4 text-emerald-600 dark:text-emerald-400" : "size-4 text-destructive"} />
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function Row({ row }: { row: ScorecardRow }) {
  const quotes = row.evidence > 0 ? `${row.verified}/${row.evidence}` : null;
  const time = seconds(row.ms);
  const href = caseLink(row.url);
  // Below the md breakpoint the middle columns fold into one line under the title.
  const folded = [row.country, quotes && `${quotes} quotes`, time].filter(Boolean).join(" · ");
  const cell = "px-2 py-2.5 sm:px-3";

  return (
    <tr className="border-t align-top">
      <th scope="row" className={`${cell} text-left font-normal`}>
        <span className="block font-medium">{row.title}</span>
        {folded && <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">{folded}</span>}
        {row.error && <span className="mt-0.5 block text-xs break-words text-destructive">{row.error}</span>}
      </th>
      <td className={`${cell} hidden md:table-cell`}>{row.country || DASH}</td>
      <td className={cell}>
        <Result pass={row.pass} />
      </td>
      <td className={`${cell} hidden text-right tabular-nums md:table-cell`}>{quotes ?? DASH}</td>
      <td className={`${cell} hidden text-right whitespace-nowrap tabular-nums md:table-cell`}>{time ?? DASH}</td>
      <td className={`${cell} text-right`}>
        {href ? (
          // The negative margin gives a taller tap target without making the row taller.
          <a
            href={href}
            className="-my-1.5 inline-flex items-center gap-0.5 py-1.5 font-medium whitespace-nowrap underline-offset-4 hover:underline"
          >
            Open<span className="sr-only"> the case file for: {row.title}</span>
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground">
            <span aria-hidden>{DASH}</span>
            <span className="sr-only">No case file</span>
          </span>
        )}
      </td>
    </tr>
  );
}

function Table({ rows }: { rows: ScorecardRow[] }) {
  const head = "px-2 py-2 font-medium whitespace-nowrap sm:px-3";
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Result of each scenario in this run</caption>
        <thead className="bg-muted/50 text-left text-xs text-foreground/70">
          <tr>
            <th scope="col" className={head}>
              Scenario
            </th>
            <th scope="col" className={`${head} hidden md:table-cell`}>
              Country
            </th>
            <th scope="col" className={head}>
              Result
            </th>
            <th scope="col" className={`${head} hidden text-right md:table-cell`}>
              Quotes verified
            </th>
            <th scope="col" className={`${head} hidden text-right md:table-cell`}>
              Time
            </th>
            <th scope="col" className={`${head} text-right`}>
              Case file
            </th>
          </tr>
        </thead>
        {groupRows(rows).map((group, g) => (
          <tbody key={`${g}-${group.name}`}>
            {group.name && (
              <tr className="border-t">
                <th
                  scope="rowgroup"
                  colSpan={6}
                  className="px-2 pt-3 pb-1 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-3"
                >
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

function Results({ card }: { card: ScorecardData }) {
  const when = ranAt(card.ranAt);
  const host = hostOf(card.base);
  const about = [card.label, when && `Ran ${when}`, card.depth && `${card.depth} depth`, host && `against ${host}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col gap-3">
      <Tiles card={card} />
      {about && <p className="text-xs text-muted-foreground">{about}</p>}
      {card.rows.length > 0 && <Table rows={card.rows} />}
    </div>
  );
}

function Coming() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-5 sm:p-6">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
        <ClipboardList className="size-4" />
      </span>
      <h3 className="font-medium">First scorecard run is coming</h3>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        Each scenario will get a row here: whether it passed, how many of its quotes were verified, how long it took
        and a link to the case file it produced.
      </p>
    </div>
  );
}

/** Totals and one row per scenario from src/data/scorecard.json, or a placeholder until the first run. */
export async function Scorecard() {
  const card = await loadScorecard();
  return (
    <Section
      id="scorecard"
      title="Scorecard"
      hint="We run a fixed set of everyday scenarios through the live engine and show what happened, failures included."
    >
      {card ? <Results card={card} /> : <Coming />}
    </Section>
  );
}
