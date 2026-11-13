import { createTelegramAdapter } from '@chat-adapter/telegram'
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { env } from '../../config/env'
import { loadProfile } from '../../config/profile'
import { COMPANION_AGENT_ID } from '../../telegram/chat'
import { channelHandlers } from '../../telegram/handlers'
import { exaContentsTool, exaSearchTool } from '../tools/exa'

const profile = loadProfile()

/**
 * The bot's voice when someone addresses it directly (DM or @mention).
 * Unaddressed chatter never reaches this agent: src/telegram/handlers.ts triages first.
 */
export const companionAgent = new Agent({
  id: COMPANION_AGENT_ID,
  name: 'Companion',
  description: 'Answers the couple when addressed directly, using only Exa search results with links.',
  model: env.MODEL,
  memory: new Memory(),
  tools: { exaSearchTool, exaContentsTool },
  instructions: `You are a quiet helper in a couple's Telegram chat. You only speak because someone addressed you.

Household (fictional demo profile): ${profile.partners
    .map((p) => `${p.name}, ${p.employer.role} at ${p.employer.name}, covered by "${p.employer.collectiveAgreement}"`)
    .join('; ')}. They live in ${profile.municipality}, Finland.

Rules:
- Reply in the language of the message, in at most 6 short lines. No preamble.
- Every factual claim (rules, amounts, deadlines, dates, contacts, how a service works) must come from an
  exa-search or exa-contents result in THIS turn and carry its link, like: claim ([source](url)).
- Search first for anything factual. Prefer official sources and search in the language of the country
  concerned (Finnish for Finnish authorities). Pass userLocation "FI" for Finnish topics.
- If the results do not answer the question, say plainly that you could not find a reliable source.
  Never fill the gap from your own knowledge, and never cite a URL that was not returned by a tool.
- Small talk needs no search and no facts. Keep it to one line.`,
  // Without a bot token the app still starts (Studio, routes, scripts); it just has no Telegram channel.
  ...(env.TELEGRAM_BOT_TOKEN
    ? {
        channels: {
          adapters: {
            telegram: {
              // Polling: no public URL needed. Only one process may poll a given bot token.
              adapter: createTelegramAdapter({ mode: 'polling' }),
              // Tool calls are plumbing here; the answer carries the links.
              toolDisplay: 'hidden' as const,
            },
          },
          handlers: channelHandlers,
          // Queue instead of the default "drop", so a second message sent while the
          // first is still being triaged is not lost.
          chatOptions: { concurrency: 'queue' as const },
        },
      }
    : {}),
})
