# Hermes bot track handover

Snapshot: Saturday 14 November, including the Telegram tests through 02:42 Helsinki, the subsequent local recovery checks, and the morning process check below. Implementation PR: https://github.com/zacharyb1/junction-2026/pull/6.

The recorded scope is repeatable selected scenarios and polite handling of other messages. The broad 20-message silence run and repeated pregnancy triggers were cancelled. Final demo scenarios are not recorded in this snapshot; CLI rehearsals remain distinct from Telegram delivery checks.

## Current runtime state

A read-only process check on Vlad's machine on Saturday 14 November morning found the recorded Engine process still running, but no Hermes gateway process. The recorded gateway PID was absent, and no process matched the gateway command or this installation's Hermes runtime path. The configured bot endpoint still points at the local Engine. The gate plugin is installed; whether its model process is running was not established by this check. Five local Case JSON files are present.

No new Telegram delivery was attempted and no service was changed during that check. The successful Telegram runs below are historical evidence, not a claim that the bot is currently connected. This local process check does not establish whether another machine is polling the shared token.

## State and evidence

| Component | State | Evidence and limits |
|---|---|---|
| Pinned, removable Hermes | Done | v0.23.1, commit `3b421578588243f920886e6fe79a6faa87ea026e`. Prior session's one-shot answer took 4 s. Runtime and home are inside `.hermes-local/`. |
| Telegram DM returns a plan | Done against the local engine | At 02:42, Helsinki-to-Tampere move: `research_case` returned four plan lines and 5/5 verified quotes. All four lines, counts and URL match the DM reply. Case page and API returned HTTP 200. The approved draft was saved with `case_update` and is present in the stored case. |
| Family group with silence | Observed on the selected live messages | Group research, approval buttons and intentional silence observed. The gate stopped 6 of 7 small-talk messages locally; the false wake reached the cloud model, which stayed silent. This is a small sample, not a general reliability claim. |
| Local gate | Done for the labelled-set check | `eval/results/gate-gemma3-1b.json`: 60 messages, 20 triggers, 40 small talk; 0 missed triggers, 4 false wakes, 0 gate errors. The live gateway also logged `pre_gateway_dispatch skip: reason=kaveri-gate:gemma:small_talk`. |
| Handover | Published in draft PR | This document and PR #6 contain the measured state at this snapshot. |

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

The portable setup and deployment instructions are in [Deployment and operation](DEPLOYMENT.md#hermes-and-telegram), with detailed configuration in the [repo-local runbook](../hermes/README.md#quick-start-the-repo-local-install). Neither the project nor its running bot requires Orca or a Claude Code session. Teammates can use their own terminals, editors and deployment workflow.

Install and configure first; start a gateway only with its own development token or after the existing shared-token instance has stopped. The [morning process check](#current-runtime-state) found the Engine process running and no Hermes gateway on Vlad's machine. The bot configuration still uses a localhost Engine URL, so those Case links cannot open on another device. This document is a snapshot, not a live process monitor.

There is no cross-machine lock or automatic runtime takeover. The start script checks this installation's PID files; it cannot detect a teammate polling the same token elsewhere. Independent Telegram development needs a separate bot token and isolated Hermes state. Moving the shared bot requires stopping the former instance before starting its replacement. The deployment guide describes both arrangements.

Reminders, conversation state and memory are local to the Hermes home; a fresh clone does not inherit them. The repaired rent-letter reminder remains in the original runtime's local scheduler. Copying scheduled jobs into another active runtime can duplicate delivery, even when the Telegram polling conflict is avoided. Case storage and backups also need separate treatment when moving the runtime; git carries neither private state nor local Cases.

The repo-local prerequisites are git, curl, macOS or Linux, Node 22+ with npx for a local Engine, and Podman or Docker for the gate. Fedora was tested; macOS was not. The secret helper may offer to save missing values through the private keys repo's `put` command, which commits and pushes there. Private values belong in local files or the team's secret store, not chat.

Logs are in `.hermes-local/run/` and `.hermes-local/home/logs/`; the transcript database is `.hermes-local/home/state.db`. These may contain family messages and are not committed. `bash hermes/secrets.sh --status` reports which secret names are set without printing their values. Changed prompts load in a new chat conversation via `/new --yes`.

Production bot integration has not been tested in this snapshot. A deployed Engine URL and matching credentials are required; switching the endpoint alone does not transfer existing local Cases or scheduled reminders.

## Secret names and locations

Private keys repo: `bot.env` and `app.env`. Local copies: `.hermes-local/home/.env` and `.env.local`.

- Bot: `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, `EXA_API_KEY`, `CASEFILE_URL`, `CASEFILE_SECRET`.
- Local engine: `EXA_API_KEY`, `CASEFILE_SECRET`, `DEMO_ACCESS_CODE`.
- Access settings: `TELEGRAM_ALLOW_ALL_USERS`, `TELEGRAM_HOME_CHANNEL`.
- Optional voice: `ELEVENLABS_API_KEY`.

## Integration state and limits

- The fresh Telegram DM plan, Case link and saved draft passed against the local Engine. CLI rehearsals do not establish Telegram delivery, and no production bot integration is recorded.
- Separate reviewer branch `review-grounding` contains `340ae31` (verify independent readings), `3125e57` (withhold unsupported amounts) and `b35abc9` (live scorecard comparison). These are not applied to this bot branch. The original overlapping reviewer edits were removed from this checkout; the comparison is in that branch's `docs/research/VERIFIER_COMPARISON.md` and draft PR #7.
- The chat-scoped watch template from `cd8c82a` on `review-watch-template` is adopted in the reminder skill and runbook. Watch jobs require matching chat labels and delivery destinations. No live daily watch was enabled or tested.
- The rent-letter Case and stored deadline are repaired. Four older Cases had only summary records left and were not recovered; their old links remain unusable.
- Context.dev as an extra page reader and its monitor/webhook path are proposals, with no implementation on this branch. Aiven's cited-page-to-Case index and ElevenLabs bot voice are also absent.
- Milan's `scaffold/milestone-1-2` is a separate bot track. A Friday comparison differed from main by 168 files; this handover does not establish its compatibility or runtime behavior. This snapshot was prepared before integration; the PR links show current merge status.

## Unresolved choices at this snapshot

- The final bot track and concrete demo scenarios are not selected in this record. Pregnancy was an earlier proposed script, not an outstanding test requirement.
- The change-watch alert rule, chat ownership policy and controllable demo page are not settled. The second Context.dev submission remains conditional on a working production watch.
- Oxylabs has an account/credit-card dependency and no recorded real API use. The Hostinger scam-check idea remains exploratory.
- Nemotron has the demonstrated letter-reading role. Gemini has no demonstrated Hermes role; another bot track's use and the platform's challenge selections have not been checked here.
- The repository name is Kaveri. The prior supervisor recorded renaming the platform draft to Kaveri; current platform state has not been rechecked.
- Open DMs, shared profile memory, slash-command restrictions and media bypass are documented in `docs/DECISIONS.md`, including entries still marked for team confirmation.

## Merge risk

The bot configuration is reversible by stopping the runtime or removing its plugin. Running services, scheduled jobs and private local case data need separate handling; reverting a commit does not undo them. Preserve appended decision lines when resolving conflicts. This handover does not certify the engine verifier or production deployment.

Current repair validation: `pnpm lint`, `pnpm typecheck`, `pnpm build`, eight storage-preservation tests and four rehearsal-link tests passed in an isolated copy of the changed implementation. Only documentation and measured result files changed afterward. The local recovery and model/tool checks are recorded above. No production deployment or live reminder delivery was tested.

DM check at 02:42: acknowledgement 12.4 s, plan 32.1 s, draft completion 49.2 s including approval (stored timestamps relative to the incoming message). The five-second acknowledgement target failed. The case and its saved draft were retrieved successfully from the local engine.

## Current repair rehearsals

Isolated CLI profile, updated persona/skills, no Telegram delivery: missing-case reminder stopped after `case_get` in 7.8 s with no cron job. A stale washing-machine follow-up fetched the missing case then researched a new one in 30.5 s; two fresh repetitions took 31.6 s and 28.2 s. All three research outcomes returned matching case API JSON and HTTP 200 pages (6/6, 7/7 and 9/9 checked quotes respectively). Exa reported $0.063 total. Evidence: `eval/results/rehearse-hardening-20261114T*.json`. These establish the selected path and link validity, not Telegram delivery or fixed wording: one run added an extra summary after its plan.

Historical runtime application during the repair: the Telegram gateway was restarted gracefully with the updated persona; the Engine and local gate stayed running at that time. Startup archived all five Cases; all five remained readable through the Case API. The later morning process check found no gateway, as recorded above. New conversations load the updated instructions; use `/new --yes` before a future rehearsal to avoid an old conversation prompt.

Reminder success/duplicate checks in the isolated profile: explicit approver fixture created one job in 38.0 s; repetition in 15.8 s listed the same job without creating another. The test job was removed, none ran, and the real reminder was unchanged. An initial unnamed fixture waited for a first name without scheduling. The ID-only fixture checks scheduling/deduplication, not reminder URL content or delivery; the real reminder retains its full working case URL.


## Pre-merge source review, 14 November

The final review corrected four instruction/setup paths: direct messages now receive a short reply when research refuses the input; the gate honors Hermes' trusted bot-mention flag; configuration requires valid numeric admin IDs before writing settings; and rehearsals clear both `MEMORY.md` and `USER.md` before each run. Generated Python bytecode was removed from tracking.

Offline checks passed: eight Case-preservation tests, five rehearsal tests, seven gate-hook tests and four admin-configuration tests. The new suites are in CI. These source changes have not had a new Telegram delivery test; the installed gate plugin was not refreshed and no service was restarted by the review. Earlier live measurements above retain their original scope.
