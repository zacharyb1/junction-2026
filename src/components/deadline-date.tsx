"use client";

import { CalendarPlus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Step } from "@/lib/case";
import { icsFor, isoDay, parseDeadline, resolveDeadline, toIso } from "@/lib/deadline";
import type { Labels } from "@/lib/i18n";

/** Today in the reader's own time zone, as YYYY-MM-DD. */
const today = () => {
  const now = new Date();
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
};

/**
 * Under a step whose deadline is a period ("two months before the expected date of birth"):
 * the family gives the date it counts from and gets the day, with a calendar file.
 * A deadline that is already a date gets the calendar file directly. Any other wording renders nothing.
 */
export function DeadlineDate({
  step,
  source,
  locale,
  t,
}: {
  step: Step;
  /** Number of the source that backs the step. The calendar entry links to it on the case page. */
  source?: number;
  locale: string;
  t: Labels["date"];
}) {
  const id = useId();
  // The day it was picked on is kept with the date, so rendering never reads the clock.
  const [picked, setPicked] = useState({ from: "", on: "" });
  const phrase = step.due?.trim() ?? "";
  const fixed = isoDay(phrase);
  const parsed = fixed ? null : parseDeadline(phrase);
  if (!fixed && !parsed) return null;

  const start = isoDay(picked.from);
  const date = fixed ?? (parsed && start ? resolveDeadline(parsed, start) : null);
  const label = parsed?.anchor ? parsed.anchor[0].toUpperCase() + parsed.anchor.slice(1) : t.countsFrom;
  const long = (day: Date) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(day);

  function save(day: Date) {
    const page = `${window.location.origin}${window.location.pathname}${source ? `#source-${source}` : ""}`;
    const worked = start ? [`${t.sourceSays}: “${phrase}”`, `${label}: ${long(start)}`, t.note].join("\n") : "";
    const file = icsFor({
      title: step.title,
      date: day,
      // Many calendars do not show the URL field, so the link is in the text as well.
      description: [step.detail, worked, page].filter(Boolean).join("\n\n"),
      url: page,
    });
    const href = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `deadline-${toIso(day)}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  const add = date && (
    <Button variant="outline" size="lg" className="h-11 px-3 sm:h-9" onClick={() => save(date)}>
      <CalendarPlus /> {t.addToCalendar}
    </Button>
  );

  if (fixed) return <div className="mt-2">{add}</div>;
  return (
    <details className="mt-2 rounded-lg border bg-card text-sm">
      <summary className="cursor-pointer px-3 py-3 font-medium">{t.workOut}</summary>
      <div className="flex flex-col items-start gap-2 px-3 pb-3">
        <label htmlFor={id} className="text-muted-foreground">
          {label}
        </label>
        <Input
          id={id}
          type="date"
          value={picked.from}
          onChange={(e) => setPicked({ from: e.target.value, on: today() })}
          className="h-11 w-auto max-w-full px-3"
        />
        {/* Always on the page, so a screen reader announces the day when it appears. Empty, it takes no room. */}
        <output htmlFor={id} className="flex flex-col gap-2 empty:-mt-2">
          {date && <span className="text-base font-semibold">{long(date)}</span>}
          {date && toIso(date) < picked.on && <span className="text-(--hud-amber)">{t.passed}</span>}
        </output>
        {date && (
          <>
            <p className="text-muted-foreground">
              {t.sourceSays}: “{phrase}”
            </p>
            {add}
          </>
        )}
        <p className="text-xs text-muted-foreground">{t.note}</p>
      </div>
    </details>
  );
}
