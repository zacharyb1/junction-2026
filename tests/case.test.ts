import { describe, expect, it } from "vitest";
import { CaseInput, CasePatch, EvidenceInput, LIMITS } from "@/lib/case";

const evidence = { n: 1, url: "https://www.kela.fi/x", title: "Kela", quote: "A sentence from the page." };
const base = { title: "T", event: "e", jurisdiction: { country: "Finland" }, summary: "S" };

describe("EvidenceInput", () => {
  it("accepts web addresses only", () => {
    expect(EvidenceInput.safeParse(evidence).success).toBe(true);
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://kela.fi/x", "kela.fi/x"]) {
      expect(EvidenceInput.safeParse({ ...evidence, url }).success, url).toBe(false);
    }
  });

  it("limits the quote length", () => {
    expect(EvidenceInput.safeParse({ ...evidence, quote: "x".repeat(LIMITS.quote + 1) }).success).toBe(false);
  });
});

describe("CaseInput", () => {
  it("fills defaults for a minimal case", () => {
    const parsed = CaseInput.parse({ ...base, steps: [{ title: "Do it" }], evidence: [evidence] });
    expect(parsed.language).toBe("en");
    expect(parsed.steps[0]).toMatchObject({ status: "todo", evidence: [] });
    expect(parsed.evidence[0].sourceType).toBe("secondary");
    expect(parsed.money).toEqual([]);
  });

  it("enforces the size limits", () => {
    const steps = Array.from({ length: LIMITS.steps + 1 }, (_, i) => ({ title: `Step ${i}` }));
    expect(CaseInput.safeParse({ ...base, steps }).success).toBe(false);
  });
});

describe("CasePatch", () => {
  it("adds no defaults, so a field that is left out keeps its stored value", () => {
    const patch = CasePatch.parse({ steps: [{ title: "Do it", status: "done" }], money: [{ label: "Fee", amount: "5 €" }] });
    expect(patch.steps![0]).toEqual({ title: "Do it", status: "done" });
    expect(patch.money![0]).toEqual({ label: "Fee", amount: "5 €" });
    expect(Object.keys(CasePatch.parse({ evidence: [evidence] }).evidence![0])).not.toContain("sourceType");
  });
});
