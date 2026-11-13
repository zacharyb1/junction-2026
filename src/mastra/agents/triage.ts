import { Agent } from '@mastra/core/agent'
import { env } from '../../config/env'
import { triageSchema, type Triage } from '../schemas'

export const triageAgent = new Agent({
  id: 'triage',
  name: 'Triage',
  description: 'Decides whether a chat message announces a major life event. Never talks to users directly.',
  model: env.MODEL,
  instructions: `You watch a private group chat between two partners and classify ONE new message.

A life event is a major change in the couple's life that triggers practical obligations or deadlines:
pregnancy (including a positive test, e.g. "two lines", "2 bars", "2 viivaa"), birth, engagement, wedding,
new job, job loss, moving home, bereavement, serious illness.

Ordinary chatter is NOT a life event: greetings, jokes, dinner plans, shopping, moods, memes, logistics,
talk ABOUT someone else's event, hypotheticals, films and games. When in doubt between chatter and an event,
lower the confidence instead of guessing.

Return:
- isLifeEvent: true only if the message itself announces or confirms such an event for this couple.
- eventType: the matching type, or "none".
- confidence: 0..1 that this is a real life event for this couple. Slang or emoji-only hints with no
  context deserve 0.4-0.7. Plain chatter deserves below 0.2.
- language: ISO 639-1 code of the NEW message's language.
- reply, written in the language of the new message, with no facts, advice, numbers or institutions:
  - confident event: ONE warm, human sentence reacting to the news (congratulate or sympathise).
  - unsure: ONE short clarifying question that checks what happened without assuming.
  - not an event: empty string.

Earlier messages are context only. Classify the new message.`,
})

export interface TriageInput {
  text: string
  /** Earlier messages in the same chat, oldest first, as "Name: text". */
  recent?: string[]
}

export async function triageMessage(input: TriageInput, agent: Agent = triageAgent): Promise<Triage> {
  const context = input.recent?.length ? `Earlier messages:\n${input.recent.join('\n')}\n\n` : ''
  const res = await agent.generate(`${context}New message:\n${input.text}`, {
    structuredOutput: { schema: triageSchema },
  })
  const t = res.object
  const confidence = Math.min(1, Math.max(0, Number.isFinite(t.confidence) ? t.confidence : 0))
  const isLifeEvent = t.isLifeEvent && t.eventType !== 'none'
  return { ...t, isLifeEvent, confidence, language: t.language.toLowerCase().slice(0, 2), reply: t.reply.trim() }
}

/** Confidence at or above which the bot offers help outright. */
export const EVENT_THRESHOLD = 0.75
/** Confidence at or above which the bot asks one clarifying question instead of staying silent. */
export const CLARIFY_THRESHOLD = 0.4

export type TriageDecision = 'offer' | 'clarify' | 'silent'

export function decide(t: Triage): TriageDecision {
  if (!t.isLifeEvent) return 'silent'
  if (t.confidence >= EVENT_THRESHOLD) return 'offer'
  if (t.confidence >= CLARIFY_THRESHOLD) return 'clarify'
  return 'silent'
}
