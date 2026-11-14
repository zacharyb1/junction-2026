import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as approve } from "@/app/api/cases/[id]/approve/route";
import { CaseInput, type Case } from "@/lib/case";
import { publishCase } from "@/lib/cases";

const stored = new Map<string, Case>();
vi.mock("@/lib/store", () => ({
  saveCase: vi.fn(async (c: Case) => void stored.set(c.id, structuredClone(c))),
  loadCase: vi.fn(async (id: string) => structuredClone(stored.get(id) ?? null)),
}));
vi.mock("@/lib/verify", async (original) => ({
  ...(await original<typeof import("@/lib/verify")>()),
  verifyEvidence: vi.fn(async (items: object[]) => items.map((e) => ({ ...e, verification: "verified", match: 1, fetchedAt: "2026-11-14T00:00:00Z" }))),
}));

const input = CaseInput.parse({
  title: "Expecting a baby",
  event: "pregnancy",
  jurisdiction: { country: "Finland" },
  summary: "S",
  drafts: [{ title: "Notice to employer", kind: "email", body: "Dear HR" }],
});

const call = (id: string, body: unknown) =>
  approve(new Request(`https://aidaddy.example/api/cases/${id}/approve`, { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => stored.clear());

describe("POST /api/cases/:id/approve", () => {
  it("approves the waiting proposal and hands back the draft to send yourself", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example");
    const index = stored.get(id)!.actions!.findIndex((a) => a.status === "waiting");
    const res = await call(id, { index });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action.status).toBe("approved");
    expect(body.draft).toMatchObject({ title: "Notice to employer", kind: "email", body: "Dear HR" });
  });

  it("answers 409 when there is nothing waiting at that index", async () => {
    const { id } = await publishCase(input, "https://aidaddy.example");
    expect((await call(id, { index: 0 })).status).toBe(409);
  });

  it("answers 404 for an unknown case and 400 for a bad body", async () => {
    expect((await call("nope", { index: 0 })).status).toBe(404);
    const { id } = await publishCase(input, "https://aidaddy.example");
    expect((await call(id, { index: -1 })).status).toBe(400);
    expect((await call(id, "x")).status).toBe(400);
  });
});
