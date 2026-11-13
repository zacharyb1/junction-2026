// Offline end-to-end smoke test: `pnpm smoke`. Needs no API keys and spends no credits.
//
// It boots the real app (Mastra + Hono + the Telegram channel in polling mode) against local fakes of the
// Telegram Bot API and the Exa API, with a scripted mock model. It proves the plumbing, not the quality of
// real model or search output: for that, use real keys and `pnpm triage:samples`.
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { CHAT, startFakeExa, startFakeTelegram } from './smoke/fake-apis.mjs'

const PORT = 4199
const SECRET = 'smoke-webhook-secret'
const DATA_DIR = 'data/smoke'
const base = `http://127.0.0.1:${PORT}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

rmSync(DATA_DIR, { recursive: true, force: true })
const tg = await startFakeTelegram()
const exa = await startFakeExa()

let app
let appLog = ''
async function boot(extraEnv = {}) {
  appLog = ''
  // Start Node directly (no pnpm wrapper), so SIGTERM reaches the app and frees the port on restart.
  app = spawn(process.execPath, ['--import', 'tsx', 'scripts/smoke/app.ts'], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'development',
      PORT: String(PORT),
      DATA_DIR,
      MODEL: 'mock/scripted',
      MOCK_API_KEY: 'unused',
      TELEGRAM_BOT_TOKEN: '42:SMOKE-FAKE-TOKEN',
      TELEGRAM_BOT_USERNAME: 'smoke_bot',
      TELEGRAM_API_BASE_URL: tg.url,
      EXA_API_KEY: 'smoke-fake-key',
      EXA_BASE_URL: exa.url,
      EXA_WEBHOOK_SECRET: SECRET,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  app.stdout.on('data', (d) => (appLog += d))
  app.stderr.on('data', (d) => (appLog += d))
  await until('server answers /health', async () => (await fetch(`${base}/health`).catch(() => null))?.ok, 60_000)
}
async function stop() {
  if (!app || app.exitCode !== null) return
  app.kill('SIGTERM')
  await new Promise((r) => app.once('exit', r))
}

async function until(what, check, timeout = 20_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const v = await check()
    if (v) return v
    await sleep(150)
  }
  throw new Error(`timed out waiting for: ${what}`)
}

const results = []
async function step(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
    console.log(`  ok    ${name}${detail ? `  (${detail})` : ''}`)
  } catch (err) {
    results.push({ name, ok: false, detail: err.message })
    console.log(`  FAIL  ${name}\n        ${err.message}`)
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const sends = () => tg.calls.filter((c) => c.method === 'sendMessage' || c.method === 'sendRichMessage')
const edits = () => tg.calls.filter((c) => c.method === 'editMessageText')
const buttons = (call) => (call.body.reply_markup?.inline_keyboard ?? []).flat()
// Telegram MarkdownV2 escapes punctuation with backslashes; strip them before matching.
const textOf = (call) => JSON.stringify(call.body).replace(/\\+/g, '')

try {
  console.log('Booting the app against fake Telegram and fake Exa...')
  await boot()

  await step('Mastra starts the Telegram channel in polling mode on our Hono app', async () => {
    await until('getMe', () => tg.calls.some((c) => c.method === 'getMe'))
    await until('/health reports telegram: true', async () => (await (await fetch(`${base}/health`)).json()).telegram)
  })

  await step('unmentioned chatter reaches onMessage and gets NO reply', async () => {
    const before = tg.sent().length
    tg.pushMessage('lol ok')
    tg.pushMessage("what's for dinner")
    await until('2 triage log lines', () => (appLog.match(/-> silent/g) ?? []).length >= 2)
    await sleep(1500)
    assert(tg.sent().length === before, `bot sent ${tg.sent().length - before} call(s) on chatter`)
    return 'both triaged as silent, 0 Telegram calls'
  })

  await step('low confidence -> one clarifying question, no buttons', async () => {
    const before = sends().length
    tg.pushMessage('so... it finally happened 😳')
    await until('clarifying question', () => sends().length > before)
    const call = sends().at(-1)
    assert(/clarifying question/.test(call.body.text), `unexpected text: ${call.body.text}`)
    assert(buttons(call).length === 0, 'clarifying question has buttons')
  })

  let offer
  await step('life event -> warm line with [Yes, help us] [Not now] via the Mastra channel', async () => {
    const before = sends().length
    tg.pushMessage('OMG 2 bars 😭')
    await until('offer card', () => sends().length > before)
    offer = sends().at(-1)
    const labels = buttons(offer).map((b) => b.text)
    assert(labels.join('|') === 'Yes, help us|Not now', `buttons: ${labels.join('|')}`)
    assert(sends().length === before + 1, 'more than one message for the event')
    for (const b of buttons(offer)) {
      assert(Buffer.byteLength(b.callback_data) <= 64, `callback_data over 64 bytes: ${b.callback_data}`)
    }
    return `callback_data e.g. ${JSON.stringify(buttons(offer)[0].callback_data)}`
  })

  let plan
  await step('tap Yes -> 3 parallel Exa searches, progress edits >= 3s apart, sourced plan card', async () => {
    const offerId = offer.replyId
    const editsBefore = edits().length
    const sendsBefore = sends().length
    tg.pushCallback(offer, offerId, buttons(offer)[0].callback_data)
    await until('plan card', () => sends().some((c) => buttons(c).some((b) => /HR/.test(b.text))), 40_000)
    plan = sends().find((c) => buttons(c).some((b) => /HR/.test(b.text)))

    assert(exa.calls.length === 4, `expected 4 Exa searches (Kela, clinic, 2 employers), saw ${exa.calls.length}`)
    const offerEdit = edits()[editsBefore]
    assert(offerEdit && Number(offerEdit.body.message_id) === offerId, 'offer card was not edited to drop its buttons')

    // Everything sent to the chat after the tap: progress post, its edits, then the plan.
    const progressPost = sends()[sendsBefore]
    const stream = tg.calls.filter(
      (c) =>
        c.at >= progressPost.at && (c.method === 'sendMessage' || c.method === 'editMessageText') && c !== offerEdit,
    )
    const gaps = stream.slice(1).map((c, i) => c.at - stream[i].at)
    assert(
      gaps.every((g) => g >= 3000),
      `messages/edits closer than 3s: gaps ${gaps.join(', ')} ms`,
    )

    const body = textOf(plan)
    assert(/SMOKE-FACT-A/.test(body) && /fake-kela\.test/.test(body), 'plan lacks the Kela fact or its link')
    assert(/fake-tes\.test/.test(body), 'plan lacks the employer source link')
    assert(!/INVENTED/.test(body), 'plan shows a claim or item that had no source')
    assert(/No reliable source found/.test(body) && /Maternity clinic/.test(body), 'plan does not admit the clinic gap')
    return `${stream.length} messages/edits, min gap ${Math.min(...gaps)} ms; clinic gap stated; invented claim dropped`
  })

  await step('workflow is suspended at the HR approval step', async () => {
    await until('suspended log', () => /workflow \S+ -> suspended/.test(appLog))
  })

  await step('Exa cache: responses stored on disk, keyed by request', async () => {
    const dir = `${DATA_DIR}/exa-cache`
    const { readdirSync } = await import('node:fs')
    const files = readdirSync(dir)
    assert(files.length === 4, `expected 4 cache files, found ${files.length}`)
    return `${files.length} files in ${dir}`
  })

  await step(
    'restart the app, then tap [Draft message to HR] -> run resumes from LibSQL and posts the draft',
    async () => {
      await stop()
      await boot()
      const before = sends().length
      const hr = buttons(plan)[0]
      tg.pushCallback(plan, plan.replyId, hr.callback_data)
      await until('HR draft', () => sends().length > before, 30_000)
      const draft = sends().at(-1)
      assert(/SMOKE HR draft/.test(textOf(draft)), `unexpected draft: ${textOf(draft).slice(0, 200)}`)
      assert(/not sent/.test(textOf(draft)), 'draft is not labelled as not sent')
      await until('completed log', () => /workflow \S+ -> success/.test(appLog))
    },
  )

  await step('POST /simulate/monitor posts an unprompted alert into the group', async () => {
    const before = sends().length
    const res = await fetch(`${base}/simulate/monitor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: readFileSync('fixtures/monitor-event.sample.json'),
    })
    const json = await res.json()
    assert(res.ok && json.posted === true, `response: ${JSON.stringify(json)}`)
    await until('alert', () => sends().length > before)
    assert(Number(sends().at(-1).body.chat_id) === CHAT.id, 'alert went to the wrong chat')
  })

  await step('POST /webhooks/exa-monitor rejects a bad or stale signature, accepts a valid one', async () => {
    const body = readFileSync('fixtures/monitor-event.sample.json', 'utf8')
    const sign = (t) => `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.`).update(body).digest('hex')}`
    const post = (headers) =>
      fetch(`${base}/webhooks/exa-monitor`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body,
      })
    const now = Math.floor(Date.now() / 1000)
    const none = await post({})
    const bad = await post({ 'exa-signature': `t=${now},v1=${'0'.repeat(64)}` })
    const stale = await post({ 'exa-signature': sign(now - 3600) })
    const before = sends().length
    const good = await post({ 'exa-signature': sign(now) })
    assert(none.status === 401 && bad.status === 401, `unsigned=${none.status} bad=${bad.status}`)
    assert(stale.status === 401, `stale signature got ${stale.status}`)
    assert(good.status === 200 && (await good.json()).posted === true, `valid signature got ${good.status}`)
    await until('alert', () => sends().length > before)
    return '401, 401, 401 (replayed), 200'
  })

  await step('TELEGRAM_ALLOWED_USER_IDS: messages from other users never reach the bot', async () => {
    await stop()
    await boot({ TELEGRAM_ALLOWED_USER_IDS: '999' })
    const before = tg.sent().length
    const triaged = (appLog.match(/\[telegram\]/g) ?? []).length
    tg.pushMessage('OMG 2 bars 😭')
    await sleep(4000)
    assert(tg.sent().length === before, 'bot replied to a user outside the allowlist')
    assert((appLog.match(/\[telegram\]/g) ?? []).length === triaged, 'message from a non-allowed user was triaged')
  })
} finally {
  await stop()
  tg.close()
  exa.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`)
if (failed.length) {
  console.log('\n--- app log (tail) ---\n' + appLog.split('\n').slice(-40).join('\n'))
  process.exit(1)
}
