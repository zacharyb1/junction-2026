import { z } from "zod";

/**
 * The case contract. Hermes produces this through the `case_publish` MCP tool,
 * the web app stores it and renders it at /c/[id].
 * Keep it small: a language model has to fill it in reliably.
 */

export const LIMITS = {
  steps: 8,
  money: 6,
  evidence: 12,
  drafts: 4,
  quote: 400,
} as const;

const evidenceRefs = z
  .array(z.number().int().positive())
  .default([])
  .describe("Numbers of the evidence items that support this line.");

export const EvidenceInput = z.object({
  n: z.number().int().positive().describe("Citation number, starting at 1."),
  url: z.url().describe("Exact URL of the page that was read."),
  title: z.string().min(1).max(200),
  publisher: z.string().max(120).optional().describe("Who runs the page, e.g. Kela."),
  quote: z
    .string()
    .min(8)
    .max(LIMITS.quote)
    .describe("Sentence copied word for word from the page, in the page's own language."),
  quoteTranslation: z
    .string()
    .max(LIMITS.quote)
    .optional()
    .describe("Translation of the quote into the user's language, if different."),
  pageDate: z.string().max(40).optional().describe("Published or updated date shown on the page."),
  sourceType: z.enum(["official", "secondary"]).default("secondary"),
  priorBelief: z
    .string()
    .max(300)
    .optional()
    .describe("What the model believed from memory before searching, only if the page says otherwise."),
});

export const StepInput = z.object({
  id: z.string().max(40).optional(),
  title: z.string().min(1).max(140),
  detail: z.string().max(600).optional(),
  owner: z.string().max(60).optional().describe("Household member who does this."),
  due: z.string().max(120).optional().describe("ISO date YYYY-MM-DD when known, otherwise a short phrase."),
  status: z.enum(["todo", "needs_approval", "done"]).default("todo"),
  confidence: z.enum(["low", "medium", "high"]).optional().describe("Exa's grounding confidence for this step, when known."),
  conflict: z
    .string()
    .max(400)
    .optional()
    .describe("Set when two sources give different figures for this step. Names both, so the reader can check which applies."),
  evidence: evidenceRefs,
});

export const MoneyInput = z.object({
  label: z.string().min(1).max(120),
  amount: z.string().min(1).max(120).describe("Amount exactly as the source states it."),
  note: z.string().max(300).optional(),
  evidence: evidenceRefs,
});

export const DraftInput = z.object({
  id: z.string().max(40).optional(),
  title: z.string().min(1).max(140),
  kind: z.enum(["email", "letter", "checklist"]).default("letter"),
  body: z.string().min(1).max(6000),
});

export const CaseInput = z.object({
  title: z.string().min(1).max(140),
  event: z.string().min(1).max(60).describe("Short slug, e.g. pregnancy, rent_increase_letter."),
  language: z.string().min(2).max(20).default("en"),
  jurisdiction: z.object({
    country: z.string().min(2).max(60),
    region: z.string().max(80).optional(),
  }),
  summary: z.string().min(1).max(800),
  steps: z.array(StepInput).max(LIMITS.steps).default([]),
  money: z.array(MoneyInput).max(LIMITS.money).default([]),
  evidence: z.array(EvidenceInput).max(LIMITS.evidence).default([]),
  drafts: z.array(DraftInput).max(LIMITS.drafts).default([]),
  unverified: z
    .array(z.string().max(300))
    .max(10)
    .default([])
    .describe("Claims the agent could not back with a source."),
  openQuestions: z.array(z.string().max(300)).max(10).default([]),
});

// Patch items carry no defaults: a field that is left out keeps its stored value.
const optionalRefs = z.array(z.number().int().positive()).optional();
const StepPatch = StepInput.extend({ status: z.enum(["todo", "needs_approval", "done"]).optional(), evidence: optionalRefs });
const MoneyPatch = MoneyInput.extend({ evidence: optionalRefs });
const EvidencePatch = EvidenceInput.extend({ sourceType: z.enum(["official", "secondary"]).optional() });

export const CasePatch = z.object({
  title: z.string().min(1).max(140).optional(),
  summary: z.string().min(1).max(800).optional(),
  steps: z
    .array(StepPatch)
    .max(LIMITS.steps)
    .optional()
    .describe("Updates steps with the same title (fields you leave out are kept), appends new ones."),
  money: z.array(MoneyPatch).max(LIMITS.money).optional(),
  evidence: z.array(EvidencePatch).max(LIMITS.evidence).optional().describe("Replaces items with the same n, appends new ones."),
  drafts: z.array(DraftInput).max(LIMITS.drafts).optional(),
  unverified: z.array(z.string().max(300)).max(10).optional(),
  openQuestions: z.array(z.string().max(300)).max(10).optional(),
});

export type CaseInput = z.infer<typeof CaseInput>;
export type CasePatch = z.infer<typeof CasePatch>;
export type EvidenceInput = z.infer<typeof EvidenceInput>;

export type Verification = "verified" | "not_found" | "unreachable";

export type Evidence = EvidenceInput & {
  fetchedAt: string;
  verification: Verification;
  /** Share of the quote's word windows found on the page, 0 to 1. */
  match: number;
  /**
   * live: found by our own request to the page. oxylabs: found on a live read through Oxylabs,
   * for pages that refuse our request. exa: found in Exa's reading of the page.
   */
  checkedVia?: "live" | "exa" | "oxylabs";
};

export type Step = z.infer<typeof StepInput> & { id: string };
export type Draft = z.infer<typeof DraftInput> & { id: string };

/** How the case was researched: every search and page read, with timing. Shown on the case page. */
export type Trail = {
  ms: number;
  searches: number;
  pagesRead: number;
  costDollars: number;
  officialDomains: number;
  /** Pages opened by each reader. */
  readers?: { live: number; exa: number; oxylabs: number };
  events: { ms: number; detail: string }[];
};

export type Case = Omit<CaseInput, "evidence" | "steps" | "drafts"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  evidence: Evidence[];
  steps: Step[];
  drafts: Draft[];
  trail?: Trail;
};

export function verifiedCount(c: Pick<Case, "evidence">) {
  return c.evidence.filter((e) => e.verification === "verified").length;
}
