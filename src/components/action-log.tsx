"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CaseAction } from "@/lib/actions";
import type { Draft } from "@/lib/case";
import type { Labels } from "@/lib/i18n";

type ActionLabels = Pick<
  Labels,
  "actionKind" | "actionTrigger" | "approve" | "approved" | "approvedNote" | "approvedLetter" | "approveFailed"
>;

// The site's state code: cyan is AIDaddy's own work, amber waits for the family, green is done and confirmed.
const TONE: Record<string, string> = {
  read: "site-tag--cyan",
  draft: "",
  waiting: "site-tag--amber",
  approved: "site-tag--green",
};

/** UTC, so the server render and the browser agree. */
const when = (iso: string) => iso.slice(0, 16).replace("T", " ") + " UTC";

/** The case's action log, newest first, with the click that approves a waiting proposal (issue #27). */
export function ActionLog({ caseId, actions, t }: { caseId: string; actions: CaseAction[]; t: ActionLabels }) {
  // Only the approvals made on this page are kept here. The log itself is read from the server's copy,
  // so an entry added by "Check the sources again" shows up as soon as the page is refreshed.
  const [approvedHere, setApprovedHere] = useState<Record<number, CaseAction>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();

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
      setApprovedHere((a) => ({ ...a, [index]: action }));
      // The count of what is still waiting, at the top of the page, comes from the server.
      router.refresh();
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

  const rows = actions
    .map((fromServer, index) => {
      const mine = approvedHere[index];
      // An approval made here stands in only for the same entry while the server's copy still shows it waiting.
      const action = mine && mine.at === fromServer.at && fromServer.status === "waiting" ? mine : fromServer;
      return { action, index };
    })
    .reverse();
  return (
    <div className="flex flex-col gap-3">
      <ol className="site-panel flex flex-col divide-y divide-(--hud-line-soft) text-sm">
        {rows.map(({ action, index }) => {
          const tag = action.kind === "irreversible" ? (action.status === "approved" ? "approved" : "waiting") : action.kind;
          const label = tag === "approved" ? t.approved : t.actionKind[action.kind];
          return (
            <li key={index} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
              {/* A column of its own on a wide screen, so the sentences start on one line. */}
              <span className="shrink-0 sm:w-40">
                <span className={`site-tag ${TONE[tag]}`}>{label}</span>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p>{action.summary}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {when(action.approvedAt ?? action.at)} · {t.actionTrigger[action.trigger]}
                </p>
                {tag === "waiting" && (
                  <button
                    type="button"
                    onClick={() => approve(index)}
                    disabled={busy !== null}
                    className="site-btn site-btn--amber site-btn--compact mt-2 w-full sm:w-fit"
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
