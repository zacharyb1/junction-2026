# Hermes bot track handover

Snapshot: Saturday 14 November, including the Telegram tests through 02:42 Helsinki and the subsequent local recovery checks below. Draft PR: https://github.com/zacharyb1/junction-2026/pull/6.

Vlad narrowed tonight's scope to repeatable selected scenarios and polite handling of other messages. The broad 20-message silence run and repeated pregnancy triggers are no longer required tonight. The team will choose concrete demo scenarios later; CLI rehearsals remain distinct from Telegram delivery checks.

## State and evidence

| Milestone | State | Evidence and remaining check |
|---|---|---|
| 1. Pinned, removable Hermes | Done | v0.23.1, commit `3b421578588243f920886e6fe79a6faa87ea026e`. Prior session's one-shot answer took 4 s. Runtime and home are inside `.hermes-local/`. |
| 2. Telegram DM returns a plan | Done against the local engine | At 02:42, Helsinki-to-Tampere move: `research_case` returned four plan lines and 5/5 verified quotes. All four lines, counts and URL match the DM reply. Case page and API returned HTTP 200. The approved draft was saved with `case_update` and is present in the stored case. |
| 3. Family group with silence | Observed on the selected live messages | Group research, approval buttons and intentional silence observed. The gate stopped 6 of 7 small-talk messages locally; the false wake reached the cloud model, which stayed silent. This is a small sample, not a general reliability claim. |
| 4. Local gate | Done for the labelled-set check | `eval/results/gate-gemma3-1b.json`: 60 messages, 20 triggers, 40 small talk; 0 missed triggers, 4 false wakes, 0 gate errors. The live gateway also logged `pre_gateway_dispatch skip: reason=kaveri-gate:gemma:small_talk`. |
| 5. Handover | Published in draft PR | This document and PR #6; update as repairs and selected scenario checks finish. |

Before this track, the runbook was documentation-only. Now the local runtime, tool calls, group flow, local gate and a letter photo have live evidence. `hermes/CHECKS.md` records the boundaries. The 12 scenario rehearsals are direct CLI chats; they do not test Telegram delivery or group silence.

Gate comparisons: patterns alone missed 3/20 triggers with 0/40 false wakes; model alone missed 3/20 with 4/40 false wakes. Combined median model latency was 3.5 s on CPU. This is a development set, not an independent holdout. Unsure wakes the bot; model failure falls back to patterns. An open conversation bypasses classification for 180 seconds after a wake, so small talk in that window can reach the cloud model. Media always wakes it. Do not claim that all small talk or all family photos stay local.

Live gate evidence, 02:20–02:36: six small-talk messages were classified locally in 2.9–4.1 s. `running 10 min late` was a false wake. Streaming-price, laid-off and help messages then used `rule:open_window`, so those turns do not measure their independent classification paths. The photo used `rule:media`, the reminder request used `rule:addressed`, and the later washing-machine message used `patterns:trigger` at 02:36:26. A Gemma-only trigger outside the open window is still unmeasured live.

Letter photo: native image routing through NVIDIA worked. The reply covered all six field categories; two street-name transcription errors prevent calling it an exact transcription. Stored conversation timestamps show text acknowledgements after 3 and 4 s, and the photo acknowledgement after 12 s with the plan after 33 s. These are observed turn timings, not a delivery guarantee. No comparative Gemini test, PDF test, voice test, guest-group test or daily-watch test was performed. Nemotron has the demonstrated letter-reading role on this track; there is no current Gemini role to claim.

## Local case loss and recovery

At about 02:29 the prior session switched from `.hermes-local/engine` to the repository-root engine and deleted the isolated directory, including its `.data/cases`. Old links returned HTTP 404, and the bot reused a missing case in the 02:36 group reply. Stale open-case memory entries were subsequently removed.

The rent-letter case was recovered from a complete `case_get` JSON response, preserving its original data and six steps with their evidence. Its page and API changed from HTTP 404 to HTTP 200. Only summaries remained for four other old cases; those were not reconstructed or presented as recovered. The bot now fetches a remembered case with `case_get` before reusing it and researches again when it is absent.

The 02:30 reminder originally followed two failed case updates. After the exact case recovery, the existing “Submit a written objection” step was updated through the authenticated local API to the letter's date, `2026-11-30`, then read back. The existing reminder was retained for 28 November at 09:00 with the same delivery destination and `catch_up` setting; its name now includes the case ID. Its case link works again. No reminder was sent during this repair: delivery and catch-up after sleep remain untested.

The reminder skill now requires a successful case fetch and saved due date before scheduling. An isolated CLI rehearsal against a missing case completed in 7.8 s, called only `case_get`, and created no cron job. A stale-case follow-up completed in 30.5 s, called `case_get` then `research_case`, and returned a new case whose page and API both returned HTTP 200. These checks exercise the model/tool flow, not Telegram delivery.

The start/stop scripts now preserve exact JSON versions in `.hermes-local/case-backups/`. Startup copies missing cases from the previous engine without overwriting current files. If the previous engine was deleted, a unique archived version can be restored; several candidate versions stop startup for manual selection. Shutdown snapshots again after stopping the engine. Eight regression tests passed for migration, preservation, repeat runs and recovery from archives.

Keep `.data/cases` when moving or rebuilding a local engine. Its location is relative to the engine's working directory. New local cases belong in this checkout's `.data/cases`. Stop normally and preserve case data before deleting or changing an engine directory; filesystem backups do not protect arbitrary deletion between snapshots. See `hermes/README.md` for the case backup and migration commands.

## Run from a fresh clone

Needs git, curl, macOS or Linux, Node 22+ with npx for a local engine, and podman or docker for the gate. Fedora was tested; macOS was not. Only one machine may poll the shared Telegram token.

```bash
git clone --branch vlad/hermes-bot https://github.com/zacharyb1/junction-2026.git
cd junction-2026
bash hermes/setup-local.sh
git clone https://github.com/kapuchai/junction-2026-keys.git ../junction-2026-keys
bash hermes/secrets.sh --local-engine
bash hermes/configure.sh
bash hermes/install-gate.sh
bash hermes/start.sh
```

The secrets script may ask the human for missing values with hidden input. Never paste keys into chat. It can write missing values to the private keys repo through that repo's `put` command.

In Telegram, use the existing bot; for a new bot follow BotFather setup in the runbook, including disabling group privacy and removing/re-adding it. Send `/sethome` as an allowed admin in the family group, then run:

```bash
KAVERI_CHAT_ID='replace-with-the-numeric-chat-id'
bash hermes/configure.sh --group "$KAVERI_CHAT_ID"
bash hermes/stop.sh
bash hermes/start.sh
```

Send `/new --yes` in the chat to load changed prompts. Stop all locally managed services with `bash hermes/stop.sh`. At this snapshot the gateway, root engine and gate are left running on Vlad's machine. Coordinate a stop before another teammate starts the shared bot.

Logs: `.hermes-local/run/`, `.hermes-local/home/logs/`; transcript database: `.hermes-local/home/state.db`. Logs and transcripts may contain family messages; do not commit them. Check installed version with `hermes/bin/hermes --version` and secret presence with `bash hermes/secrets.sh --status`.

To use production, obtain matching production credentials from Zachary, stop the bot, run `bash hermes/secrets.sh --production`, then start it. Tonight's local case links point at localhost and cannot be opened on a teammate's phone. Do not claim production bot integration is tested.

## Secret names and locations

Private keys repo: `bot.env` and `app.env`. Local copies: `.hermes-local/home/.env` and `.env.local`.

- Bot: `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, `EXA_API_KEY`, `CASEFILE_URL`, `CASEFILE_SECRET`.
- Local engine: `EXA_API_KEY`, `CASEFILE_SECRET`, `DEMO_ACCESS_CODE`.
- Access settings: `TELEGRAM_ALLOW_ALL_USERS`, `TELEGRAM_HOME_CHANNEL`.
- Optional voice: `ELEVENLABS_API_KEY`.

## Blockers and review work

- Telegram: the fresh DM plan, case link and saved draft passed. Confirm the team's chosen group scenario during its next rehearsal; no broad live-message run is required tonight. CLI rehearsals do not establish Telegram delivery.
- Zachary: deployed engine URL and matching secret; validate production case links and review grounding fixes.
- Separate reviewer branch `review-grounding`: local refs show `340ae31` (verify independent readings), `3125e57` (withhold unsupported amounts), `b35abc9` (live scorecard comparison). These are not applied to this bot branch. Original reviewer edits were removed from this checkout; do not resurrect the obsolete patch. Read that branch's `docs/research/VERIFIER_COMPARISON.md` and draft PR #7 before integrating.
- The chat-scoped watch template from `cd8c82a` on `review-watch-template` is now adopted in the reminder skill and runbook. Watch jobs must restrict cases to the matching chat label and delivery destination. No live daily watch was enabled or tested tonight.

## Decisions for the team

- Change-alert rule and a controllable demo page for the change watch.
- Submission challenge selection: retain Nemotron's demonstrated letter-reading role. Claim Gemini only if another demonstrated role is added (including on Milan's track); the current platform selection has not been rechecked.
- Keep or drop Oxylabs given the credit-card requirement.
- Confirm the second submission under Context.dev's main challenge.
- Revisit Hostinger Saturday 14:00 only if the core is green.
- Bot bake-off Saturday 10:30: agree the concrete scenario and repeatability check with the team. Pregnancy was the original proposed script, not a required extra test tonight.
- Product name: the repo says Kaveri. The prior supervisor recorded renaming the platform draft to Kaveri; current platform state has not been rechecked.
- Confirm open DMs, shared profile memory, slash-command restrictions and media bypass of the gate, as recorded in `docs/DECISIONS.md`.

## Next steps

1. Rehearse the team's chosen scenarios and confirm Telegram delivery, including a due reminder when that feature is selected. The rent-letter case and stored deadline are repaired; four unrecoverable old cases require fresh research.
2. Zachary reviews the independent-reading verification and unsupported-amount fixes before making grounding claims.
3. Deferred to the team after the core scenario works: Context.dev as an extra verifier page reader with `maxAgeMs: 0` (documented default cache is three days).
4. Deferred: monitors on cited pages. The engine receives and checks the webhook, then forwards to Hermes' inbound webhook. Settle the alert rule and chat scope first.
5. Deferred: Aiven index mapping cited pages to cases.
6. Deferred: ElevenLabs voice.

Before merging anything, compare Milan's `scaffold/milestone-1-2` with main: it differed by 168 files Friday night. Do not merge another track blindly. No PR was merged by this continuation.

## Merge risk

The bot configuration is reversible by stopping the runtime or removing its plugin. Running services, scheduled jobs and private local case data need separate handling; reverting a commit does not undo them. Preserve appended decision lines when resolving conflicts. This handover does not certify the engine verifier or production deployment.

Current repair validation: `pnpm lint`, `pnpm typecheck`, `pnpm build`, eight storage-preservation tests and four rehearsal-link tests passed in an isolated copy of the changed implementation. Only documentation and measured result files changed afterward. The local recovery and model/tool checks are recorded above. No production deployment or live reminder delivery was tested.

DM check at 02:42: acknowledgement 12.4 s, plan 32.1 s, draft completion 49.2 s including approval (stored timestamps relative to the incoming message). The five-second acknowledgement target failed. The case and its saved draft were retrieved successfully from the local engine.

## Current repair rehearsals

Isolated CLI profile, updated persona/skills, no Telegram delivery: missing-case reminder stopped after `case_get` in 7.8 s with no cron job. A stale washing-machine follow-up fetched the missing case then researched a new one in 30.5 s; two fresh repetitions took 31.6 s and 28.2 s. All three research outcomes returned matching case API JSON and HTTP 200 pages (6/6, 7/7 and 9/9 checked quotes respectively). Exa reported $0.063 total. Evidence: `eval/results/rehearse-hardening-20261114T*.json`. These establish the selected path and link validity, not Telegram delivery or fixed wording: one run added an extra summary after its plan.

Runtime application: the Telegram gateway was restarted gracefully with the updated persona; the engine and local gate stayed running. Startup archived all five current cases; all five remained readable through the case API. New conversations load the updated instructions; use `/new --yes` before a future rehearsal to avoid an old conversation prompt.

Reminder success/duplicate checks in the isolated profile: explicit approver fixture created one job in 38.0 s; repetition in 15.8 s listed the same job without creating another. The test job was removed, none ran, and the real reminder was unchanged. An initial unnamed fixture waited for a first name without scheduling. The ID-only fixture checks scheduling/deduplication, not reminder URL content or delivery; the real reminder retains its full working case URL.
