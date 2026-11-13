// Local stand-ins for the Telegram Bot API and the Exa API, used only by `pnpm smoke`.
// They record every call so the smoke test can assert on what the app really sent.
import { createServer } from 'node:http'

const readBody = (req) =>
  new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
  })

function listen(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler)
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }))
  })
}

export const CHAT = { id: -1005550001, type: 'supergroup', title: 'Smoke test group' }
export const USER = { id: 111, is_bot: false, first_name: 'Aino', username: 'aino_smoke' }
const BOT = { id: 42, is_bot: true, first_name: 'SmokeBot', username: 'smoke_bot', can_read_all_group_messages: true }

export async function startFakeTelegram() {
  /** @type {{method: string, body: any, at: number}[]} */
  const calls = []
  const queue = []
  let updateId = 1000
  let messageId = 500

  const { server, url } = await listen(async (req, res) => {
    const method = req.url.split('/').pop().split('?')[0]
    const raw = await readBody(req)
    let body = {}
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch {
      body = { _raw: raw.slice(0, 500) }
    }
    const reply = (result) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, result }))
    }
    if (method === 'getUpdates') {
      const offset = Number(body.offset ?? 0)
      for (let i = 0; i < 10; i++) {
        const ready = queue.filter((u) => u.update_id >= offset)
        if (ready.length) return reply(ready)
        await new Promise((r) => setTimeout(r, 100))
      }
      return reply([])
    }
    const call = { method, body, at: Date.now() }
    calls.push(call)
    if (method === 'getMe') return reply(BOT)
    if (method === 'getWebhookInfo') return reply({ url: '', pending_update_count: 0 })
    if (method === 'sendMessage' || method === 'editMessageText' || method === 'sendRichMessage') {
      const id = method === 'editMessageText' ? Number(body.message_id) : ++messageId
      call.replyId = id
      return reply({
        message_id: id,
        date: Math.floor(Date.now() / 1000),
        chat: CHAT,
        from: BOT,
        text: body.text ?? '',
        reply_markup: body.reply_markup,
      })
    }
    return reply(true)
  })

  const push = (update) => queue.push({ update_id: ++updateId, ...update })
  return {
    url,
    calls,
    close: () => server.close(),
    sent: () =>
      calls.filter((c) => c.method !== 'getMe' && c.method !== 'deleteWebhook' && c.method !== 'getWebhookInfo'),
    pushMessage(text) {
      push({
        message: { message_id: ++messageId, date: Math.floor(Date.now() / 1000), chat: CHAT, from: USER, text },
      })
    },
    /** Simulate a tap on an inline button of a message the bot sent. */
    pushCallback(sentCall, sentMessageId, data) {
      push({
        callback_query: {
          id: `cb${updateId}`,
          from: USER,
          chat_instance: 'smoke',
          data,
          message: {
            message_id: sentMessageId,
            date: Math.floor(Date.now() / 1000),
            chat: CHAT,
            from: BOT,
            text: sentCall.body.text ?? '',
            reply_markup: sentCall.body.reply_markup,
          },
        },
      })
    },
    lastMessageId: () => messageId,
  }
}

export async function startFakeExa() {
  const calls = []
  const { server, url } = await listen(async (req, res) => {
    const body = JSON.parse((await readBody(req)) || '{}')
    calls.push({ path: req.url, body })
    const q = String(body.query ?? '')
    let results
    if (/neuvola/i.test(q)) {
      // The clinic search finds nothing usable: the plan must say so instead of guessing.
      results = []
    } else if (/kela/i.test(q)) {
      results = [
        {
          id: 'https://fake-kela.test/raskaus',
          url: 'https://fake-kela.test/raskaus',
          title: 'SMOKE Kela page',
          publishedDate: '2026-10-01T00:00:00.000Z',
          highlights: ['SMOKE-FACT-A: a certificate is needed before applying.', 'SMOKE-FACT-B: apply online.'],
        },
      ]
    } else {
      results = [
        {
          id: 'https://fake-tes.test/agreement',
          url: `https://fake-tes.test/agreement?q=${encodeURIComponent(q.slice(0, 12))}`,
          title: 'SMOKE collective agreement page',
          highlights: ['SMOKE-FACT-C: the agreement describes paid leave terms.'],
        },
      ]
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ requestId: 'smoke', results }))
  })
  return { url, calls, close: () => server.close() }
}
