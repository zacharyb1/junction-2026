import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as scheduledRecheck } from "@/app/api/cron/recheck/route";
import { CaseInput, type Case } from "@/lib/case";
import { publishCase, recheckCase } from "@/lib/cases";
import { verifyEvidence } from "@/lib/verify";

const stored = new Map<string, Case>();
vi.mock("@/lib/store", () => ({
  saveCase: vi.fn(async (c: Case) => void stored.set(c.id, structuredClone(c))),
  loadCase: vi.fn(async (id: string) => structuredClone(stored.get(id) ?? null)),
  listCases: vi.fn(async () => [...stored.values()].map((c) => ({ id: c.id, updatedAt: c.updatedAt }))),
}));
vi.mock("@/lib/verify", async (original) => ({
  ...(await original<typeof import("@/lib/verify")>()),
  verifyEvidence: vi.fn(),
}));
const fixture = CaseInput.parse({
  title: "Test household deadline",
  event: "move",
  jurisdiction: { country: "Finland" },
  summary: "Synthetic test case; no real household.",
  evidence: [{ n: 1, url: "https://www.kela.fi/test", title: "Test source", quote: "The application is due on Monday." }],
});
const verdict = (verification: "verified" | "not_found" | "unreachable") =>
  vi.mocked(verifyEvidence).mockImplementation(async (items) => items.map((e) => ({
    ...e, sourceType: "official", verification, match: verification === "verified" ? 1 : 0,
    fetchedAt: new Date().toISOString(), checkedVia: "live",
  })));
const call = () => scheduledRecheck(new Request("https://aidaddy.example/api/cron/recheck", {
  headers: { authorization: "Bearer isolated-test-secret" },
}));

beforeEach(() => {
  stored.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T06:00:00Z"));
  vi.stubEnv("CRON_SECRET", "isolated-test-secret");
  verdict("verified");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("scheduled source changes reaching a case and its bot watcher", () => {
  it("stores a scheduled page-change event, then tells the bot once even after the scheduler saw it", async () => {
    const { id } = await publishCase(fixture, "https://aidaddy.example");
    vi.setSystemTime(new Date("2026-11-15T08:00:00Z"));
    verdict("not_found");
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ checked: 1, withChanges: 1, cases: [{ id, changed: [1] }] });
    expect(stored.get(id)?.actions?.slice(-2).map((a) => a.trigger)).toEqual(["schedule", "page_change"]);
    expect((await recheckCase(id, "bot"))?.changed).toEqual([1]);
    expect((await recheckCase(id, "bot"))?.changed).toEqual([]);
  });

  it("keeps confirmed evidence when a page is unreachable and does not invent a change", async () => {
    const { id } = await publishCase(fixture, "https://aidaddy.example");
    vi.setSystemTime(new Date("2026-11-15T08:00:00Z"));
    verdict("unreachable");
    expect(await (await call()).json()).toMatchObject({ withChanges: 0, cases: [{ changed: [], unreachable: [1] }] });
    expect(stored.get(id)?.evidence[0].verification).toBe("verified");
  });

  it("does not spend another source read on a repeated scheduled request within an hour", async () => {
    await publishCase(fixture, "https://aidaddy.example");
    vi.setSystemTime(new Date("2026-11-15T08:00:00Z"));
    await call();
    vi.mocked(verifyEvidence).mockClear();
    expect(await (await call()).json()).toMatchObject({ checked: 0, skipped: 1 });
    expect(verifyEvidence).not.toHaveBeenCalled();
  });
});
