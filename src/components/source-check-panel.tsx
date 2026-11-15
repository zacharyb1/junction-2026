import { BadgeCheck, CircleAlert, Clock } from "lucide-react";
import { SourceCheckButton } from "@/components/source-check-button";
import { type Case, latestCheck } from "@/lib/case";
import type { Labels } from "@/lib/i18n";

const time = (iso: string, t: Labels) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(t.locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(date);
};

/** What the last reading of the cited pages found, and a button to read them again. */
export function SourceCheckPanel({ c, t }: { c: Case; t: Labels }) {
  const check = latestCheck(c);
  if (!check) return null;
  const total = c.evidence.length;
  // Quotes found at this reading. One whose page did not open keeps its mark, but was not seen this time.
  const seen = c.evidence.filter((e) => e.verification === "verified" && !check.unreachable.includes(e.n)).length;
  const allThere = seen === total;
  const checkedAt = time(check.at, t);
  const Icon = allThere ? BadgeCheck : Clock;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
      {check.changed.length > 0 && (
        <p className="site-row site-row--amber flex gap-2 font-medium text-(--hud-amber)">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {t.quotesGone(check.changed)}
        </p>
      )}
      <p className="flex gap-2">
        <Icon
          className={`mt-0.5 size-4 shrink-0 ${allThere ? "text-(--hud-green)" : "text-muted-foreground"}`}
        />
        <span>
          {checkedAt && `${t.sourcesChecked(checkedAt)} `}
          {/* "Still" is only true once the pages were read a second time. */}
          {allThere && c.checks?.length ? t.quotesAllThere(total) : t.quotesSomeThere(seen, total)}
        </span>
      </p>
      {check.unreachable.length > 0 && (
        // Indented to line up with the sentence above, past its icon.
        <p className="pl-6 text-muted-foreground">{t.pagesNotOpened(check.unreachable)}</p>
      )}
      <SourceCheckButton
        id={c.id}
        label={t.checkAgain}
        busyLabel={t.checking}
        recentLabel={t.checkedRecently}
        failedLabel={t.checkFailed}
      />
    </div>
  );
}
