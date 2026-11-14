import type { Draft, SourceCheck, Watcher } from "@/lib/case";

/**
 * What AIDaddy did on a case, in order, for the family to read on the case page (issue #27).
 *
 * Every action carries a kind:
 * - "read": research and source re-checks. Runs unattended.
 * - "draft": a letter, email or checklist written into the case. Runs unattended and changes nothing outside it.
 * - "irreversible": sending, paying or submitting. AIDaddy never does these itself. It proposes one, the proposal
 *   waits for the family's click, and the click hands them the prepared action to carry out themselves.
 */
export type ActionKind = "read" | "draft" | "irreversible";

/** What started the work: a chat message, a watched page that changed, a deadline, a schedule, or the case page's button. */
export type ActionTrigger = "message" | "page_change" | "deadline" | "schedule" | "button";

export type ActionStatus = "done" | "waiting" | "approved";

export type CaseAction = {
  at: string;
  kind: ActionKind;
  trigger: ActionTrigger;
  summary: string;
  status: ActionStatus;
  /** The draft a draft or proposal is about. */
  draftId?: string;
  approvedAt?: string;
};

export const ACTIONS_KEPT = 30;

type NewAction = Omit<CaseAction, "at"> & { at?: string };

/** The log with `action` appended (timestamped now unless given) and only the newest `ACTIONS_KEPT` kept. */
export function logAction(log: CaseAction[] | undefined, action: NewAction): CaseAction[] {
  return [...(log ?? []), { at: new Date().toISOString(), ...action }].slice(-ACTIONS_KEPT);
}

/** Writing a draft is done unattended; sending a letter or email becomes a proposal that waits for a click. */
export function draftActions(draft: Draft, trigger: ActionTrigger): CaseAction[] {
  const at = new Date().toISOString();
  const made: CaseAction = { at, kind: "draft", trigger, status: "done", draftId: draft.id, summary: `Drafted "${draft.title}"` };
  if (draft.kind === "checklist") return [made];
  const verb = draft.kind === "email" ? "Send" : "Send or hand in";
  return [
    made,
    { at, kind: "irreversible", trigger, status: "waiting", draftId: draft.id, summary: `${verb} "${draft.title}": waits for your click` },
  ];
}

const WATCHER_TRIGGER: Record<Watcher, ActionTrigger> = { bot: "schedule", cron: "schedule", page: "button" };

/** A re-read of every cited page, plus a page-change action when a quoted sentence is no longer there. */
export function recheckActions(check: SourceCheck, pages: number, by: Watcher): CaseAction[] {
  const trigger = WATCHER_TRIGGER[by];
  const result = check.changed.length
    ? `${check.changed.length} sentence${check.changed.length === 1 ? "" : "s"} gone`
    : "every confirmed sentence still there";
  const actions: CaseAction[] = [
    { at: check.at, kind: "read", trigger, status: "done", summary: `Re-read ${pages} cited pages: ${result}` },
  ];
  if (check.changed.length) {
    const refs = check.changed.map((n) => `[${n}]`).join(" ");
    actions.push({
      at: check.at,
      kind: "read",
      trigger: "page_change",
      status: "done",
      summary: `A watched page changed: ${refs} no longer says what it quoted. Re-check before acting.`,
    });
  }
  return actions;
}

/** The log with the proposal at `index` approved, or null when that is not a waiting proposal. Pure. */
export function approveAction(log: CaseAction[] | undefined, index: number): CaseAction[] | null {
  const action = log?.[index];
  if (!log || !action || action.kind !== "irreversible" || action.status !== "waiting") return null;
  const next = [...log];
  const summary = action.summary.replace(/: waits for your click$/, ": approved: you send it");
  next[index] = { ...action, status: "approved", approvedAt: new Date().toISOString(), summary };
  return next;
}
