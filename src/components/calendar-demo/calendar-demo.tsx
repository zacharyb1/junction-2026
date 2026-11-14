"use client";

import { useReplayClock } from "@/components/demo/replay";

/**
 * Issue #36: a scripted replay of AIDaddy planning a birthday found in the calendar (the birthday-planner
 * skill from issue #23). The family is fictional. The three options and their facts come from a real
 * occasion research run on the venues' own pages, 3 of 3 quotes checked, 5.2 seconds:
 * https://86.38.238.136.sslip.io/c/zPi7P2DsH3CBC7ua (the drafted invitation is on that case).
 * The dates AIDaddy proposes for booking and buying are its suggestions, not facts.
 */
export const CASE_URL = "https://86.38.238.136.sslip.io/c/zPi7P2DsH3CBC7ua";
export const DURATION = 31000;

const YEAR = 2026;
const MONTH = 10; // November
const TODAY = 14;
const BIRTHDAY = 28;

const OPTIONS: [number, string, string][] = [
  [9200, "Ravintola Haikaranpesa", "Its Christmas buffet runs 23 November to 22 December, so the 28th fits [1]"],
  [10600, "Restaurant Juku gift card", "Any amount, valid for one year, usable in Espoo [2]"],
  [12000, "Villa Lilla", "A four-course dinner [3]"],
];

const PROPOSED = [
  { day: 19, label: "Book the table", waits: true },
  { day: 23, label: "Get the gift card", waits: false },
];

/** Monday-first weeks covering the month, as day numbers (0 for days outside it). */
function weeks(): number[][] {
  const first = new Date(Date.UTC(YEAR, MONTH, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(YEAR, MONTH + 1, 0)).getUTCDate();
  const cells = [...Array(offset).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(0);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** The month never changes, so its cells are worked out once and not on every frame of the replay. */
const DAYS = weeks().flat();

export function CalendarDemo({ loop = false }: { loop?: boolean }) {
  const now = useReplayClock(DURATION, loop);

  const spotlight = now >= 1800;
  const panel = now >= 3400;
  const searching = now >= 5400 && now < 9200;
  const options = OPTIONS.filter(([at]) => now >= at);
  const checked = now >= 13200;
  const invite = now >= 15200;
  const proposed = now >= 18200;
  const added = now >= 21800;

  return (
    <div className="cdemo">
      <section className="cdemo-cal" aria-label="November 2026">
        <header className="cdemo-cal-head">
          <h2>November 2026</h2>
          <span>Aino&apos;s calendar</span>
        </header>
        <div className="cdemo-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <p key={d} className="cdemo-dow">
              {d}
            </p>
          ))}
          {DAYS.map((day, i) => {
            const plan = proposed ? PROPOSED.find((p) => p.day === day) : undefined;
            return (
              <div
                key={i}
                className={`cdemo-day${day === 0 ? " is-out" : ""}${day === TODAY ? " is-today" : ""}${day === BIRTHDAY && spotlight ? " is-spot" : ""}`}
              >
                {day > 0 && <span className="cdemo-num">{day}</span>}
                {day === BIRTHDAY && <span className="cdemo-event">🎂 Mum Liisa turns 60</span>}
                {plan && (
                  <span className={`cdemo-event cdemo-event--plan${added ? " is-added" : ""}`}>
                    {plan.label}
                    {plan.waits && <em>{added ? "waits for your click" : "proposed"}</em>}
                    {!plan.waits && !added && <em>proposed</em>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {spotlight && !panel && <p className="cdemo-hint">In 14 days</p>}
      </section>

      <aside className={`cdemo-panel${panel ? " is-open" : ""}`} aria-hidden={!panel}>
        <div className="cdemo-panel-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aidaddy-avatar.svg" alt="" />
          <div>
            <p className="cdemo-name">AIDaddy</p>
            <p className="cdemo-sub">birthday planner</p>
          </div>
        </div>
        {panel && <p className="cdemo-msg">A reminder from the office of AIDaddy: Liisa turns 60 on Saturday 28 November, in two weeks.</p>}
        {searching && <p className="cdemo-progress">Looking for options in Espoo, available now…</p>}
        {options.length > 0 && (
          <ol className="cdemo-options">
            {options.map(([at, title, fact]) => (
              <li key={at}>
                <strong>{title}</strong>
                <span>{fact}</span>
              </li>
            ))}
          </ol>
        )}
        {checked && <p className="cdemo-meta">3 of 3 quotes checked on the venues&apos; own pages · 5.2 s</p>}
        {invite && (
          <div className="cdemo-draft">
            <p className="cdemo-draft-title">Drafted: invitation for the family</p>
            <p>&ldquo;Mum turns 60 on Saturday 28 November! Let us celebrate with a family dinner in Espoo…&rdquo;</p>
          </div>
        )}
        {proposed && (
          <p className="cdemo-msg">
            I put two steps in your calendar as proposals. Booking and buying stay yours: I never book or pay.
          </p>
        )}
        {proposed && <span className={`cdemo-add${added ? " is-done" : ""}`}>{added ? "Added to calendar ✓" : "Add to calendar"}</span>}
      </aside>
    </div>
  );
}
