// Boots the REAL app for `pnpm smoke`, with one difference: the three agents get a scripted
// mock model, so no model key is needed. Telegram and Exa point at local fakes via env.
import { MastraLanguageModelV2Mock } from '@mastra/core/test-utils/llm-mock'
import { companionAgent } from '../../src/mastra/agents/companion'
import { researcherAgent } from '../../src/mastra/agents/researcher'
import { triageAgent } from '../../src/mastra/agents/triage'

function answer(prompt: string): string {
  if (prompt.includes('New message:')) {
    const text = prompt.split('New message:').pop() ?? ''
    if (/2 bars/i.test(text)) {
      return JSON.stringify({
        isLifeEvent: true,
        eventType: 'pregnancy',
        confidence: 0.93,
        language: 'en',
        reply: 'SMOKE warm line: congratulations to you both!',
      })
    }
    if (/finally happened/i.test(text)) {
      return JSON.stringify({
        isLifeEvent: true,
        eventType: 'other',
        confidence: 0.55,
        language: 'en',
        reply: 'SMOKE clarifying question: what happened?',
      })
    }
    return JSON.stringify({ isLifeEvent: false, eventType: 'none', confidence: 0.03, language: 'en', reply: '' })
  }
  if (prompt.includes('Search results:')) {
    const excerpt = /Excerpts:\n- (.+)/.exec(prompt)?.[1] ?? ''
    return JSON.stringify({
      claims: [
        { claim: `SOURCED: ${excerpt.slice(0, 40)}`, resultIndex: 1, quote: excerpt },
        // A hallucinated claim: its quote is not in the source, so the app must drop it.
        {
          claim: 'INVENTED-CLAIM that must never be shown',
          resultIndex: 1,
          quote: 'this sentence is not in any source',
        },
      ],
    })
  }
  if (prompt.includes('Verified facts:')) {
    const n = (prompt.match(/^E\d+ /gm) ?? []).length
    return JSON.stringify({
      items: [
        ...Array.from({ length: n }, (_, i) => ({ title: `SMOKE step ${i + 1}`, evidenceIds: [i + 1] })),
        { title: 'INVENTED-ITEM without evidence', evidenceIds: [99] },
      ],
    })
  }
  return 'SMOKE HR draft: Hello, I am pregnant and would like to ask how to arrange my leave. Aino'
}

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
const promptText = (options: { prompt: unknown }) => JSON.stringify(options.prompt).replace(/\\n/g, '\n')

const model = new MastraLanguageModelV2Mock({
  doGenerate: async (options) => ({
    content: [{ type: 'text', text: answer(promptText(options)) }],
    finishReason: 'stop',
    usage,
    warnings: [],
  }),
  doStream: async (options) => {
    const text = answer(promptText(options))
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] })
          controller.enqueue({ type: 'response-metadata', id: 'smoke', modelId: 'smoke', timestamp: new Date() })
          controller.enqueue({ type: 'text-start', id: 't1' })
          controller.enqueue({ type: 'text-delta', id: 't1', delta: text })
          controller.enqueue({ type: 'text-end', id: 't1' })
          controller.enqueue({ type: 'finish', finishReason: 'stop', usage })
          controller.close()
        },
      }),
    }
  },
})

for (const agent of [triageAgent, researcherAgent, companionAgent]) agent.__updateModel({ model })

await import('../../src/server/index')
