import type { SentMessage } from 'chat'
import { t } from './i18n'

export type StepState = 'waiting' | 'running' | 'done' | 'empty' | 'failed'
const ICON: Record<StepState, string> = { waiting: '▫️', running: '🔎', done: '✅', empty: '➖', failed: '⚠️' }

/** Telegram throttles bots in groups; sends and edits share the limit. */
export const MIN_EDIT_INTERVAL_MS = 3100

/**
 * One chat message that shows research progress and is edited in place,
 * never more often than once per `minIntervalMs`. Updates in between are coalesced.
 */
export class ProgressBoard {
  private rows = new Map<string, { label: string; state: StepState; detail?: string }>()
  private sent: SentMessage | undefined
  private lastSendAt = 0
  private lastText = ''
  private timer: NodeJS.Timeout | undefined
  private chain: Promise<void> = Promise.resolve()

  constructor(
    private readonly post: (text: string) => Promise<SentMessage>,
    private readonly language: string,
    private readonly minIntervalMs = MIN_EDIT_INTERVAL_MS,
  ) {}

  add(key: string, label: string) {
    this.rows.set(key, { label, state: 'waiting' })
  }

  set(key: string, state: StepState, detail?: string) {
    const row = this.rows.get(key)
    if (!row) return
    row.state = state
    row.detail = detail
    this.schedule()
  }

  private text(): string {
    const s = t(this.language)
    const lines = [...this.rows.values()].map(
      (r) => `${ICON[r.state]} ${r.label}: ${s.states[r.state]}${r.detail ? ` (${r.detail})` : ''}`,
    )
    return [`${s.progressTitle}…`, ...lines].join('\n')
  }

  private schedule() {
    if (this.timer) return
    const wait = Math.max(0, this.lastSendAt + this.minIntervalMs - Date.now())
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.chain = this.chain.then(() => this.write())
    }, wait)
  }

  private async write() {
    const text = this.text()
    if (text === this.lastText) return
    try {
      this.sent = this.sent ? await this.sent.edit(text) : await this.post(text)
      this.lastText = text
    } catch (err) {
      // Progress is cosmetic: never let a throttled edit break the research run.
      console.warn('[progress] update failed:', err instanceof Error ? err.message : err)
    } finally {
      this.lastSendAt = Date.now()
    }
  }

  /** Post the first version right away. */
  async start() {
    this.chain = this.chain.then(() => this.write())
    await this.chain
  }

  /** Wait until the latest state is on screen, still respecting the interval. */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
      const wait = Math.max(0, this.lastSendAt + this.minIntervalMs - Date.now())
      await new Promise((r) => setTimeout(r, wait))
      this.chain = this.chain.then(() => this.write())
    }
    await this.chain
  }

  /** Earliest time another message may be sent to this chat without racing the last edit. */
  async settle() {
    await this.flush()
    const wait = Math.max(0, this.lastSendAt + this.minIntervalMs - Date.now())
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  }
}

const boards = new Map<string, ProgressBoard>()
export const progressFor = (runId: string) => boards.get(runId)
export const registerProgress = (runId: string, board: ProgressBoard) => boards.set(runId, board)
export const dropProgress = (runId: string) => boards.delete(runId)
