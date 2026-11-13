import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { loadProfile } from '../../config/profile'
import { getChat, postToThread } from '../../telegram/chat'
import { t } from '../../telegram/i18n'
import { dropProgress, ProgressBoard, progressFor, registerProgress } from '../../telegram/progress'
import { hrDraftMessage, planCard, planCardDone } from '../../telegram/render'
import { composePlan, extractEvidence, researcherAgent } from '../agents/researcher'
import { evidenceSchema, planSchema, topicResultSchema, type Evidence, type TopicResult } from '../schemas'
import { ExaUnavailableError, exaSearch, type ExaSearchInput } from '../tools/exa'

export const LIFE_EVENT_PLAN_ID = 'life-event-plan'
export const HR_APPROVAL_STEP_ID = 'hr-approval'

const inputSchema = z.object({
  /** Chat SDK thread id, e.g. telegram:-100123. */
  threadId: z.string(),
  /** ISO 639-1 language of the message that started this. */
  language: z.string(),
  eventType: z.string(),
  eventText: z.string(),
})
type Input = z.infer<typeof inputSchema>

const TOPICS = {
  kela: { en: 'Kela benefits', fi: 'Kelan etuudet' },
  clinic: { en: 'Maternity clinic', fi: 'Äitiysneuvola' },
  employers: { en: 'Employer leave terms', fi: 'Työnantajien vapaaehdot' },
} as const
type TopicKey = keyof typeof TOPICS
const label = (key: TopicKey, language: string) => (language === 'fi' ? TOPICS[key].fi : TOPICS[key].en)

const dedupe = (items: Evidence[]) => {
  const seen = new Set<string>()
  return items.filter((e) => {
    const k = `${e.sourceUrl}|${e.quote}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Run Exa searches for one topic and keep only quote-verified claims. Never throws: a failure is "nothing found". */
async function researchTopic(args: {
  runId: string
  key: TopicKey
  language: string
  searches: { search: ExaSearchInput; question: string; maxClaims?: number }[]
}): Promise<{ result: TopicResult; perSearch: Evidence[][] }> {
  const board = progressFor(args.runId)
  board?.set(args.key, 'running')
  const perSearch: Evidence[][] = []
  const notes: string[] = []
  let pages = 0
  await Promise.all(
    args.searches.map(async (s, i) => {
      try {
        const search = await exaSearch(s.search)
        pages += search.results.length
        perSearch[i] = await extractEvidence({
          question: s.question,
          language: args.language,
          search,
          maxClaims: s.maxClaims,
        })
      } catch (err) {
        perSearch[i] = []
        notes.push(err instanceof ExaUnavailableError ? err.message : `search failed: ${(err as Error).message}`)
        console.warn(`[research:${args.key}]`, (err as Error).message)
      }
    }),
  )
  const evidence = dedupe(perSearch.flat())
  const failed = notes.length === args.searches.length
  board?.set(
    args.key,
    evidence.length > 0 ? 'done' : failed ? 'failed' : 'empty',
    evidence.length > 0 ? `${evidence.length} sourced, ${pages} pages read` : undefined,
  )
  return {
    result: {
      topic: args.key,
      label: label(args.key, args.language),
      evidence,
      note: evidence.length === 0 ? notes.join('; ') || 'no excerpt answered the question' : undefined,
    },
    perSearch: args.searches.map((_, i) => perSearch[i] ?? []),
  }
}

/** Posts the single progress message that later steps edit in place. */
const announce = createStep({
  id: 'announce',
  inputSchema,
  outputSchema: inputSchema,
  execute: async ({ inputData, runId, mastra }) => {
    if (getChat(mastra)) {
      const board = new ProgressBoard((text) => postToThread(mastra, inputData.threadId, text), inputData.language)
      for (const key of Object.keys(TOPICS) as TopicKey[]) board.add(key, label(key, inputData.language))
      registerProgress(runId, board)
      await board.start()
    }
    return inputData
  },
})

const researchKela = createStep({
  id: 'research-kela',
  inputSchema,
  outputSchema: topicResultSchema,
  execute: async ({ inputData, runId }) => {
    const { result } = await researchTopic({
      runId,
      key: 'kela',
      language: inputData.language,
      searches: [
        {
          search: {
            query: 'Raskaana: mitä Kelan etuuksia haetaan, milloin ja millä todistuksella',
            includeDomains: ['kela.fi'],
            userLocation: 'FI',
            numResults: 5,
          },
          question:
            'What does a person in Finland who just found out they are pregnant need to do or know about Kela ' +
            '(benefits to apply for, certificates needed, application deadlines)?',
        },
      ],
    })
    return result
  },
})

const researchClinic = createStep({
  id: 'research-clinic',
  inputSchema,
  outputSchema: topicResultSchema,
  execute: async ({ inputData, runId }) => {
    const { municipality } = loadProfile()
    const { result } = await researchTopic({
      runId,
      key: 'clinic',
      language: inputData.language,
      searches: [
        {
          search: {
            query: `${municipality} äitiysneuvola: raskaana, ensimmäinen yhteydenotto ja ajanvaraus`,
            userLocation: 'FI',
            numResults: 5,
          },
          question:
            `How and when should a newly pregnant resident of ${municipality} contact the municipal maternity ` +
            'clinic (neuvola), and how is the first appointment booked? Ignore pages about other municipalities.',
        },
      ],
    })
    return result
  },
})

const employersResultSchema = topicResultSchema.extend({
  perPartner: z.array(z.object({ partner: z.string(), evidence: z.array(evidenceSchema) })),
})

const researchEmployers = createStep({
  id: 'research-employers',
  inputSchema,
  outputSchema: employersResultSchema,
  execute: async ({ inputData, runId }) => {
    const { partners } = loadProfile()
    const { result, perSearch } = await researchTopic({
      runId,
      key: 'employers',
      language: inputData.language,
      searches: partners.map((p) => ({
        search: {
          query: p.expecting
            ? `${p.employer.collectiveAgreement}: raskausvapaan ja vanhempainvapaan palkka, ilmoittaminen työnantajalle`
            : `${p.employer.collectiveAgreement}: vanhempainvapaan palkka toiselle vanhemmalle, ilmoittaminen työnantajalle`,
          userLocation: 'FI',
          numResults: 4,
        },
        question:
          `What does the collective agreement "${p.employer.collectiveAgreement}" (${p.employer.sector}) say about ` +
          `paid ${p.expecting ? 'pregnancy and parental' : 'parental'} leave and about notifying the employer? ` +
          'Name the agreement or sector in each claim. Ignore excerpts about other agreements.',
        maxClaims: 2,
      })),
    })
    return {
      ...result,
      perPartner: partners.map((p, i) => ({ partner: p.name, evidence: perSearch[i] ?? [] })),
    }
  },
})

const planOutputSchema = z.object({
  threadId: z.string(),
  language: z.string(),
  plan: planSchema,
  /** Leave-term evidence for the expecting partner's employer; the only facts the HR draft may use. */
  hrEvidence: z.array(evidenceSchema),
  planMessageId: z.string().optional(),
})

/** Builds the plan from verified evidence only and posts the "next 7 days" card. */
const composeAndPost = createStep({
  id: 'compose-plan',
  inputSchema: z.object({
    'research-kela': topicResultSchema,
    'research-clinic': topicResultSchema,
    'research-employers': employersResultSchema,
  }),
  outputSchema: planOutputSchema,
  execute: async (params) => {
    const { inputData, runId, mastra } = params
    const init = params.getInitData<Input>()
    const employers = inputData['research-employers']
    const topics = [inputData['research-kela'], inputData['research-clinic'], employers]
    const plan = await composePlan({ topics, language: init.language })

    const expecting = loadProfile().partners.find((p) => p.expecting)
    const hrEvidence = employers.perPartner.find((p) => p.partner === expecting?.name)?.evidence ?? []

    let planMessageId: string | undefined
    if (getChat(mastra)) {
      await progressFor(runId)?.settle()
      const sent = await postToThread(mastra, init.threadId, planCard({ plan, language: init.language, runId }))
      planMessageId = sent.id
    }
    dropProgress(runId)
    return { threadId: init.threadId, language: init.language, plan, hrEvidence, planMessageId }
  },
})

/**
 * Approval gate. The run suspends here (state persisted in LibSQL) until someone taps
 * [Draft message to HR]; the tap resumes it. "Sending" is a stub: the draft is posted into the chat.
 */
const hrApproval = createStep({
  id: HR_APPROVAL_STEP_ID,
  inputSchema: planOutputSchema,
  resumeSchema: z.object({ approved: z.boolean(), requestedBy: z.string().optional() }),
  suspendSchema: z.object({ waitingFor: z.string() }),
  outputSchema: z.object({ drafted: z.boolean() }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    if (!resumeData) return suspend({ waitingFor: 'tap on [Draft message to HR]' })
    if (!resumeData.approved) return { drafted: false }

    const { threadId, language, hrEvidence, plan, planMessageId } = inputData
    const profile = loadProfile()
    const sender = profile.partners.find((p) => p.expecting) ?? profile.partners[0]!
    const facts = hrEvidence.map((e, i) => `F${i + 1}: ${e.claim}`).join('\n') || '(none)'
    const res = await researcherAgent.generate(
      `Write a short, polite message (max 110 words, language "${language}") from ${sender.name}, ` +
        `${sender.employer.role} at ${sender.employer.name}, to the employer's HR. ` +
        `It tells HR that ${sender.name} is pregnant and asks how to arrange family leave and what HR needs from her.
You may refer ONLY to these sourced facts about leave terms, and only if they are relevant:
${facts}
If there are no facts, state no terms at all and simply ask HR what applies. No due dates, no amounts, no
law or benefit names that are not in the facts. Plain text only, no markdown, no subject line, sign with the first name.`,
    )

    const chat = getChat(mastra)
    if (chat && planMessageId) {
      // Drop the button from the plan card so it cannot be tapped twice.
      await chat
        .getAdapter('telegram')
        ?.editMessage(threadId, planMessageId, planCardDone({ plan, language }))
        .catch(() => undefined)
    }
    await postToThread(mastra, threadId, hrDraftMessage({ draft: res.text, evidence: hrEvidence, language }))
    return { drafted: true }
  },
})

export const lifeEventPlanWorkflow = createWorkflow({
  id: LIFE_EVENT_PLAN_ID,
  description:
    'Pregnancy: research Kela, the maternity clinic and employer leave terms with Exa, post a sourced 7-day plan, then draft an HR message on approval.',
  inputSchema,
  outputSchema: z.object({ drafted: z.boolean() }),
})
  .then(announce)
  .parallel([researchKela, researchClinic, researchEmployers])
  .then(composeAndPost)
  .then(hrApproval)
  .commit()

export const failureText = (language: string) => t(language).failed
