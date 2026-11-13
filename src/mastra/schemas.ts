import { z } from 'zod'

/** One sourced fact. Every field except `claim` is copied from an Exa result, never written by the model. */
export const evidenceSchema = z.object({
  claim: z.string(),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  /** ISO date. The page's published date when Exa has one, otherwise the day we retrieved it. */
  publishedOrCrawledDate: z.string(),
  dateKind: z.enum(['published', 'retrieved']),
  /** Verbatim excerpt from the Exa highlight that supports the claim. */
  quote: z.string(),
})
export type Evidence = z.infer<typeof evidenceSchema>

export const topicResultSchema = z.object({
  topic: z.string(),
  label: z.string(),
  evidence: z.array(evidenceSchema),
  /** Why there is no evidence, when there is none. */
  note: z.string().optional(),
})
export type TopicResult = z.infer<typeof topicResultSchema>

export const planItemSchema = z.object({
  title: z.string(),
  evidence: z.array(evidenceSchema).min(1),
})
export const planSchema = z.object({
  items: z.array(planItemSchema),
  /** Topics for which research found nothing usable. Shown to the couple as such. */
  missing: z.array(z.string()),
})
export type Plan = z.infer<typeof planSchema>

export const EVENT_TYPES = [
  'pregnancy',
  'birth',
  'engagement',
  'wedding',
  'new_job',
  'job_loss',
  'moving_home',
  'bereavement',
  'serious_illness',
  'other',
  'none',
] as const

export const triageSchema = z.object({
  isLifeEvent: z.boolean(),
  eventType: z.enum(EVENT_TYPES),
  /** 0..1: how sure the model is that this message announces a life event. */
  confidence: z.number(),
  /** ISO 639-1 code of the message language, e.g. "en", "fi". */
  language: z.string(),
  /** A warm one-liner (clear event), one short clarifying question (unsure), or "" (no event). */
  reply: z.string(),
})
export type Triage = z.infer<typeof triageSchema>
