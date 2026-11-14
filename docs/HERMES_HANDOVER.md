# Hermes bot track handover

Snapshot: Saturday 14 November, 02:37 Helsinki. Live acceptance testing is still in progress. Draft PR: https://github.com/zacharyb1/junction-2026/pull/6.

## State and evidence

| Milestone | State | Evidence and remaining check |
|---|---|---|
| 1. Pinned, removable Hermes | Done | v0.23.1, commit `3b421578588243f920886e6fe79a6faa87ea026e`. Prior session's one-shot answer took 4 s. Runtime and home are inside `.hermes-local/`. |
| 2. Telegram DM returns a plan | Partly done | CLI rehearsal calls `mcp__casefile__research_case` and returns plan lines and a case link. Telegram group research is also recorded. The 02:36 washing-machine test arrived in the group and reused an old plan whose link returns HTTP 404. A successful Telegram DM research turn is still awaiting confirmation; CLI success does not satisfy this check. |
| 3. Family group with silence | Partly done | Group research, approval buttons and intentional silence observed. Four small-talk messages were skipped by the live gate. The required 20 small-talk messages including five questions, plus three consecutive pregnancy turns, are not yet demonstrated. |
| 4. Local gate | Done for the labelled-set check | `eval/results/gate-gemma3-1b.json`: 60 messages, 20 triggers, 40 small talk; 0 missed triggers, 4 false wakes, 0 gate errors. The live gateway also logged `pre_gateway_dispatch skip: reason=kaveri-gate:gemma:small_talk`. |
| 5. Handover | Draft prepared | This document and PR #6; update after the remaining live tests and before the machine is handed over. |

Before this track, the runbook was documentation-only. Now the local runtime, tool calls, group flow, local gate and a letter photo have live evidence. `hermes/CHECKS.md` records the boundaries. The 12 scenario rehearsals are direct CLI chats; they do not test Telegram delivery or group silence.

Gate comparisons: patterns alone missed 3/20 triggers with 0/40 false wakes; model alone missed 3/20 with 4/40 false wakes. Combined median model latency was 3.5 s on CPU. This is a development set, not an independent holdout. Unsure wakes the bot; model failure falls back to patterns. An open conversation bypasses classification for 180 seconds after a wake, so small talk in that window can reach the cloud model. Media always wakes it. Do not claim that all small talk or all family photos stay local.

Letter photo: native image routing through NVIDIA worked, with two street-name transcription errors. No comparative Gemini test, PDF test, voice test, guest-group test or daily-watch test was performed. The acknowledgement's five-second target has not passed a timed Telegram check.

## Known failure: old local cases were deleted

At about 02:29 the prior session switched from `.hermes-local/engine` to the repository-root engine and deleted the isolated directory, including its `.data/cases`. Earlier case links now fail. Stale open-case memory entries were subsequently removed. The current root engine was alive and returned HTTP 200 at continuation; that does not restore old cases.

The 02:30 reminder turn returned `No case with id …` twice from `case_update`, yet created job `fb7fa3846a5a` for 28 November at 09:00 and confirmed success. The job's case link is broken. Creation was observed; delivery and catch-up after sleep were not tested. Commit `d8eaf23` tells the skill to report failed updates, but that change has not been retested in a fresh conversation. Inspect this test job before relying on reminders; do not treat it as a passed end-to-end check.

Keep `.data/cases` when moving or rebuilding a local engine. Its location is relative to the engine's working directory. New local cases belong in this checkout's `.data/cases`. Never delete an old engine directory until its cases have been backed up and migrated.

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

- Vlad: remaining DM and group acceptance messages from Telegram. Do not substitute CLI rehearsals for these.
- Zachary: deployed engine URL and matching secret; validate production case links and review grounding fixes.
- Separate reviewer branch `review-grounding`: local refs show `340ae31` (verify independent readings), `3125e57` (withhold unsupported amounts), `b35abc9` (live scorecard comparison). These are not applied to this bot branch. Original reviewer edits were removed from this checkout; do not resurrect the obsolete patch. Read the current branch's `docs/REVIEW_NOTES.md` before integrating.
- Chat-scoped watch template exists separately as `cd8c82a` on `review-watch-template`. Current runbook's unscoped daily-watch job can mix profile-wide cases with delivery to one home chat. Do not enable it before reconciling numeric chat labels and delivery scope. No daily watch was created tonight.

## Decisions for the team

- Change-alert rule and a controllable demo page for the change watch.
- Gemini or Nemotron for letters, based on the two printed-letter comparison.
- Keep or drop Oxylabs given the credit-card requirement.
- Confirm the second submission under Context.dev's main challenge.
- Revisit Hostinger Saturday 14:00 only if the core is green.
- Bot bake-off Saturday 10:30: require three consecutive successful pregnancy runs.
- Product name: platform draft says AIDaddy; repo says Kaveri.
- Confirm open DMs, shared profile memory, slash-command restrictions and media bypass of the gate, as recorded in `docs/DECISIONS.md`.

## Next steps

1. Finish Telegram acceptance tests and validate fresh case links; fix or retire the stale test reminder.
2. Zachary reviews the independent-reading verification and unsupported-amount fixes before making grounding claims.
3. Context.dev as an extra verifier page reader with `maxAgeMs: 0` (documented default cache is three days).
4. Monitors on cited pages: engine receives and checks the webhook, then forwards to Hermes' inbound webhook. Settle the alert rule and chat scope first.
5. Aiven index mapping cited pages to cases.
6. ElevenLabs voice.

Before merging anything, compare Milan's `scaffold/milestone-1-2` with main: it differed by 168 files Friday night. Do not merge another track blindly. No PR was merged by this continuation.

## Merge risk

The bot configuration is reversible by stopping the runtime or removing its plugin. Running services, scheduled jobs and private local case data need separate handling; reverting a commit does not undo them. Preserve appended decision lines when resolving conflicts. This handover does not certify the engine verifier or production deployment.

Validation in this continuation: `pnpm lint`, `pnpm typecheck` and `pnpm build` passed on an isolated copy of `d8eaf23` with the installed lockfile dependencies. Only Markdown changed afterward; `git diff --check` passed. No production deployment or live reminder delivery was tested.
