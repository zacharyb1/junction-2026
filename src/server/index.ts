import { serve } from '@hono/node-server'
import { type HonoBindings, type HonoVariables, MastraServer } from '@mastra/hono'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env, missingConfig } from '../config/env'
import { mastra } from '../mastra'
import { getChat } from '../telegram/chat'
import { createRoutes } from './routes'

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>()

// Mastra Studio runs on its own port in dev and calls this API from the browser.
if (!env.isProd)
  app.use(
    '/api/*',
    cors({ origin: (origin) => (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : null) }),
  )

// Mastra's own endpoints (agents, workflows, channel webhooks) live under /api.
const server = new MastraServer({ app, mastra })
await server.init()

// Our routes sit next to them on the same Hono app.
app.route('/', createRoutes(mastra))

const http = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(
    `[server] http://localhost:${info.port}  (model: ${env.MODEL}, exa cache: ${env.exaCache ? 'on' : 'off'})`,
  )
  const missing = missingConfig()
  if (missing.length > 0) console.warn(`[server] not configured:\n  - ${missing.join('\n  - ')}`)
  void reportTelegram()
})

/** The channel connects in the background after startup; report once it is up (or clearly is not). */
async function reportTelegram() {
  if (!env.TELEGRAM_BOT_TOKEN) return
  for (let i = 0; i < 40 && !getChat(mastra); i++) await new Promise((r) => setTimeout(r, 250))
  console.log(
    getChat(mastra)
      ? '[server] telegram: channel ready (polling)'
      : '[server] telegram: channel did NOT start within 10s, check the bot token and the log above',
  )
}

const shutdown = () => {
  http.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1500).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
