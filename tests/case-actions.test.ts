import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaseInput, CasePatch, type Case } from "@/lib/case";
import { approveCaseAction, publishCase, recheckCase, updateCase } from "@/lib/cases";
import { loadCase } from "@/lib/store";
import { verifyEvidence } from "@/lib/verify";
import proactiveRehearsal from "../eval/results/proactive-20261115.json";

// The case store without files, and the verifier without the network.
const stored = new Map<string, Case>();
vi.mock("@/lib/store", () => ({
  saveCase: vi.fn(async (c: Case) => void stored.set(c.id, structuredClone(c))),
  loadCase: vi.fn(async (id: string) => structuredClone(stored.get(id) ?? null)),
}));
vi.mock("@/lib/verify", async (original) => ({
  ...(await original<typeof import("@/lib/verify")>()),
  verifyEvidence: vi.fn(async (items: { n: number }[]) =>
    items.map((e) => ({ ...e, sourceType: "official", verification: "verified", match: 1, fetchedAt: new Date().toISOString(), checkedVia: "live" })),
  ),
}));

const input = CaseInput.parse({
  title: "Expecting a baby",
  event: "pregnancy",
  jurisdiction: { country: "Finland", region: "Espoo" },
  summary: "S",
  evidence: [{ n: 1, url: "https://www.kela.fi/x", title: "Kela", quote: "A sentence from the page." }],
  drafts: [{ title: "Notice to employer", kind: "email", body: "Dear HR" }],
});
const trail = { ms: 9000, searches: 4, pagesRead: 11, costDollars: 0.03, officialDomains: 2, events: [] };

beforeEach(() => stored.clear());

describe("the action log on a case", () => {
  it("records the research, the draft and a waiting proposal when a case is published", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example", undefined, trail);
    const actions = (await loadCase(id))!.actions!;
    expect(actions.map((a) => [a.kind, a.status])).toEqual([
      ["read", "done"],
      ["draft", "done"],
      ["irreversible", "waiting"],
    ]);
    expect(actions[0]).toMatchObject({ trigger: "message" });
    expect(actions[0].summary).toMatch(/4 searches, 11 pages/);
  });

  it("logs only new drafts on update, plus what the bot reports doing", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example");
    const before = (await loadCase(id))!.actions!.length;
    const patch = CasePatch.parse({
      drafts: [
        { title: "Notice to employer", kind: "email", body: "Dear HR, again" }, // an edit, not a new draft
        { title: "Daycare checklist", kind: "checklist", body: "1. Apply" },
      ],
      log: [{ kind: "read", trigger: "deadline", summary: "Reminder sent: daycare application closes Friday" }],
    });
    await updateCase(id, patch, "https://aidaddy.example");
    const added = (await loadCase(id))!.actions!.slice(before);
    expect(added.map((a) => [a.kind, a.trigger])).toEqual([
      ["draft", "message"],
      ["read", "deadline"],
    ]);
  });

  it("does not let the bot log an irreversible action itself", () => {
    expect(CasePatch.safeParse({ log: [{ kind: "irreversible", trigger: "message", summary: "Sent it" }] }).success).toBe(false);
  });

  it("keeps sending an unsolicited draft waiting for approval after later case work", async () => {
    const { id } = await publishCase({ ...input, drafts: [] }, "https://aidaddy.example");
    const update = proactiveRehearsal.calls.find((call) => call.tool === "case_update");
    if (!update || !("patch" in update.input)) throw new Error("Recorded agent did not attach a draft");
    // Replay the real agent's synthetic tool payload through the real Case schema and storage path.
    await updateCase(id, CasePatch.parse(update.input.patch), "https://aidaddy.example");
    const draft = (await loadCase(id))!.drafts[0];
    await recheckCase(id, "cron");
    await updateCase(id, CasePatch.parse({
      drafts: [{ title: draft.title, body: "Please review this notice before sending it." }],
    }), "https://aidaddy.example");

    const actions = (await loadCase(id))!.actions!;
    expect(actions.filter((a) => a.kind === "irreversible")).toEqual([
      expect.objectContaining({ status: "waiting", trigger: "message", draftId: draft.id }),
    ]);
    expect(actions.some((a) => a.approvedAt)).toBe(false);
    expect(actions.find((a) => a.kind === "draft")).toMatchObject({ status: "done", draftId: draft.id });
  });

  it("logs a scheduled re-check, and a page change when a quote is gone", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example");
    vi.mocked(verifyEvidence).mockImplementationOnce(async (items) =>
      items.map((e) => ({ ...e, sourceType: "official", verification: "not_found", match: 0.2, fetchedAt: new Date().toISOString(), checkedVia: "live" })) as never,
    );
    await recheckCase(id, "cron");
    const actions = (await loadCase(id))!.actions!;
    expect(actions.slice(-2).map((a) => a.trigger)).toEqual(["schedule", "page_change"]);
  });

  it("approves a waiting proposal once", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example");
    const index = (await loadCase(id))!.actions!.findIndex((a) => a.status === "waiting");
    const first = await approveCaseAction(id, index);
    expect(first?.action.status).toBe("approved");
    expect(first?.draft?.title).toBe("Notice to employer");
    expect(await approveCaseAction(id, index)).toBeNull();
    expect(await approveCaseAction("missing", 0)).toBeNull();
  });
});
