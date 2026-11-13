# Life-events bot (Junction, Exa challenge)

A Telegram bot that sits quietly in a couple's group chat and acts when a life event happens.
The wife texts "OMG 2 bars 😭". The bot congratulates in one warm line and offers help with a button.
On approval it researches what this couple must do in the next 7 days (Kela, the municipal maternity
clinic, their employers' leave terms) with Exa, and posts a short plan where every claim carries a
source link. On ordinary chatter it says nothing.

## Run it in 5 minutes

1. **Open the folder in VS Code or Cursor and choose "Reopen in Container".**
   The container installs dependencies by itself. (CLI: `devcontainer up --workspace-folder .`)
2. **Create your own dev bot** in Telegram with [@BotFather](https://t.me/BotFather):
   1. `/newbot`, pick a name and a username. Copy the token.
   2. `/setprivacy`, choose your bot, choose **Disable**. With privacy mode on, a bot only sees
      messages that mention it, and the whole point here is that it reads the chat.
   3. Add the bot to your test group. **If it was already in the group, remove it and add it again**:
      Telegram applies the privacy change only when the bot joins.

   Every developer needs their own bot. One token can be polled by one process only; two people
   sharing a token will steal each other's messages.

3. **Copy `.env.example` to `.env`** and fill in `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   `EXA_API_KEY` and the model key (`ANTHROPIC_API_KEY` for the default `MODEL`).
   `.env` is gitignored. Never commit or paste real values.
4. **Run `pnpm dev`.** The log lists anything still missing, by name.
5. In the group, send `what's for dinner` (silence), then `OMG 2 bars 😭` (one line and two buttons).

| What                              | Where                   |
| --------------------------------- | ----------------------- |
| Hono app: Mastra API + our routes | <http://localhost:4111> |
| Mastra Studio                     | <http://localhost:4112> |
| Health and missing settings       | `GET /health`           |

### Commands

| Command               | Does                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Server with reload, plus Mastra Studio                                                       |
| `pnpm typecheck`      | Type-check only (Vite+)                                                                      |
| `pnpm check`          | Format check + lint + type-check (Vite+). `pnpm check:fix` formats and autofixes             |
| `pnpm smoke`          | Offline end-to-end test against fake Telegram and Exa. No keys, no credits                   |
| `pnpm triage:samples` | Runs triage over sample messages with the real model and prints the verdicts                 |
| `pnpm reset`          | Wipes `data/` (database, Exa cache, remembered chat) for a clean demo. Stop `pnpm dev` first |

### Without the container (unsupported fallback)

Use the Node version in `.nvmrc` and the pnpm version in `package.json` (`corepack enable`), then
`pnpm install && pnpm dev`. It should behave the same, but only the container is supported.

## How it works

```
Telegram ──polling──▶ Mastra channel (Chat SDK Telegram adapter)
                         │  every message, mentioned or not
                         ▼
               src/telegram/handlers.ts ──▶ triage agent {isLifeEvent, eventType, confidence, language}
                         │
        silent ◀── chatter   unsure ──▶ one clarifying question   event ──▶ warm line + [Yes] [Not now]
                                                                              │ Yes
                                                                              ▼
                               workflow life-event-plan (state in LibSQL, data/mastra.db)
                               announce ─▶ ┌ research-kela      ┐
                                           │ research-clinic    │ Exa search ─▶ quote-verified claims
                                           └ research-employers ┘
                                        ─▶ compose-plan (posts the 7-day card + [Draft message to HR])
                                        ─▶ hr-approval  (suspends; the button resumes it)
```

- **Silence by default.** `onMessage` and `onSubscribedMessage` both run triage first. Below
  confidence 0.4 the bot says nothing; from 0.4 to 0.75 it asks one short question; from 0.75 it
  offers help. If triage itself fails, the bot stays silent. A DM or @mention that is not a life
  event goes to the `companion` agent, which may only state facts it found with Exa in that turn.
- **Sources are enforced in code, not only in the prompt** (`src/mastra/agents/researcher.ts`).
  The model must give a verbatim quote for every claim. The code checks that the quote really is in
  the Exa highlight of the result it points at, and drops the claim otherwise. URL, title and date
  are copied from the Exa result, never written by the model. A topic with no surviving claim is
  shown as "No reliable source found, so I am not guessing".
- **Progress** is one message edited in place, at most once every 3.1 seconds
  (`src/telegram/progress.ts`); Telegram throttles bots in groups.
- **Exa cache** (`src/mastra/tools/exa-cache.ts`): responses are stored in `data/exa-cache`, keyed
  by method and exact request. On in dev, off in production, override with `EXA_CACHE`. A cache hit
  keeps the original retrieval date. `pnpm reset` clears it. **For the live demo set
  `EXA_CACHE=off`** (or run `pnpm reset` right before), so judges see live results.
- **Profile.** `fixtures/couple.espoo.json` is one fictional couple in Espoo and is used for every
  chat. The people and both employers are invented; the file says so.

### Layout

```
src/config      env parsing, profile loader
src/mastra      agents/ (triage, researcher, companion), tools/ (Exa + cache), workflows/
src/server      Hono app, /webhooks/exa-monitor, /simulate/monitor, signature check
src/telegram    handlers (triage routing, buttons), rendering, progress message, UI strings
fixtures        fictional couple, sample monitor event
scripts         dev runner, reset, triage samples, smoke test (+ fake Telegram/Exa APIs)
```

## Monitor routes

- `POST /webhooks/exa-monitor` is for real Exa Monitor deliveries. It verifies `Exa-Signature`
  (`t=<timestamp>,v1=<HMAC-SHA256 of "<t>.<raw body>">`) with `EXA_WEBHOOK_SECRET`, rejects
  deliveries older than 5 minutes, logs the payload and posts a short alert into the group.
  Exa returns the secret once, from `exa.monitors.create()`; store it in `.env` immediately.
  Exa needs a public HTTPS URL for this route, so locally you need a tunnel.
- `POST /simulate/monitor` is the demo trigger (disabled when `NODE_ENV=production`):

  ```bash
  # run a real Exa search and alert with its results
  curl -X POST localhost:4111/simulate/monitor -H 'content-type: application/json' \
       -d '{"query":"Kela perhe-etuudet muutos tiedote"}'
  # or replay a monitor event payload as is (this sample is a placeholder, not a real finding)
  curl -X POST localhost:4111/simulate/monitor -H 'content-type: application/json' \
       -d @fixtures/monitor-event.sample.json
  ```

  Alerts go to `TELEGRAM_DEMO_CHAT_ID` if set, otherwise to the last group the bot saw a message in.

## Tooling

- **Vite+** (`vite-plus`, config in `vite.config.ts`) does formatting (Oxfmt), linting (Oxlint) and
  type-checking (tsgolint) through `vp check`. It is not used to build or serve the app: the server
  runs with `tsx` in dev and is bundled with `esbuild` for production.
- **Dev container**: Node and pnpm are pinned (`.nvmrc`, `packageManager`). `node_modules` and the
  pnpm store are on named volumes. `data/` and `.env` stay in the workspace, so they survive rebuilds.
- **Production**: `Dockerfile` (slim, multi-stage) and `docker-compose.yml`. They share the Node
  version with the dev container and nothing else. Nothing is deployed. The Mastra API under `/api`
  has no authentication, so the compose file publishes the port on localhost only.

## Notes on the plan

- Both things the plan marked as unconfirmed work through Mastra's channel layer, so there is no
  grammY or raw Bot API code: custom cards with buttons are posted with the Chat SDK `Card` builders
  and handled in `handlers.onAction`; unprompted messages from a route go through
  `agent.getChannels().sdk.thread(id).post()` (`src/telegram/chat.ts`).
- Triage returns one field more than planned, `reply` (the warm line or the clarifying question), to
  save a second model call.
- Only pregnancy has a research workflow. Other detected events get the warm line and buttons, and
  "Yes" answers honestly that there is no research for them yet.
- The HR "send" is a stub: the draft is posted into the chat, labelled as not sent.
- `@hono/node-server` is on 1.x because `@mastra/hono` 1.7 requires it.
