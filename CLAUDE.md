# CLAUDE.md

Guidance for Claude Code (and other coding agents) working in this repo. Humans: start with README.md.

## What this is

A Telegram bot for a couple's group chat (Junction hackathon, Exa challenge). It stays silent on
ordinary chatter. When a life event appears (showcase: a positive pregnancy test), it offers help
with a button, researches the next 7 days with Exa, and posts a plan where every claim has a source
link. Judges score live web data, visible sources, and behaviour on queries they type themselves.

## Commands

| Command               | Use                                                                      |
| --------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`            | Hono server on 4111 with reload, Mastra Studio on 4112                   |
| `pnpm check`          | Format check + lint + type-check (Vite+). Run before every commit        |
| `pnpm check:fix`      | Apply formatting and lint autofixes                                      |
| `pnpm typecheck`      | Type-check only                                                          |
| `pnpm smoke`          | Offline end-to-end test (fake Telegram + fake Exa + mock model). No keys |
| `pnpm triage:samples` | Triage over sample messages with the real model. Needs the model key     |
| `pnpm reset`          | Wipe `data/` (LibSQL file, Exa cache). Stop `pnpm dev` first             |

After any change to handlers, the workflow, rendering or routes, run `pnpm check` and `pnpm smoke`.
`pnpm smoke` takes about a minute and must stay at 11/11.

## Stack (decided, do not substitute)

- Node and pnpm versions are pinned in `.nvmrc` and `package.json` (`packageManager`). When bumping
  Node, change `.nvmrc`, the image tag in `.devcontainer/devcontainer.json`, `NODE_VERSION` in
  `Dockerfile`, `engines` and `@types/node` together.
- TypeScript, single package, ESM. Every dependency is pinned to an exact version; keep it that way
  (`pnpm add --save-exact`).
- Mastra for agents, tools, workflows and memory, served through `@mastra/hono` on our own Hono app.
- Telegram through Mastra's channel layer (Chat SDK `@chat-adapter/telegram`), polling mode.
- Exa through `exa-js`, wrapped in Mastra tools with Zod schemas. Not the Exa MCP server.
- LibSQL file in `data/` as Mastra storage, so workflow suspend/resume survives restarts.
- Model comes from the `MODEL` env var (Mastra model router id, `provider/model`).
- Vite+ (`vp`) only for format, lint and type-check. The app is not a Vite app: `tsx` runs it in
  dev, `esbuild` bundles it for production.

Mastra, the Chat SDK and Exa change fast. Do not write against them from memory. Read the docs
shipped with the installed version first (`node_modules/@mastra/core/dist/docs/references/`), then
the indexes: <https://mastra.ai/llms.txt>, <https://chat-sdk.dev/llms.txt>,
<https://exa.ai/docs/llms.txt>, <https://viteplus.dev/llms.txt>.

## Layout

```
src/config      env.ts (all env parsing; blank values count as unset), profile.ts
src/mastra      index.ts (Mastra instance), schemas.ts
  agents/       triage.ts, researcher.ts (extractEvidence, composePlan), companion.ts (owns the channel)
  tools/        exa.ts (exaSearch, exaContents + Mastra tools), exa-cache.ts
  workflows/    life-event-plan.ts
src/server      index.ts (Hono + MastraServer), routes.ts, exa-signature.ts
src/telegram    handlers.ts, render.ts, progress.ts, chat.ts, i18n.ts
fixtures        couple.espoo.json (fictional), monitor-event.sample.json (placeholder)
scripts         dev.mjs, reset.mjs, triage-samples.ts, smoke.mjs, smoke/ (fake APIs, mock-model app)
```

## Rules that must not be broken

1. **Silence by default.** Every inbound message goes through triage in
   `src/telegram/handlers.ts` before anything else. Unaddressed chatter gets no reply. If triage
   fails, stay silent. Never route unaddressed messages to `defaultHandler`.
2. **No unsourced facts.** Every factual claim in a bot message comes from an Exa result and carries
   its link. This is enforced in code: `extractEvidence` keeps a claim only if its quote is found
   verbatim in the Exa highlight it points at, and URL, title and date are copied from the Exa
   result. Do not loosen that check or let a model write URLs. When research finds nothing, say so.
3. **Secrets.** Real values live only in the gitignored `.env`. Never print, log, commit or paste
   them, and do not put them in `devcontainer.json`, the Dockerfile or fixtures. Log the names of
   missing settings, not values.
4. **Fictional data stays labelled.** The couple and both employers in the fixture are invented and
   marked as such. Do not add real private individuals.
5. **Telegram limits.**
   - Sends and edits in a group must be at least 3.1 s apart (`ProgressBoard`).
   - Callback data is capped at 64 bytes. The adapter wraps it as `chat:{"a":"<id>","v":"<value>"}`;
     the HR button with a run UUID is already at 61. Keep action ids short and values a single id.
   - Handlers must return quickly. Start long work (workflow runs) without awaiting it.
6. **One poller per bot token.** Each developer uses their own bot. Never run two processes with the
   same `TELEGRAM_BOT_TOKEN`.

## How the pieces connect

- `companionAgent` owns the Telegram channel. Its handlers (`onMessage`, `onSubscribedMessage`,
  `onMention`, `onDirectMessage`, `onAction`) are in `src/telegram/handlers.ts`.
- Triage decides: `offer` (confidence >= 0.75), `clarify` (>= 0.4), else `silent`. Thresholds are in
  `src/mastra/agents/triage.ts`.
- An offer is stored in Chat SDK thread state (persisted through Mastra storage) under a short id
  that the buttons carry.
- "Yes" starts the `life-event-plan` workflow: `announce` -> parallel `research-kela`,
  `research-clinic`, `research-employers` -> `compose-plan` (posts the card) -> `hr-approval`
  (suspends). The HR button resumes it with `createRun({ runId }).resume(...)`.
- To post into a chat outside a handler (workflow step, HTTP route), use `postToThread` from
  `src/telegram/chat.ts`. The channel connects in the background after startup, so `getChat()` can
  be null for the first moments.
- UI strings are in `src/telegram/i18n.ts` (en, fi). Model-written text follows the message language.
- Cards render as Telegram MarkdownV2. Run titles and source names through `plain()` in `render.ts`.

## Testing notes

- `pnpm smoke` runs the real app with `TELEGRAM_API_BASE_URL` and `EXA_BASE_URL` pointed at local
  fakes and a scripted mock model (`scripts/smoke/app.ts`). It proves plumbing, not model or search
  quality. If you add a model prompt, teach the mock in `answer()` how to respond to it.
- Real-API checks need keys in `.env`. If they are missing, say exactly which checks were not run.
  Do not claim they pass.
- The Exa cache is on in dev. Set `EXA_CACHE=off` or run `pnpm reset` when results must be live.

## Working agreements

- Keep it small: no auth system, no web UI, no test framework.
- Commit in small steps with clear messages. Work on a branch and open a pull request; do not push
  to `main` directly.
- Nothing is deployed from this repo. `Dockerfile` and `docker-compose.yml` exist for later.
