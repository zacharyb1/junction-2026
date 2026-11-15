import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Case } from "@/lib/case";
import { ResearchInput, researchCase } from "@/lib/engine/research";
import { type FetchedPage } from "@/lib/verify";

const fixture = vi.hoisted(() => ({
  search: vi.fn(),
  pages: new Map<string, FetchedPage>(),
  stored: new Map<string, Case>(),
}));

vi.mock("exa-js", () => ({ default: class { search = fixture.search; } }));
vi.mock("@/lib/store", () => ({
  saveCase: vi.fn(async (value: Case) => void fixture.stored.set(value.id, structuredClone(value))),
  loadCase: vi.fn(async (id: string) => fixture.stored.get(id) ?? null),
}));
vi.mock("@/lib/verify", async (original) => ({
  ...(await original<typeof import("@/lib/verify")>()),
  fetchPages: vi.fn(async () => fixture.pages),
}));

beforeEach(() => {
  vi.stubEnv("EXA_API_KEY", "synthetic-no-network");
  fixture.pages.clear();
  fixture.stored.clear();
  fixture.search.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

async function assemble(title: string, quote: string, amount: string, sourceUrl = "https://www.tampere.fi/en/identity-card", due?: string) {
  fixture.pages.set(sourceUrl, { direct: quote, exa: null, oxylabs: null, text: quote });
  fixture.search.mockImplementation(async (_query: string, options: { outputSchema?: unknown }) => ({
    results: [],
    ...(options.outputSchema ? { output: { content: { title, steps: [{ title, quote, amount, due, sourceUrl }] } } } : {}),
  }));
  const result = await researchCase(ResearchInput.parse({ situation: title, country: "Finland" }), "https://aidaddy.example");
  return { result, caseFile: fixture.stored.get(result.id)! };
}

describe("Money assembled from source-supported time periods", () => {
  it("keeps a passport-photo age limit out of Money", async () => {
    const quote = "For an identity card application, you will need one passport photo which has been taken no longer than 6 months earlier.";
    const { caseFile, result } = await assemble("Apply for Finnish ID card at police station", quote, "6 months");
    expect(caseFile.evidence[0]).toMatchObject({ quote, verification: "verified" });
    expect(caseFile.steps).toHaveLength(1);
    expect(caseFile.money).toEqual([]);
    expect(result.plan[0]).not.toContain(": 6 months");
  });

  it("keeps the duration of a paid entitlement", async () => {
    const quote = "The parental allowance is paid for 160 working days per parent.";
    const { caseFile } = await assemble("Apply for parental allowance", quote, "160 working days", "https://www.kela.fi/parental-allowance");
    expect(caseFile.money).toEqual([{ label: "Apply for parental allowance", amount: "160 working days", evidence: [1] }]);
  });

  it("keeps the period an allowance is available for", async () => {
    const quote = "Parental allowance is available for up to 160 working days per parent.";
    const { caseFile } = await assemble("Apply for parental allowance", quote, "160 working days", "https://www.kela.fi/parental-allowance");
    expect(caseFile.money).toEqual([{ label: "Apply for parental allowance", amount: "160 working days", evidence: [1] }]);
  });

  it("does not borrow paid-leave context for a photo-age requirement", async () => {
    const quote = "To apply for paid parental leave, your passport photo must be no more than 6 months old.";
    const { caseFile } = await assemble("Apply for paid parental leave", quote, "6 months", "https://www.kela.fi/photo-example");
    expect(caseFile.evidence[0].verification).toBe("verified");
    expect(caseFile.money).toEqual([]);
  });

  it("does not borrow paid-leave context for passport validity", async () => {
    const quote = "To apply for paid parental leave, your passport must be valid for at least 6 months.";
    const { caseFile } = await assemble("Apply for paid parental leave", quote, "6 months", "https://www.kela.fi/passport-example");
    expect(caseFile.money).toEqual([]);
  });

  it("keeps a warranty coverage period", async () => {
    const quote = "The product warranty is valid for two years.";
    const { caseFile } = await assemble("Check the product warranty", quote, "two years", "https://www.kkv.fi/warranty-example");
    expect(caseFile.money).toEqual([{ label: "Check the product warranty", amount: "two years", evidence: [1] }]);
  });

  it.each([["160 working days", true], ["6 months", false]] as const)("classifies the selected period in a mixed sentence: %s", async (amount, retained) => {
    const quote = "Parental allowance is available for 160 working days, but your passport photo must be no more than 6 months old.";
    const { caseFile } = await assemble("Apply for parental allowance", quote, amount, "https://www.kela.fi/mixed-example");
    expect(caseFile.evidence[0].verification).toBe("verified");
    expect(caseFile.money).toEqual(retained ? [{ label: "Apply for parental allowance", amount, evidence: [1] }] : []);
  });

  it("does not infer the live photo age limit when the model leaves amount empty", async () => {
    const quote = "For an identity card application, you will need one passport photo which has been taken no longer than 6 months earlier.";
    const { caseFile } = await assemble("Apply for Finnish ID card at police station", quote, "");
    expect(caseFile.money).toEqual([]);
  });

  it("does not promote a qualified photo age limit from the quote", async () => {
    const { caseFile } = await assemble("Prepare an identity card photo", "The identity card photo must be at most 6 months old.", "");
    expect(caseFile.evidence[0].verification).toBe("verified");
    expect(caseFile.money).toEqual([]);
  });

  it("requires entitlement support in the quote rather than the step title", async () => {
    const quote = "For a parental allowance application, the passport photo must be at most 6 months old.";
    const { caseFile } = await assemble("Apply for parental allowance", quote, "6 months", "https://www.kela.fi/photo-example");
    expect(caseFile.money).toEqual([]);
  });

  it("still infers a qualified paid entitlement from its quote", async () => {
    const quote = "The parental allowance is paid for up to 160 working days per parent.";
    const { caseFile } = await assemble("Apply for parental allowance", quote, "", "https://www.kela.fi/parental-allowance");
    expect(caseFile.money).toEqual([{ label: "Apply for parental allowance", amount: "up to 160 working days", evidence: [1] }]);
  });

  it("keeps an identity-card application fee", async () => {
    const { caseFile } = await assemble("Apply for an identity card", "The identity card application fee is 60 euros.", "60 euros");
    expect(caseFile.money).toEqual([{ label: "Apply for an identity card", amount: "60 euros", evidence: [1] }]);
  });

  it.each([
    ["Request an airline refund", "The airline must refund your fare within seven days.", "within seven days"],
    ["Check a landlord's notice", "The landlord must give you at least two months' notice.", "at least two months"],
  ])("keeps someone else's duty as an entitlement: %s", async (title, quote, due) => {
    const { caseFile } = await assemble(title, quote, "", "https://www.kkv.fi/consumer-rights", due);
    expect(caseFile.steps[0].due).toBeUndefined();
    expect(caseFile.money).toEqual([expect.objectContaining({ amount: due, evidence: [1] })]);
  });
});
