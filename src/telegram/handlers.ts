import { randomUUID } from 'node:crypto'
import type { Mastra } from '@mastra/core'
import type { ActionChannelHandler, ChannelHandler, ChannelHandlers } from '@mastra/core/channels'
import type { Thread } from 'chat'
import { decide, triageMessage } from '../mastra/agents/triage'
import { failureText, HR_APPROVAL_STEP_ID, lifeEventPlanWorkflow } from '../mastra/workflows/life-event-plan'
import { postToThread, rememberGroupThread } from './chat'
import { t } from './i18n'
import { ACTION, offerCard } from './render'

interface Offer {
  eventType: string
  language: string
  text: string
  line: string
}
/** Per-chat state kept by the Chat SDK state adapter (backed by Mastra storage, so it survives restarts). */
interface ThreadState {
  offers?: Record<string, Offer>
}

const RECENT_LIMIT = 6
const recent = new Map<string, string[]>()
function remember(threadId: string, line: string): string[] {
  const list = recent.get(threadId) ?? []
  const before = [...list]
  list.push(line.slice(0, 300))
  if (list.length > RECENT_LIMIT) list.shift()
  recent.set(threadId, list)
  return before
}

const log = (msg: string, extra?: unknown) => console.log(`[telegram] ${msg}`, extra ?? '')

/**
 * Every inbound message goes through triage first.
 * - clear life event  -> one warm line + [Yes, help us] [Not now]
 * - maybe an event    -> one short clarifying question
 * - anything else     -> silence, unless the bot was addressed directly (DM or @mention)
 */
const route =
  (kind: 'message' | 'subscribed' | 'mention' | 'dm'): ChannelHandler =>
  async (thread, message, defaultHandler) => {
    if (message.author.isMe || message.author.isBot === true) return
    const text = message.text?.trim()
    if (!text) return
    if (!thread.isDM) rememberGroupThread(thread.id)

    const addressed = kind === 'dm' || kind === 'mention' || message.isMention === true
    const who = message.author.fullName || message.author.userName || 'Someone'
    const earlier = remember(thread.id, `${who}: ${text}`)

    let verdict
    try {
      verdict = await triageMessage({ text, recent: earlier })
    } catch (err) {
      // Fail closed: if triage cannot run, an unaddressed message gets no reply.
      log(`triage failed (${kind}); staying silent:`, err instanceof Error ? err.message : err)
      if (addressed) await defaultHandler(thread, message)
      return
    }
    const decision = decide(verdict)
    log(
      `${kind} -> ${decision} (${verdict.eventType}, confidence ${verdict.confidence.toFixed(2)}, ${verdict.language})`,
    )

    if (decision === 'offer') {
      const eventId = randomUUID().slice(0, 8)
      const line = verdict.reply || '❤️'
      const state = ((await thread.state) ?? {}) as ThreadState
      const offer: Offer = { eventType: verdict.eventType, language: verdict.language, text, line }
      await (thread as Thread<ThreadState>).setState({ offers: { ...state.offers, [eventId]: offer } })
      await thread.post(offerCard({ line, eventId, language: verdict.language }))
      return
    }
    if (decision === 'clarify' && verdict.reply) {
      await thread.post(verdict.reply)
      return
    }
    if (addressed) await defaultHandler(thread, message)
  }

const resuming = new Set<string>()

async function startPlan(mastra: Mastra, threadId: string, offer: Offer) {
  const run = await lifeEventPlanWorkflow.createRun()
  log(`workflow ${run.runId} started`)
  run
    .start({
      inputData: { threadId, language: offer.language, eventType: offer.eventType, eventText: offer.text },
    })
    .then(async (res) => {
      log(`workflow ${run.runId} -> ${res.status}`)
      if (res.status === 'failed') {
        console.error('[workflow] failed:', res.error)
        await postToThread(mastra, threadId, failureText(offer.language))
      }
    })
    .catch((err) => console.error('[workflow] crashed:', err))
}

const onAction: ActionChannelHandler = async (event, defaultHandler, ctx) => {
  const mastra = ctx.mastra
  const thread = event.thread as Thread<ThreadState> | null
  const id = event.value
  if (!mastra || !thread || !id || !Object.values(ACTION).includes(event.actionId as never)) {
    return defaultHandler()
  }

  if (event.actionId === ACTION.hr) {
    if (resuming.has(id)) return
    resuming.add(id)
    log(`HR draft requested for run ${id}`)
    // Resume from a fresh run handle: works after a restart because the snapshot lives in LibSQL.
    const run = await lifeEventPlanWorkflow.createRun({ runId: id })
    run
      .resume({
        step: HR_APPROVAL_STEP_ID,
        resumeData: { approved: true, requestedBy: event.user.fullName || event.user.userName },
      })
      .then((res) => log(`workflow ${id} -> ${res.status}`))
      .catch(async (err) => {
        log(`resume of ${id} failed:`, err instanceof Error ? err.message : err)
        await thread.post(t(undefined).hrStale).catch(() => undefined)
      })
      .finally(() => resuming.delete(id))
    return
  }

  const state = ((await thread.state) ?? {}) as ThreadState
  const offer = state.offers?.[id]
  if (!offer) return // stale or double tap
  const { [id]: _taken, ...rest } = state.offers ?? {}
  await thread.setState({ offers: rest })
  const s = t(offer.language)

  const accepted = event.actionId === ACTION.yes
  const supported = offer.eventType === 'pregnancy'
  const note = !accepted ? s.declined : supported ? s.accepted : s.unsupported
  // Replace the card with plain text so the buttons disappear.
  await event.adapter
    .editMessage(event.threadId, event.messageId, { markdown: `${offer.line}\n\n_${note}_` })
    .catch((err) => log('could not edit the offer card:', err instanceof Error ? err.message : err))

  // Do not await the run: the handler must return so the chat is not blocked while research runs.
  if (accepted && supported) await startPlan(mastra, thread.id, offer)
}

export const channelHandlers: ChannelHandlers = {
  onMessage: route('message'),
  onSubscribedMessage: route('subscribed'),
  onMention: route('mention'),
  onDirectMessage: route('dm'),
  onAction,
}
