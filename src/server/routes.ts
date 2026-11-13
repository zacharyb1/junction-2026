import type { Mastra } from '@mastra/core'
import { Hono } from 'hono'
import { z } from 'zod'
import { env, missingConfig } from '../config/env'
import { ExaUnavailableError, exaSearch } from '../mastra/tools/exa'
import { demoThreadId, getChat, postToThread } from '../telegram/chat'
import { alertMessage, type MonitorAlert } from '../telegram/render'
import { verifyExaSignature } from './exa-signature'

/** The part of Exa's `monitor.run.completed` event we use. Unknown fields are ignored. */
const monitorEventSchema = z.object({
  type: z.string(),
  data: z.object({
    monitorId: z.string().optional(),
    status: z.string().optional(),
    output: z
      .object({
        results: z.array(z.object({ title: z.string().nullish(), url: z.string() })).optional(),
        content: z.unknown().optional(),
      })
      .nullish(),
  }),
})

function toAlert(event: z.infer<typeof monitorEventSchema>, simulated: boolean): MonitorAlert {
  return {
    monitorId: event.data.monitorId,
    results: (event.data.output?.results ?? []).map((r) => ({ title: r.title?.trim() || r.url, url: r.url })),
    simulated,
  }
}

/** Post an unprompted alert into the demo group. */
async function postAlert(mastra: Mastra, alert: MonitorAlert): Promise<{ posted: boolean; reason?: string }> {
  const threadId = demoThreadId()
  if (!getChat(mastra)) return { posted: false, reason: 'Telegram channel is not running' }
  if (!threadId) {
    return { posted: false, reason: 'no target chat yet: send a message in the group or set TELEGRAM_DEMO_CHAT_ID' }
  }
  await postToThread(mastra, threadId, alertMessage(alert, 'en'))
  return { posted: true }
}

export function createRoutes(mastra: Mastra) {
  const app = new Hono()

  app.get('/health', (c) =>
    c.json({ ok: true, telegram: getChat(mastra) !== null, model: env.MODEL, missing: missingConfig() }),
  )

  /** Real Exa Monitor deliveries. The signature is checked against the raw body before anything else. */
  app.post('/webhooks/exa-monitor', async (c) => {
    const raw = await c.req.text()
    if (!env.EXA_WEBHOOK_SECRET) return c.json({ error: 'EXA_WEBHOOK_SECRET is not configured' }, 503)
    if (!verifyExaSignature(raw, c.req.header('exa-signature'), env.EXA_WEBHOOK_SECRET)) {
      console.warn('[exa-monitor] rejected: bad or missing Exa-Signature')
      return c.json({ error: 'invalid signature' }, 401)
    }
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return c.json({ error: 'body is not JSON' }, 400)
    }
    console.log('[exa-monitor] event', JSON.stringify(json))
    const event = monitorEventSchema.safeParse(json)
    if (!event.success) return c.json({ ok: true, ignored: 'unrecognised event shape' })
    if (event.data.type !== 'monitor.run.completed') return c.json({ ok: true, ignored: event.data.type })
    const alert = toAlert(event.data, false)
    if (alert.results.length === 0) return c.json({ ok: true, posted: false, reason: 'no new results' })
    return c.json({ ok: true, ...(await postAlert(mastra, alert)) })
  })

  /**
   * Demo trigger, no signature, disabled in production.
   * - Body with a monitor event (see fixtures/monitor-event.sample.json): replayed as is.
   * - Body {"query": "..."} or no body: runs that search live on Exa and alerts with the real results.
   */
  if (!env.isProd) {
    app.post('/simulate/monitor', async (c) => {
      const body = await c.req.json().catch(() => ({}))
      const asEvent = monitorEventSchema.safeParse(body)
      let alert: MonitorAlert
      if (asEvent.success) {
        alert = toAlert(asEvent.data, true)
      } else {
        const query =
          typeof body?.query === 'string' && body.query.trim() ? body.query.trim() : 'Kela perhe-etuudet muutos tiedote'
        try {
          const search = await exaSearch({ query, numResults: 3, userLocation: 'FI' })
          alert = { results: search.results.map((r) => ({ title: r.title, url: r.url })), simulated: true }
        } catch (err) {
          const status = err instanceof ExaUnavailableError ? 503 : 502
          return c.json({ error: (err as Error).message }, status)
        }
      }
      console.log('[simulate/monitor] alert', JSON.stringify(alert))
      return c.json({ ok: true, ...(await postAlert(mastra, alert)) })
    })
  }

  return app
}
