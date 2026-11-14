"use client";

import { useState } from "react";
import type { CaseAction } from "@/lib/actions";
import type { Draft } from "@/lib/case";
import type { Labels } from "@/lib/i18n";

type ActionLabels = Pick<
  Labels,
  "actionKind" | "actionTrigger" | "approve" | "approved" | "approvedNote" | "approvedLetter" | "approveFailed"
>;

const TAG: Record<string, string> = {
  read: "border-sky-300 bg-sky-50 text-sky-900",
  draft: "border-violet-300 bg-violet-50 text-violet-900",
  waiting: "border-amber-400 bg-amber-50 text-amber-950",
  approved: "border-emerald-400 bg-emerald-50 text-emerald-950",
};

/** UTC, so the server render and the browser agree. */
const when = (iso: string) => iso.slice(0, 16).replace("T", " ") + " UTC";

/** The case's action log, newest first, with the click that approves a waiting proposal (issue #27). */
export function ActionLog({ caseId, actions, t }: { caseId: string; actions: CaseAction[]; t: ActionLabels }) {
  const [log, setLog] = useState(actions);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function approve(index: number) {
    setBusy(index);
    setNote("");
    try {
      const res = await fetch(`/api/cases/${caseId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { action, draft } = (await res.json()) as { action: CaseAction; draft?: Draft };
      setLog((l) => l.map((a, i) => (i === index ? action : a)));
      if (draft?.kind === "email") {
        setNote(t.approvedNote);
        window.location.assign(`mailto:?subject=${encodeURIComponent(draft.title)}&body=${encodeURIComponent(draft.body)}`);
      } else {
        setNote(t.approvedLetter);
      }
    } catch {
      setNote(t.approveFailed);
    } finally {
      setBusy(null);
    }
  }

  const rows = log.map((action, index) => ({ action, index })).reverse();
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col divide-y rounded-xl border bg-card text-sm">
        {rows.map(({ action, index }) => {
          const tag = action.kind === "irreversible" ? (action.status === "approved" ? "approved" : "waiting") : action.kind;
          const label = tag === "approved" ? t.approved : t.actionKind[action.kind];
          return (
            <li key={index} className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-start sm:gap-3">
              <span className={`w-fit shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${TAG[tag]}`}>{label}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p>{action.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {when(action.approvedAt ?? action.at)} · {t.actionTrigger[action.trigger]}
                </p>
                {tag === "waiting" && (
                  <button
                    type="button"
                    onClick={() => approve(index)}
                    disabled={busy !== null}
                    className="mt-1 min-h-11 w-fit rounded-md border border-amber-500 bg-amber-100 px-3 text-sm font-medium text-amber-950 hover:bg-amber-200 disabled:opacity-60"
                  >
                    {t.approve}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {note && (
        <p className="text-sm" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
