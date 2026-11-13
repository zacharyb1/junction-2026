import { Agent } from '@mastra/core/agent'
import { z } from 'zod'
import { env } from '../../config/env'
import type { ExaSearchOutput } from '../tools/exa'
import type { Evidence, Plan, TopicResult } from '../schemas'

export const researcherAgent = new Agent({
  id: 'researcher',
  name: 'Researcher',
  description: 'Turns Exa search results into quoted claims and arranges them into a plan. Adds no facts of its own.',
  model: env.MODEL,
  instructions: `You work only from the search results you are given. You have no other knowledge.
Never add a fact, number, deadline, amount or institution that is not literally supported by a provided excerpt.
If the excerpts do not answer the question, return nothing for it. An empty answer is a correct answer.`,
})

const extractionSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      resultIndex: z.number(),
      quote: z.string(),
    }),
  ),
})

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’“”"'`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Ask the model for claims backed by verbatim quotes, then verify in code that every quote
 * really appears in the highlights of the result it points at. Claims that fail are dropped,
 * and url, title and date are always copied from the Exa result, never from the model.
 */
export async function extractEvidence(args: {
  question: string
  language: string
  search: ExaSearchOutput
  maxClaims?: number
  agent?: Agent
}): Promise<Evidence[]> {
  const usable = args.search.results.filter((r) => r.highlights.length > 0)
  if (usable.length === 0) return []
  const maxClaims = args.maxClaims ?? 3

  const sources = usable
    .map((r, i) => `[#${i + 1}] ${r.title}\nURL: ${r.url}\nExcerpts:\n${r.highlights.map((h) => `- ${h}`).join('\n')}`)
    .join('\n\n')

  const res = await (args.agent ?? researcherAgent).generate(
    `Question: ${args.question}

Search results:
${sources}

Extract at most ${maxClaims} claims that help answer the question for someone who must act in the next 7 days.
For each claim:
- claim: one plain sentence, max 180 characters, written in language "${args.language}". Concrete and actionable.
- resultIndex: the # of the result it comes from.
- quote: a passage copied character for character from that result's excerpts (in the original language,
  10 to 300 characters) that supports the claim.
Skip anything the excerpts do not clearly state. Return an empty list if nothing is relevant.`,
    { structuredOutput: { schema: extractionSchema } },
  )

  const evidence: Evidence[] = []
  for (const c of res.object.claims) {
    const source = usable[Math.round(c.resultIndex) - 1]
    if (!source) continue
    const quote = c.quote.trim()
    if (quote.length < 10) continue
    if (!norm(source.highlights.join(' ')).includes(norm(quote))) continue
    const published = source.publishedDate ?? source.snapshotAt
    evidence.push({
      claim: c.claim.trim(),
      sourceUrl: source.url,
      sourceTitle: source.title,
      publishedOrCrawledDate: (published ?? args.search.fetchedAt).slice(0, 10),
      dateKind: published ? 'published' : 'retrieved',
      quote,
    })
    if (evidence.length >= maxClaims) break
  }
  return evidence
}

const planDraftSchema = z.object({
  items: z.array(z.object({ title: z.string(), evidenceIds: z.array(z.number()) })),
})

/**
 * Arrange verified evidence into 3 to 5 "next 7 days" items. The model only writes a short title
 * per item and picks evidence ids; the facts shown to users are the verified claims themselves.
 */
export async function composePlan(args: { topics: TopicResult[]; language: string; agent?: Agent }): Promise<Plan> {
  const all = args.topics.flatMap((t) => t.evidence.map((e) => ({ topic: t.label, e })))
  const missing = args.topics.filter((t) => t.evidence.length === 0).map((t) => t.label)
  if (all.length === 0) return { items: [], missing }

  const list = all.map((x, i) => `E${i + 1} [${x.topic}] ${x.e.claim}`).join('\n')
  const res = await (args.agent ?? researcherAgent).generate(
    `Verified facts:
${list}

Group these into 3 to 5 things this couple should do in the next 7 days (fewer if there are fewer facts),
most urgent first. For each item:
- title: a short imperative heading in language "${args.language}", max 60 characters, containing no facts,
  numbers or dates of its own (e.g. "Book the first clinic visit").
- evidenceIds: 1 or 2 numbers of the facts above that the item rests on. Use each fact at most once.
Do not invent items that no fact supports.`,
    { structuredOutput: { schema: planDraftSchema } },
  )

  const used = new Set<number>()
  const items: Plan['items'] = []
  for (const it of res.object.items) {
    const evidence: Evidence[] = []
    for (const id of it.evidenceIds) {
      const idx = Math.round(id) - 1
      const hit = all[idx]
      if (!hit || used.has(idx) || evidence.length >= 2) continue
      used.add(idx)
      evidence.push(hit.e)
    }
    if (evidence.length > 0 && it.title.trim()) items.push({ title: it.title.trim().slice(0, 80), evidence })
    if (items.length >= 5) break
  }
  return { items, missing }
}
