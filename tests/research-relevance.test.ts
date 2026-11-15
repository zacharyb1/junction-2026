import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Case } from "@/lib/case";
import { applicabilityFor } from "@/lib/engine/applicability";
import { ResearchInput, researchCase } from "@/lib/engine/research";
import { saveCase } from "@/lib/store";
import { fetchPages, type FetchedPage } from "@/lib/verify";

const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("exa-js", () => ({ default: class { search = search; } }));
vi.mock("@/lib/store", () => ({ saveCase: vi.fn(), loadCase: vi.fn() }));
vi.mock("@/lib/verify", async (original) => ({
  ...(await original<typeof import("@/lib/verify")>()),
  fetchPages: vi.fn(),
}));

// Public source sentences captured from the fresh Telegram Case. No private Case
// ID, names or draft text is needed to reproduce the applicability failure.
const relocationUrl = "https://www.tampere.fi/en/relocation-guide-tampere/moving-tampere";
const domestic = {
  title: "Submit a notification of move",
  sourceUrl: "https://dvv.fi/muutot_uusi",
  quote: "Tee muuttoilmoitus aikaisintaan kuukautta ennen muuttopäivää ja viimeistään viikon kuluttua muutosta.",
};
const internationalOnly = [
  {
    title: "Apply for a residence permit",
    sourceUrl: relocationUrl,
    quote: "Before moving to Finland to be with a family member (spouse, partner or child), you need to apply for a residence permit based on family ties from the Finnish Immigration Service (Migri).",
  },
  {
    title: "Notify Kela of your move to Finland",
    sourceUrl: "https://www.kela.fi/moving-to-finland",
    quote: "2. Tell Kela that you have moved to Finland by submitting a notification in OmaKela.",
  },
  {
    title: "Prove identity at an embassy or service point",
    sourceUrl: relocationUrl,
    quote: "After your residence permit is submitted, you must visit a Finnish Embassy or Consulate to prove your identity, to present the original copies of the attachments required for your application and to have your fingerprints taken.",
  },
];

const input = ResearchInput.parse({
  situation: "We live in Helsinki, Finland and are moving to Tampere on 1 December 2026. We have not checked what paperwork needs doing.",
  country: "FI",
  region: "Helsinki",
  household: "Two adults: me and my partner, no children. We already live in Helsinki, Finland.",
  language: "en",
  depth: "fast",
  scope: "official",
});

function extraction(steps: (typeof domestic & { pageTitle?: string })[], extra: { summary?: string; questions?: string[] } = {}) {
  search.mockImplementation(async (_query: string, options: { outputSchema?: unknown }) => {
    if (!options.outputSchema) return { results: [] }; // First-look/news pointers do not enter the plan.
    return {
      results: steps.map((step) => ({ url: step.sourceUrl, title: step.pageTitle ?? "Official moving guidance" })),
      output: { content: {
        title: "Moving to Tampere Checklist", summary: "Notify the authorities of the move.",
        steps: steps.map((step) => Object.fromEntries(Object.entries(step).filter(([key]) => key !== "pageTitle"))), ...extra,
      } },
    };
  });
  const texts = new Map<string, string>();
  for (const step of steps) texts.set(step.sourceUrl, [texts.get(step.sourceUrl), step.quote].filter(Boolean).join("\n"));
  vi.mocked(fetchPages).mockImplementation(async (urls) => new Map(urls.map((url) => {
    const text = texts.get(url);
    const page: FetchedPage = text ? { direct: text, exa: null, oxylabs: null, text } : null;
    return [url, page];
  })));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EXA_API_KEY", "offline-fixture");
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network call in offline research fixture"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("research applicability with preserved domestic-move context", () => {
  it.each(internationalOnly)("excludes $title while retaining the domestic notification", async (irrelevant) => {
    extraction([irrelevant, domestic]);
    const result = await researchCase(input, "https://case.example");
    const saved = vi.mocked(saveCase).mock.calls[0][0] as Case;

    // The actual Engine sent both the origin and household to extraction. This
    // regression must still fail when the bot has preserved all supplied context.
    const objectives = search.mock.calls.filter(([, options]) => options.outputSchema).map(([, options]) => options.objective);
    expect(objectives.length).toBeGreaterThan(0);
    for (const objective of objectives) {
      expect(objective).toContain(input.situation);
      expect(objective).toContain(input.household);
    }
    // Keep real quote verification and Case publication: text authenticity alone
    // must not turn an arrival-in-Finland requirement into a domestic-move task.
    expect(saved.evidence.every((item) => item.verification === "verified")).toBe(true);
    expect(result.plan.some((line) => line.startsWith(domestic.title))).toBe(true);
    expect.soft(saved.steps.map((step) => step.title)).not.toContain(irrelevant.title);
    expect(result.plan.some((line) => line.startsWith(irrelevant.title))).toBe(false);
    expect(result.unverified.join(" ")).toContain("arrival or initial-application prerequisite");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps a supported domestic notification through real verification", async () => {
    extraction([domestic]);
    const result = await researchCase(input, "https://case.example");
    expect(result.evidenceVerified).toBe(1);
    expect(result.plan).toHaveLength(1);
    expect(result.plan[0]).toContain(domestic.title);
  });

  it("reports a research failure if every proposed task has an inapplicable prerequisite", async () => {
    extraction([internationalOnly[0]]);
    await expect(researchCase(input, "https://case.example")).rejects.toMatchObject({ status: 502 });
    expect(saveCase).not.toHaveBeenCalled();
  });

  it("checks the quote even when a local title hides its arrival prerequisite", async () => {
    const laundered = { ...internationalOnly[1], title: "Notify Kela of your move to Tampere" };
    extraction([laundered, domestic], {
      summary: "Tell Kela that you have moved to Finland. Submit a notification of move.",
      questions: ["What is your citizenship?", "Do you currently have a Finnish personal identity code?", "Are you renting your current home?"],
    });
    const result = await researchCase({ ...input, household: "Home for us is Helsinki, Finland. It's just me and my partner, no children." }, "https://case.example");
    const saved = vi.mocked(saveCase).mock.calls[0][0];
    expect(saved.steps.map((step) => step.title)).toEqual([domestic.title]);
    expect(saved.summary).not.toContain("moved to Finland");
    expect(result.openQuestions).toEqual(["Are you renting your current home?"]);
  });

  it("recognises the preserved context from the actual six-skill MCP arguments", async () => {
    extraction([internationalOnly[0], domestic]);
    const result = await researchCase({
      ...input,
      situation: "Moving from Helsinki to Tampere on 1 December 2026, Finland. Just me and my partner, no children. Haven't checked what paperwork needs doing.",
      household: "Home: Helsinki, Finland. Household: me and partner, no children. Moving to Tampere on 1 December 2026.",
      region: "Tampere",
    }, "https://case.example");
    expect(result.plan).toHaveLength(1);
    expect(result.plan[0]).toContain(domestic.title);
    expect(result.unverified.join(" ")).toContain(internationalOnly[0].title);
  });

  it("withholds the initial country-residence application captured in the first failed live repair", async () => {
    const initialResidence = {
      title: "Register municipality of residence at DVV",
      detail: "If you intend to stay in Finland for more than a year and need to register a municipality of residence, you must visit a DVV service location in person within one month of submitting your application.",
      sourceUrl: "https://lomakkeet.dvv.fi/lomakkeet/6889/lomakkeet.html?rinnakkaislomake=en",
      quote: "Please note that in addition to sending the form, you must also personally visit a service location of the Digital and Population Data Services Agency within one month of sending the form.",
    };
    extraction([initialResidence, domestic], {
      summary: "You must also apply to register your municipality of residence and visit a DVV service location in person.",
      questions: ["Do you already reside in Finland or are you moving from abroad?"],
    });
    const result = await researchCase({
      ...input,
      situation: "Moving from Helsinki to Tampere on 1 December 2026, Finland. Just me and my partner, no children. Haven't checked what paperwork needs doing.",
      household: "Home: Helsinki, Finland. Household: me and partner, no children.",
    }, "https://case.example");
    const saved = vi.mocked(saveCase).mock.calls[0][0];
    expect.soft(saved.steps.map((step) => step.title)).toEqual([domestic.title]);
    expect.soft(saved.summary).not.toContain("municipality of residence");
    expect.soft(result.openQuestions).toEqual([]);
    expect(result.plan.some((line) => line.startsWith(initialResidence.title))).toBe(false);
  });

  it("preserves source scope when the second failed live repair quotes only an arrival-page salary threshold", async () => {
    const arrivalBenefit = {
      title: "Apply for Kela benefits if working in Finland",
      detail: "If you are working in Finland, you can apply for Kela benefits if you earn at least the specified minimum monthly salary.",
      sourceUrl: "https://www.kela.fi/moving-to-finland",
      pageTitle: "Moving to Finland | Our Services | Kela",
      quote: "Working in Finland qualifies you for Kela benefits only if you earn at least EUR 800.02 per month in salary or wages from the work you do in Finland.",
    };
    extraction([arrivalBenefit, domestic], {
      questions: ["Are you moving within Finland or arriving from abroad?", "Will you be living in Finland permanently or working in Finland?"],
    });
    const result = await researchCase(input, "https://case.example");
    const saved = vi.mocked(saveCase).mock.calls[0][0];
    expect.soft(saved.steps.map((step) => step.title)).toEqual([domestic.title]);
    expect.soft(result.openQuestions).toEqual([]);
    expect(result.plan).toHaveLength(1);
  });

  it.each([
    "Is your current address in Finland?",
    "Are you moving to Finland from abroad or moving within Finland?",
  ])("removes the answered question captured after the verified live plan: %s", async (answered) => {
    const unknownStatus = "Are you already registered as a resident in Finland?";
    extraction([domestic], { questions: [answered, unknownStatus] });
    const result = await researchCase(input, "https://case.example");
    expect(result.openQuestions).toEqual([unknownStatus]);
    expect(result.plan[0]).toContain(domestic.title);
  });

  it.each([
    "I live in Helsinki, Finland. My partner is moving from India to Finland to join me.",
    "I live in Helsinki, Finland. My partner needs to complete a residence permit application.",
  ])("preserves initial-arrival work explicitly supplied in the household: %s", async (household) => {
    extraction([internationalOnly[0], domestic]);
    const result = await researchCase({
      ...input,
      situation: "We are moving to a new home in Tampere next month. What paperwork is needed?",
      household,
    }, "https://case.example");
    expect(result.plan.some((line) => line.startsWith(internationalOnly[0].title))).toBe(true);
    expect(result.unverified).toEqual([]);
  });

  it("preserves an address-change alternative in the same sentence as country arrival", async () => {
    const combined = {
      ...domestic,
      quote: "Notify the authorities when moving to Finland or when your address changes.",
      pageTitle: "Moving to Finland",
    };
    extraction([combined]);
    const result = await researchCase(input, "https://case.example");
    expect(result.plan).toHaveLength(1);
    expect(result.evidence[0].quote).toBe(combined.quote);
  });
});

describe("the deliberately limited current-residence prerequisite check", () => {
  const task = "We're moving to another town on 1 December 2026 and need the paperwork.";
  const arrival = internationalOnly[0];

  it.each([
    "Home for us is Helsinki, Finland.",
    "Our home is Helsinki, Finland.",
    "We already live in Helsinki, Finland.",
    "We are currently living in Finland.",
    "They currently reside in Finland.",
    "Current residence: Helsinki, Finland.",
    "Home: Helsinki, Finland.",
  ])("recognises an explicit present residence: %s", (household) => {
    expect(applicabilityFor({ situation: task, household }, "Finland").exclusion(arrival)).toBe("arrival_in_current_country");
  });

  it.each([
    "We do not live in Finland.",
    "We don't live in Finland.",
    "If we live in Finland, what changes?",
    "We might live in Finland someday.",
    "We will live in Finland next year.",
    "We used to live in Finland.",
    "Home for us is not Finland.",
    "The guide says we live in Finland.",
    "We live in Helsinki.",
    "We live in Sweden and want to move to Finland.",
    "New home: Tampere, Finland.",
    "Future home: Tampere, Finland.",
    "Former home: Helsinki, Finland.",
  ])("does not infer current residence from %s", (household) => {
    expect(applicabilityFor({ situation: task, household }, "Finland").exclusion(arrival)).toBeUndefined();
  });

  it.each([
    "We're moving from India to Finland to join our partner.",
    "We're returning to Finland after living abroad.",
    "We're moving to another town and need to renew our residence permits.",
    "We're moving to another town and need to finish a residence permit application.",
    "My partner is moving from India to Finland to live with me.",
  ])("preserves an explicit international or immigration task: %s", (situation) => {
    const check = applicabilityFor({ situation, household: "Home for us is Helsinki, Finland." }, "Finland");
    expect(check.exclusion(arrival)).toBeUndefined();
    expect(check.keepQuestion("What is your citizenship?")).toBe(true);
  });

  it("does not infer permanent residence or remove conditional benefits", () => {
    const check = applicabilityFor({ situation: task, household: "We live in Finland." }, "Finland");
    expect(check.exclusion({ title: "Check eligibility for housing allowance", quote: "You can receive benefits if you live in Finland permanently." })).toBeUndefined();
  });

  it("does not treat residence in one country as residence in the destination country", () => {
    const check = applicabilityFor({ situation: "We live in Finland and are moving to Sweden.", household: "Two adults." }, "Sweden");
    expect(check.exclusion({ title: "Register on arrival", quote: "Upon arrival in Sweden, register your address." })).toBeUndefined();
  });

  it("uses the named country rather than hardcoded Finnish cities", () => {
    const check = applicabilityFor({ situation: task, household: "We live in Uppsala, Sweden." }, "Sweden");
    expect(check.exclusion({ quote: "Upon arrival in Sweden, register your address." })).toBe("arrival_in_current_country");
  });

  it("does not apply stale household residence against an explicit correction", () => {
    const check = applicabilityFor({ situation: "We no longer live in Finland. We're moving next month.", household: "We live in Finland." }, "Finland");
    expect(check.exclusion(arrival)).toBeUndefined();
  });

  it("uses an explicitly named origin country without looking up either city", () => {
    const check = applicabilityFor({ situation: "Moving from our home in Helsinki, Finland to Tampere next month." }, "Finland");
    expect(check.exclusion(arrival)).toBe("arrival_in_current_country");
    const ambiguous = applicabilityFor({ situation: "Moving from Helsinki to Tampere next month, Finland." }, "Finland");
    expect(ambiguous.exclusion(arrival)).toBeUndefined();
  });

  it("does not absorb a later destination into the stated residence location", () => {
    const check = applicabilityFor({ situation: "We live in Sweden, moving to Tampere in Finland next month." }, "Finland");
    expect(check.exclusion(arrival)).toBeUndefined();
  });

  it("keeps a rule whose quoted scope explicitly includes moves within the country", () => {
    const check = applicabilityFor({ situation: task, household: "We live in Finland." }, "Finland");
    expect(check.exclusion({
      title: domestic.title,
      quote: "You must submit a notification of move when moving within Finland or moving to Finland from abroad.",
    })).toBeUndefined();
  });

  it("keeps domestic local address registration without an initial country-residence application", () => {
    const check = applicabilityFor({ situation: "We live in Germany and are moving from Berlin to Hamburg." }, "Germany");
    expect(check.exclusion({
      title: "Register your new address at the municipal office",
      quote: "If you move within Germany, register your new address with the local registration office.",
    })).toBeUndefined();
  });

  it("preserves an initial application when recent arrival is explicitly supplied in the household", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland. We just arrived in Finland last week and our residence permit application is pending." }, "Finland");
    expect(check.exclusion(internationalOnly[2])).toBeUndefined();
  });

  it("does not ask again whether the family resides in the country it named as home", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.keepQuestion("Do you already reside in Finland or are you moving from abroad?")).toBe(false);
  });

  it("still checks arrival prerequisites after a recent domestic move", () => {
    const check = applicabilityFor({ situation: "We live in Finland and recently moved from Helsinki to Tampere. What paperwork do we need?" }, "Finland");
    expect(check.exclusion(arrival)).toBe("arrival_in_current_country");
  });

  it("keeps unknown permanence and eligibility questions separate from current location", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.keepQuestion("Do you live in Finland permanently?")).toBe(true);
    expect(check.keepQuestion("Do you live in Finland and receive housing allowance?")).toBe(true);
    expect(check.keepQuestion("Do you live in Finland permanently?", "This benefit is available if you live in Finland permanently.")).toBe(true);
    expect(check.keepQuestion("Do you live in Finland permanently?", "Submit a notification when your address changes.")).toBe(false);
  });

  it("does not apply arrival-only page scope to a page covering both kinds of move", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.exclusion({
      title: domestic.title, quote: "Notify the authorities when your address changes.",
      sourceTitle: "Moving within Finland or moving to Finland from abroad",
    })).toBeUndefined();
  });

  it("does not remove a conditional benefit from a source without an arrival prerequisite", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.exclusion({ title: "Check benefit eligibility", quote: "Working in Finland qualifies you for benefits if you meet the income requirement.", sourceTitle: "Benefits for residents" })).toBeUndefined();
  });

  it("preserves an independently stated address-change rule even on a newcomer page", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.exclusion({ title: domestic.title, quote: "Notify the authorities when your address changes.", sourceTitle: "Moving to Finland" })).toBeUndefined();
    expect(check.exclusion({ title: "Register your new address", quote: "Upon arrival in Finland, register your new address.", sourceTitle: "Moving to Finland" })).toBe("arrival_in_current_country");
  });

  it("keeps an arrival prerequisite that governs the address-change condition", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    expect(check.exclusion({ title: domestic.title, quote: "Upon arrival in Finland, notify the authorities when your address changes." })).toBe("arrival_in_current_country");
    expect(check.exclusion({ title: domestic.title, quote: "Upon arrival in Finland, notify the authorities when your passport expires or when your address changes." })).toBe("arrival_in_current_country");
  });

  it("drops plural citizenship questions from discarded arrival rules but preserves a retained eligibility condition", () => {
    const check = applicabilityFor({ situation: task, household: "Home: Helsinki, Finland." }, "Finland");
    const question = "Are you Nordic, EU, or non-EU citizens?";
    expect(check.keepQuestion(question, "Report your change of address.")).toBe(false);
    expect(check.keepQuestion(question, "Eligibility for this benefit depends on whether you are an EU citizen.")).toBe(true);
  });

  it("suppresses a municipality question only when that distinction was explicitly supplied", () => {
    const question = "Are you moving from another municipality within Finland?";
    const explicit = applicabilityFor({ situation: "We live in Finland and are moving to another municipality.", household: "Two adults." }, "Finland");
    expect(explicit.keepQuestion(question)).toBe(false);
    const ambiguous = applicabilityFor({ situation: "We live in Finland and are moving next month." }, "Finland");
    expect(ambiguous.keepQuestion(question)).toBe(true);
  });
});
