import { describe, expect, it } from "vitest";
import { ACTIONS_KEPT, approveAction, draftActions, logAction, recheckActions, type CaseAction } from "@/lib/actions";
import type { Draft, SourceCheck } from "@/lib/case";

const draft = (over: Partial<Draft> = {}): Draft => ({
  id: "notice",
  title: "Notice to employer",
  kind: "email",
  body: "Dear HR, I am expecting a baby.",
  ...over,
});

describe("logAction", () => {
  it("appends a timestamped action and keeps only the newest", () => {
    let log: CaseAction[] = [];
    for (let i = 0; i < ACTIONS_KEPT + 5; i++) {
      log = logAction(log, { kind: "read", trigger: "schedule", summary: `check ${i}`, status: "done" });
    }
    expect(log).toHaveLength(ACTIONS_KEPT);
    expect(log.at(-1)!.summary).toBe(`check ${ACTIONS_KEPT + 4}`);
    expect(Date.parse(log[0].at)).not.toBeNaN();
  });
});

describe("draftActions", () => {
  it("records the draft as done and turns sending it into a proposal that waits for a click", () => {
    const [made, send] = draftActions(draft(), "message");
    expect(made).toMatchObject({ kind: "draft", status: "done", trigger: "message", draftId: "notice" });
    expect(send).toMatchObject({ kind: "irreversible", status: "waiting", draftId: "notice" });
    expect(send.summary).toMatch(/Notice to employer/);
  });

  it("proposes nothing to send for a checklist", () => {
    const actions = draftActions(draft({ kind: "checklist" }), "message");
    expect(actions.map((a) => a.kind)).toEqual(["draft"]);
  });
});

describe("recheckActions", () => {
  const check = (changed: number[], unreachable: number[] = []): SourceCheck => ({
    at: "2026-11-14T03:17:00.000Z",
    by: "cron",
    changed,
    unreachable,
  });

  it("logs a scheduled re-read of the cited pages", () => {
    const [read] = recheckActions(check([]), 8, "cron");
    expect(read).toMatchObject({ kind: "read", trigger: "schedule", status: "done" });
    expect(read.summary).toMatch(/8 cited pages/);
  });

  it("adds a page-change action when a quoted sentence is gone", () => {
    const actions = recheckActions(check([3]), 8, "cron");
    expect(actions.map((a) => a.trigger)).toEqual(["schedule", "page_change"]);
    expect(actions[1].summary).toMatch(/\[3\]/);
  });

  it("names the family's own button as the trigger", () => {
    expect(recheckActions(check([]), 2, "page")[0].trigger).toBe("button");
  });
});

describe("approveAction", () => {
  const waiting = draftActions(draft(), "message");

  it("approves a waiting proposal and stamps when", () => {
    const next = approveAction(waiting, 1);
    expect(next?.[1]).toMatchObject({ kind: "irreversible", status: "approved" });
    expect(next?.[1].approvedAt).toBeTruthy();
    expect(waiting[1].status).toBe("waiting"); // pure: the input is not changed
  });

  it("refuses anything that is not a waiting proposal", () => {
    expect(approveAction(waiting, 0)).toBeNull(); // a draft that is already done
    expect(approveAction(waiting, 9)).toBeNull();
    expect(approveAction(approveAction(waiting, 1)!, 1)).toBeNull(); // approved twice
  });
});
