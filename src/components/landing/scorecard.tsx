import { Arrow, Check, Cross } from "@/components/landing/glyphs";
import {
  caseLink,
  groupRows,
  hostOf,
  ranAt,
  type Scorecard as ScorecardData,
  type ScorecardRow,
  seconds,
} from "@/components/landing/scorecard-data";
import { Section } from "@/components/landing/section";

const DASH = "–";

/** The complete live run totals, paired with their labels. */
function Totals({ card }: { card: ScorecardData }) {
  const { totals } = card;
  const p90 = seconds(totals.p90Ms);
  const items = [
    { label: "scenarios passed", value: `${totals.passed}/${totals.scenarios}` },
    { label: "quotes verified", value: `${totals.verifiedQuotes}/${totals.totalQuotes}` },
    {
      label: totals.unsourcedClaims === 1 ? "plan line without a source" : "plan lines without a source",
      value: String(totals.unsourcedClaims),
    },
    { label: "median time", value: seconds(totals.medianMs) ?? DASH, note: p90 ? `90% within ${p90}` : undefined },
  ];
  return (
    <dl className="l-totals">
      {items.map((item) => (
        // The label comes first for screen readers, the number comes first for the eye.
        <div key={item.label} className="l-total">
          <dt>
            {item.label}
            {item.note && <span className="l-total-note">, {item.note}</span>}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Result({ pass }: { pass: boolean }) {
  const Glyph = pass ? Check : Cross;
  return (
    <span className="l-result">
      <span className={pass ? "l-lamp l-lamp--go" : "l-lamp l-lamp--stop"}>
        <Glyph />
      </span>
      <span className="l-result-word">{pass ? "Pass" : "Fail"}</span>
    </span>
  );
}

function Row({ row }: { row: ScorecardRow }) {
  const quotes = row.evidence > 0 ? `${row.verified}/${row.evidence}` : null;
  const time = seconds(row.ms);
  const href = caseLink(row.url);
  // Below the md breakpoint the middle columns fold into one line under the title (see .l-row-detail).
  const folded = [row.country, quotes && `${quotes} quotes`, time].filter(Boolean).join(" · ");

  return (
    <tr>
      <td className="l-lane">
        <Result pass={row.pass} />
      </td>
      <th scope="row">
        {row.title}
        {folded && <span className="l-row-detail">{folded}</span>}
        {row.error && <span className="l-row-error">{row.error}</span>}
      </th>
      <td className="hidden md:table-cell">{row.country || DASH}</td>
      <td className="l-right hidden md:table-cell">{quotes ?? DASH}</td>
      <td className="l-right hidden whitespace-nowrap md:table-cell">{time ?? DASH}</td>
      <td className="l-right">
        {href ? (
          <a href={href} className="l-link l-open">
            Open<span className="sr-only"> the case file for: {row.title}</span>
            {/* A site path stays on this site. An absolute address may lead to another deployment. */}
            <Arrow dir={href.startsWith("/") ? "right" : "up-right"} />
          </a>
        ) : (
          <span>
            <span aria-hidden>{DASH}</span>
            <span className="sr-only">No case file</span>
          </span>
        )}
      </td>
    </tr>
  );
}

function Table({ rows }: { rows: ScorecardRow[] }) {
  return (
    <table className="l-table">
      <caption className="sr-only">Result of each scenario in this run</caption>
      <thead>
        <tr>
          <th scope="col" className="l-lane">
            Result
          </th>
          <th scope="col">Scenario</th>
          <th scope="col" className="hidden md:table-cell">
            Country
          </th>
          <th scope="col" className="l-right hidden md:table-cell">
            Quotes verified
          </th>
          <th scope="col" className="l-right hidden md:table-cell">
            Time
          </th>
          <th scope="col" className="l-right">
            Case file
          </th>
        </tr>
      </thead>
      {groupRows(rows).map((group, g) => (
        <tbody key={`${g}-${group.name}`}>
          {group.name && (
            <tr className="l-group">
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
  );
}

function Results({ card }: { card: ScorecardData }) {
  const when = ranAt(card.ranAt);
  const host = hostOf(card.base);
  const run = [card.label, card.depth && `${card.depth} mode`, host && `against ${host}`].filter(Boolean).join(" · ");
  return (
    <div className="l-scoreboard">
      {(run || when) && (
        // Run provenance and date.
        <p className="l-board-strip">
          <span>{run}</span>
          {when && <span className="l-board-clock">Ran {when}</span>}
        </p>
      )}
      <Totals card={card} />
      {card.rows.length > 0 && <Table rows={card.rows} />}
    </div>
  );
}

function Coming() {
  return (
    <div className="l-placeholder">
      <h3>First scorecard run is coming</h3>
      <p>
        Each scenario will get a row here: whether it passed, how many of its quotes were verified, how long it took
        and a link to the case file it produced.
      </p>
    </div>
  );
}

/**
 * The source-grounding ledger: totals and one row per scenario from src/data/scorecard.json,
 * or a placeholder until the first run. The page loads the file once and hands it in.
 */
export function Scorecard({ card }: { card: ScorecardData | null }) {
  return (
    <Section
      id="scorecard"
      title="Scorecard"
      hint="We run a fixed set of everyday scenarios through the live engine and show what happened, failures included. A pass checks source grounding, not whether every possible step is covered."
    >
      {card ? <Results card={card} /> : <Coming />}
    </Section>
  );
}
