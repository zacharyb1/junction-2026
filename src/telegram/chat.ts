import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Mastra } from '@mastra/core'
import type { AdapterPostableMessage, Chat, SentMessage } from 'chat'
import { env } from '../config/env'

export const COMPANION_AGENT_ID = 'companion'

/** The Chat SDK instance Mastra created for the companion agent's channels, once initialised. */
export function getChat(mastra: Mastra): Chat | null {
  try {
    return mastra.getAgentById(COMPANION_AGENT_ID).getChannels()?.sdk ?? null
  } catch {
    return null
  }
}

/** Post into a chat from anywhere (workflow step, HTTP route), not only from a message handler. */
export async function postToThread(
  mastra: Mastra,
  threadId: string,
  message: AdapterPostableMessage,
): Promise<SentMessage> {
  const chat = getChat(mastra)
  if (!chat) throw new Error('Telegram channel is not running (is TELEGRAM_BOT_TOKEN set?)')
  return chat.thread(threadId).post(message)
}

const runtimeFile = () => resolve('data/runtime.json')

/** Remember the last group chat we saw, so monitor alerts have somewhere to go. */
export function rememberGroupThread(threadId: string) {
  try {
    if (readRuntime().lastGroupThreadId === threadId) return
    mkdirSync(resolve('data'), { recursive: true })
    writeFileSync(runtimeFile(), JSON.stringify({ lastGroupThreadId: threadId }, null, 2))
  } catch {
    // best effort
  }
}

function readRuntime(): { lastGroupThreadId?: string } {
  try {
    return JSON.parse(readFileSync(runtimeFile(), 'utf8'))
  } catch {
    return {}
  }
}

/** Where unprompted messages (monitor alerts) are posted. */
export function demoThreadId(): string | undefined {
  const configured = env.TELEGRAM_DEMO_CHAT_ID
  if (configured) return configured.startsWith('telegram:') ? configured : `telegram:${configured}`
  return readRuntime().lastGroupThreadId
}
