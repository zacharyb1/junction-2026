# Kaveri on Hermes Agent: runbook

From an empty laptop to "the bot answers in the family group". Follow the steps in order. Each step gives the exact command or setting, what you should see, and the Hermes doc line it was checked against.

## Read this first

- **Source of truth.** Everything here was checked against the Hermes repository at `main`, commit `4932eea7`, cloned on 13 Nov 2026. References such as `telegram.md:270` are file and line under `website/docs/` in that repository. `CHECKS.md` lists every key, variable, command and tool name with its full doc path.
- **Part of this was run against a live Hermes** on Fri night (v0.23.1, Nemotron, Fedora): the quick start below, steps 3 and 8 to 12, the group flow of step 14 and the gate. `CHECKS.md` lists what was seen and what was not run. For the rest, treat the "Expect" lines as the test.
- **Version drift.** The installer puts you on the latest stable release (`installation.md:90`), which can be older than the docs above. If a documented feature is missing, see "UNVERIFIED" at the top of `CHECKS.md`.
- **Contract.** The bot does not research. It calls `research_case` on our web app and posts what comes back (`docs/CONTRACTS.md`).

## Quick start: the repo-local install

**Before launching:** choose an [independent test bot or a shared-bot takeover](../docs/DEPLOYMENT.md#hermes-and-telegram). A clone is not a second instance of the shared token. The helper below copies shared credentials; it is not the independent-test-token setup. There is no cross-machine lock. The runtime does not need Orca or an open Claude Code session.

This is the path that was actually run (Fedora, Fri night 13 Nov). It installs nothing outside this repository folder: no `hermes` on your PATH, no line in your shell profile, no sudo. The long runbook below explains each setting and still applies; where it says `hermes ...`, run `hermes/bin/hermes ...`, or put the wrapper on your PATH for one terminal with `export PATH="$PWD/hermes/bin:$PATH"`.

Needs: macOS or Linux, git, curl, Node 22 or newer with npx (only for a local engine), podman or docker (only for the gate).

```bash
# 1. Hermes, pinned to release v0.23.1 (commit 3b421578), into .hermes-local/ (git-ignored). 10 to 30 minutes on venue Wi-Fi.
bash hermes/setup-local.sh

# 2. Secrets. Clone the team's private keys repo next to this checkout once, then:
git clone https://github.com/kapuchai/junction-2026-keys.git ../junction-2026-keys
# Choose one Engine; do not run both alternatives:
bash hermes/secrets.sh --production     # deployed Engine, matching URL/secret must exist in the keys repo
# bash hermes/secrets.sh --local-engine # alternative: local Engine, links open only here

# 3. Model, Part 1 of the config, persona and skills
bash hermes/configure.sh

# 4. Only after shared-token handover (or with your independent token): start/stop. Logs in .hermes-local/run/
bash hermes/start.sh
```

Stop that managed runtime with `bash hermes/stop.sh` (see the deployment guide before stopping a shared local gate).

Then follow the runbook from step 10 (direct message test). After `/sethome` in the family group, step 12 is one command: `bash hermes/configure.sh --group <CHAT_ID>`, then stop and start.

- **Local case data:** startup migrates missing cases from an old engine and keeps exact backups in `.hermes-local/case-backups/`; shutdown snapshots after stopping the engine. Existing cases are never overwritten. Conflicting versions are preserved and reported; an ambiguous recovery stops for inspection. Keep this backup directory when moving the bot. Earlier test cases were lost during an engine switch; see `docs/HERMES_HANDOVER.md`.
- **One poller per bot token.** The keys repo shares one `TELEGRAM_BOT_TOKEN`. Before you start, make sure nobody else's copy is running, or one of the two fails with `Telegram polling conflict`.
- **Secrets** live only in `.hermes-local/home/.env` and `.env.local`, both git-ignored. `bash hermes/secrets.sh --status` shows which names are set and never prints values. A value entered there goes through the keys repo's `./put` (hidden input) and is pushed to the team.
- **If the install is interrupted**, run `bash hermes/setup-local.sh` again. It continues from the stage that failed.
- **Do not move or rename the repository folder** after installing: Hermes' launcher stores absolute paths. Move it, then delete `.hermes-local/agent` and install again.
- **Remove the runtime:** first run `bash hermes/stop.sh` and copy `.hermes-local/case-backups/` somewhere outside the checkout. Then remove `.hermes-local` and `.env.local`. Keep `.data/cases` if you need existing case links. The gate's container image is stored separately (`podman rmi docker.io/ollama/ollama:0.40.16`).

The gate (a small local Gemma that drops small talk before any cloud call) has its own section below.

**Rehearse a scenario without Telegram:** `python3 eval/bot/rehearse.py "I'm pregnant, due in May."` runs the message three times through the same agent, in a Hermes profile of its own, and prints time, tools called and the first line of each reply. Each case link is checked against both its stored-case API and page; broken links fail the run. `-f eval/bot/scenarios.txt` runs the four previously rehearsed messages. It is a direct chat, so it does not test silence or the gate.

**What differs from the long runbook below**
- Steps 1, 2, 5 to 8 and 12 are done by `setup-local.sh`, `secrets.sh` and `configure.sh`. There is no `hermes model` or `hermes gateway setup` step.
- The bot is open to all direct messages when `TELEGRAM_ALLOW_ALL_USERS=true` is in the keys repo. Slash commands are then limited to the IDs in `TELEGRAM_ALLOWED_USERS`; everyone else has `/start` and `/new`. Use the ID of the account you actually write from, or `/sethome` is refused.
- You do not need `/sethome` to find the chat ID: after one message in the group, `grep "inbound message" .hermes-local/home/logs/gateway.log | tail -1` shows `chat=-...`. `/sethome` is still needed for reminders.
- In a direct chat the bot always answers. `[SILENT]` is for groups only, and only after step 12, otherwise Hermes posts its own notice.
- A plan arrives as an interim message, so `gateway.log` shows `Sending response (5 chars)` for the closing "Okay." and nothing for the plan itself. Read the transcript in `state.db` or the chat.

## What is in this folder

| File | Purpose |
|---|---|
| `SOUL.md` | The persona and rules. `install.sh` copies it to the Hermes home. |
| `config.snippet.yaml` | Every key we set in `~/.hermes/config.yaml`. Mode A active, Mode B switched off with a `#B ` prefix. |
| `env.example` | Every variable we need in `~/.hermes/.env`. |
| `skills/butler/*/SKILL.md` | `life-event-butler`, `letter-decoder`, `deadline-keeper`. Hermes loads them from here. |
| `install.sh` | Installs `SOUL.md`, reports what is missing, prints next steps. Changes nothing else. |
| `CHECKS.md` | Where each fact was confirmed, and what could not be confirmed. |
| `setup-local.sh` | Installs Hermes, pinned, into `.hermes-local/`. Nothing global. |
| `bin/hermes` | Wrapper: runs the repo-local Hermes with its repo-local home. |
| `secrets.sh` | Copies values from the team's keys repo into the git-ignored env files. |
| `configure.sh` | Writes the model and the keys from `config.snippet.yaml` into the Hermes home. |
| `start.sh`, `stop.sh` | Start and stop the engine (if local), the gate model and the gateway. |
| `plugins/kaveri-gate/`, `install-gate.sh`, `gate.sh` | The gate: plugin source, its installer, and the local model's start and stop. |

Tool names as the model sees them (`mcp-config-reference.md:302-321`):
`mcp__casefile__research_case`, `mcp__casefile__case_update`, `mcp__casefile__case_get`, `mcp__casefile__case_recheck`, `mcp__casefile__case_publish`, `mcp__exa__web_search_advanced_exa`, `mcp__exa__web_fetch_exa`, plus the built-ins `clarify`, `memory`, `cronjob_manage`, `vision_analyze`.

## Runbook

The manual installation/configuration steps below are reference for understanding settings. The repo-local quick start above is the supported team setup; its scripts replace steps 1, 2, 5–8 and 12. Do not run the global installer or overwrite a configured local home while following that path.

### 0. Prerequisites

- A laptop that can stay on and online. macOS, Linux or WSL2, with Git, curl and tar (`installation.md:169`).
- Your Telegram account, and a second account or a teammate for the group tests.
- An API key for the model provider, an Exa API key, and from whoever deployed the web app: its URL and `CASEFILE_SECRET`.
- This repository cloned on the laptop. Commands below run from its root.

### 1. Install Hermes

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc        # or: source ~/.bashrc
hermes --version
```

Expect: a version number. `hermes: command not found` means the shell was not reloaded (`installation.md:54`, `:136`, `:251`).

### 2. Choose the model

```bash
hermes model
```

Pick a provider and paste its key (`quickstart.md:84`). The model must call tools reliably, accept images (letters are photos), have at least 64K context (`quickstart.md:157`) and answer fast, because the acknowledgement has to arrive within 5 seconds.

### 3. One working chat before anything else

```bash
hermes chat --oneshot -q "Reply with the single word: ready"
```

Expect: `ready`. If your release does not know `--oneshot` (it arrived with 0.21), drop it. If the chat fails, fix it before going on (`cli-commands.md:130`, `quickstart.md:49`).

### 4. Create the bot and turn privacy mode off

In Telegram, talk to @BotFather:

1. `/newbot`, display name `Kaveri`, a username ending in `bot`. Copy the token (`telegram.md:34`).
2. `/mybots`, your bot, **Bot Settings, Group Privacy, Turn off** (`telegram.md:270`).

Do this before the bot joins any group. If it is already in a group, remove it and add it again, otherwise Telegram keeps the old setting (`telegram.md:273`). Do not use the "make it admin" alternative (`telegram.md:277`): see the note on pinning in `CHECKS.md`, U9.

### 5. Telegram credentials

Get your numeric user ID from @userinfobot (`telegram.md:312`), then:

```bash
hermes gateway setup
```

Choose Telegram, paste the token, enter your user ID (`telegram.md:320-326`). When the wizard offers to start the gateway, answer **no**. You start it in step 10, and two gateways on one token fight over polling (`telegram.md:739`, `:1563`).

Expect: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USERS` in `~/.hermes/.env` (`telegram.md:333-334`).

### 6. The other secrets

```bash
hermes config env-path          # prints the .env location
```

For the repo-local installation, use `bash hermes/secrets.sh --production` (production) or `bash hermes/secrets.sh --local-engine` instead of manually editing a global Hermes home. The team values come from `bot.env` and `app.env` in the separate private keys repo. For a manual installation, open the file above (`cli-commands.md:1378`) and set the three names from `hermes/env.example`: `EXA_API_KEY`, `CASEFILE_URL`, `CASEFILE_SECRET`; obtain matching production values from the Engine owner. `CASEFILE_URL` is `https://junction-2026.vercel.app/api/mcp`. Secrets belong in `.env`, not in `config.yaml` (`configuration.md:67`). `CASEFILE_SECRET` must be identical to the value in the Vercel project.

### 7. Install the persona

```bash
bash hermes/install.sh
```

Expect: `[ok] installed SOUL.md`, a list of variables still missing from `.env`, and the skills path for this machine. Hermes reads the persona only from `~/.hermes/SOUL.md` (`personality.md:21`, `:35`). The script keeps the previous file as `SOUL.md.bak-<timestamp>`.

### 8. Apply the config, Part 1

Part 1 of `config.snippet.yaml` is everything that does not need the group chat ID. Two ways to apply it. Use one.

**Option A, commands (no YAML editing).** `hermes config set` writes dotted keys into `config.yaml` and accepts list literals (`cli-commands.md:1375`, `configuring-models.md:400`).

```bash
SKILLS_DIR="$(pwd)/hermes/skills"
hermes config set web.backend exa
hermes config set mcp_servers.casefile.url '${CASEFILE_URL}'
hermes config set mcp_servers.casefile.headers.Authorization 'Bearer ${CASEFILE_SECRET}'
hermes config set mcp_servers.casefile.timeout 240
hermes config set mcp_servers.exa.url 'https://mcp.exa.ai/mcp?tools=web_search_advanced_exa,web_fetch_exa'
hermes config set mcp_servers.exa.headers.x-api-key '${EXA_API_KEY}'
hermes config set mcp_servers.exa.timeout 120
hermes config set mcp_servers.exa.supports_parallel_tool_calls true
hermes config set skills.external_dirs "[\"$SKILLS_DIR\"]"
hermes config set skills.auto_load '["life-event-butler", "letter-decoder", "deadline-keeper"]'
hermes config set skills.write_approval true
hermes config set agent.disabled_toolsets '["terminal", "file", "code_execution", "browser", "computer_use", "delegation", "image_gen", "video_gen", "session_search"]'
hermes config set agent.clarify_timeout 300
hermes config set agent.reasoning_effort low
hermes config set tools.tool_search.enabled off
hermes config set group_sessions_per_user false
hermes config set timezone Europe/Helsinki
hermes config set display.busy_input_mode queue
hermes config set display.busy_ack_enabled false
hermes config set display.memory_notifications off
hermes config set display.platforms.telegram.tool_progress off
hermes config set display.platforms.telegram.interim_assistant_messages true
hermes config set display.platforms.telegram.long_running_notifications false
hermes config set auxiliary.background_review.enabled false
hermes config set cron.wrap_response false
```

The single quotes around `${...}` matter: the shell must not expand them, Hermes does that when it loads the config (`configuration.md:178`, `mcp-config-reference.md:77-90`). Each command should confirm what it set. A "not a known key" notice for `display.busy_ack_enabled` is expected. If a command is refused, set that key by hand with Option B.

**Option B, by hand.** Run `hermes config edit` (`cli-commands.md:1373`) and copy Part 1 of `config.snippet.yaml` in. Rules:

1. First see which top-level keys you already have:
   `grep -nE '^(web|mcp_servers|skills|agent|tools|display|auxiliary|cron|group_sessions_per_user|timezone):' "$(hermes config path)"`
2. For a key that exists, add only the child lines under it. Never create a second copy of a top-level key. The config is then rejected or the earlier block is dropped (`telegram.md:375`).
3. Replace `/ABSOLUTE/PATH/TO/junction-2026/hermes/skills` with the path `install.sh` printed.
4. Keep the quotes around `"off"`.

Why each key is there is written next to it in `config.snippet.yaml`.

### 9. Check before starting

```bash
hermes config check
hermes doctor
hermes config get web.backend                   # exa
hermes config get display.memory_notifications   # off
hermes mcp test casefile
hermes mcp test exa
hermes skills list | grep -E 'life-event-butler|letter-decoder|deadline-keeper'
```

Expect:

- `config check` and `doctor` report no broken config (commands: `cli-commands.md:1379`, `:1001`, `:1374`, `:1653`, `:1437`). If `config.yaml` does not parse, Hermes silently serves the last good copy and warns at every start (`configuration.md:253`), so a wrong value from `config get` usually means a YAML error.
- `mcp test casefile` lists five tools: `research_case`, `case_publish`, `case_update`, `case_get`, `case_recheck`. `mcp test exa` lists `web_search_advanced_exa` and `web_fetch_exa` (`use-mcp-with-hermes.md:90`). A `401` means the secret or key is wrong. A message naming `${CASEFILE_URL}` or `${CASEFILE_SECRET}` means that variable is missing from `.env` (`mcp-config-reference.md:90`).
- Three skill names. None listed means the `skills.external_dirs` path is wrong: a missing directory is skipped without an error (`skills.md:428`).

Optional, recommended on a laptop used only for this bot: `hermes skills opt-out --remove` deletes the unmodified bundled skills from this profile, so the three butler skills are the only ones in the prompt (`skills.md:59-71`).

### 10. Start the gateway and test in a direct message

```bash
hermes gateway run
```

It runs in the foreground and logs to this terminal (`cli-commands.md:319`, `team-telegram-assistant.md:124`). Leave it running and use a second terminal from now on.

In Telegram, open a DM with the bot and send, one at a time:

1. `hello`. Expect a short answer in the Kaveri voice.
2. `List the exact names of every tool you can call whose name starts with mcp`. Expect the seven `mcp__...` names listed above. If they come back with single underscores (`mcp_casefile_research_case`), your release uses the older prefix: see `CHECKS.md`, U2, for the one-line fix.
3. `We live in Espoo, Finland. I'm pregnant, due in May. We both work full time.` Expect, in this order: one acknowledgement line within about 5 seconds, then one message with at most five plan lines carrying `[1]`-style numbers, a line "N of M quotes checked on their pages", the case URL, and the buttons Draft the notice, Set reminders, Why I spoke, Not now. The engine itself answers in about 6 to 12 seconds in fast mode.

If step 3 fails, read "The six most likely failures" before touching the group.

### 11. Create the family group and make it the home channel

1. Create a Telegram group and add the bot and your second account.
2. In the group, send `/sethome` (`telegram.md:480`).

Expect: a reply naming the group and its ID, a negative number such as `-1001234567890`. The same ID is written to `.env` as `TELEGRAM_HOME_CHANNEL` (`cli-commands.md:1375`, `telegram.md:485`):

```bash
grep '^TELEGRAM_HOME_CHANNEL=' "$(hermes config env-path)"
```

Reminders and the change watch are delivered to this home channel. No reply to `/sethome` means Telegram is not delivering group messages to the bot: redo step 4, including remove and re-add.

### 12. Apply the config, Part 2, and restart

Part 2 needs the chat ID. Do not apply it earlier: with the placeholder still in `allowed_chats`, the bot ignores every group, `/sethome` included.

**Option A, commands.**

```bash
CHAT_ID="-1001234567890"        # the ID from step 11
hermes config set platforms.telegram.gateway_restart_notification false
hermes config set "platforms.telegram.channel_overrides.$CHAT_ID.allow_silence" true
hermes config set telegram.allowed_chats "[\"$CHAT_ID\"]"
hermes config set telegram.group_allowed_chats "[\"$CHAT_ID\"]"
```

**Option B, by hand.** `hermes config edit`, copy Part 2 of `config.snippet.yaml`, replace `-100FAMILYCHATID` in all three places. `/sethome` has already created a `platforms:` block with `telegram:` and `home_channel:` in it: add `gateway_restart_notification` and `channel_overrides` inside that block.

Then restart: press Ctrl+C in the gateway terminal, run `hermes gateway run` again, and send `/new --yes` in the group (`slash-commands.md:248`). A running conversation keeps its old tools and prompt until a new session starts (`kanban.md:448-450`, `use-soul-with-hermes.md:226`).

What Part 2 does: `allowed_chats` limits the bot to this group, `group_allowed_chats` lets every member trigger it without listing user IDs (`telegram.md:284-294`, `:1298`), and `allow_silence` lets a bare `[SILENT]` stand even when the message contains a question mark (`messaging/index.md:356-380`).

### 13. Consent note and household memory

In the group:

1. Send any message, for example `hello everyone`. Expect one short note: what Kaveri reads, what it keeps, and that "forget everything" wipes its memory of the household. This is posted on the first message the bot handles in a group. Hermes does not wake the agent when the bot is added (`CHECKS.md`, U6).
2. Send `Kaveri, remember for this household: we live in Espoo, Finland. Anna and Mikko, both employees, both residents of Finland.` Expect a one-line confirmation.
3. On the laptop: `cat ~/.hermes/memories/MEMORY.md`. Expect the household entry and the consent entry (`memory.md:20`, `:71-78`).
4. Send `/new --yes`. Memory is put into the prompt only when a session starts (`memory.md:57`).

### 14. Rehearse selected scenarios

Mode A is what Part 1 and Part 2 give you: every group message reaches the model and it answers `[SILENT]` unless a trigger applies (`telegram.md:722-735`).

1. Select the demo scenarios with the team. Tonight's broad 20-message silence run was cancelled in favour of repeatable selected scenarios. Existing live evidence and its limits are in `docs/HERMES_HANDOVER.md`.
2. Start a fresh conversation and send the selected trigger. Expect an acknowledgement, then a sourced plan. About 5 seconds to acknowledge remains a target, not a proven guarantee. For independent gate-path checks, leave more than 180 seconds without messages after the previous wake.
3. Open the link, then tap **Draft the notice**. Expect the draft in the chat and on the case page. Tap **Set reminders**. Expect a one-line confirmation, and `hermes cron list` shows the reminder jobs (`cron.md:293`).
4. Send a photo of an official letter. Expect four lines of explanation, then a plan.

Record the actual gate decisions and replies for each selected message. If the bot posts `The model returned only a silence marker...`, answers small talk, or costs too much, switch to Mode B below. Record the decision in `docs/DECISIONS.md`.

### 15. Create the daily change watch

Optional: the team has deferred enabling this job until the alert rule is agreed. This is a scoped template, not a completed live watch test.

Use the numeric chat ID from step 11 in both the prompt and delivery target. Open-case memory entries must carry that exact chat ID; ambiguous or unlabelled entries are skipped. Create a separate job for each chat whose cases should be watched.

```bash
(
KAVERI_WATCH_CHAT_ID="-100FAMILYCHATID" # replace with the numeric ID from step 11
[[ "$KAVERI_WATCH_CHAT_ID" =~ ^-?[0-9]+$ ]] || { echo "Set the numeric chat ID first" >&2; exit 1; }
hermes cron create "0 8 * * *" \
  "Daily change watch for Telegram chat ID ${KAVERI_WATCH_CHAT_ID}, delivery target telegram:${KAVERI_WATCH_CHAT_ID}. Follow the deadline-keeper skill. Check only open cases explicitly labelled with this exact chat ID. Skip other chats and unlabelled or ambiguous entries. If none qualify or nothing changed, reply exactly [SILENT]." \
  --skill deadline-keeper --name "Kaveri change watch ${KAVERI_WATCH_CHAT_ID}" --deliver "telegram:${KAVERI_WATCH_CHAT_ID}"
hermes cron list
hermes cron run "Kaveri change watch ${KAVERI_WATCH_CHAT_ID}"
hermes cron runs
)
```

`--deliver telegram:<chat_id>` pins delivery to that chat (`cron.md:654`), even if the home channel changes later. Remove any old unscoped "Kaveri change watch" job before creating the scoped replacement. A reply of `[SILENT]` sends nothing (`cron.md:908`). `cron run` queues the job for the next scheduler tick, so wait about a minute (`cli-commands.md:795`). Expect a completed run in `hermes cron runs` and no message in the group while nothing has changed. Jobs only run while the gateway is running (`cron.md:423`).

## Mode B: wake patterns

In Mode B the bot still records the whole chat as context, but the model is only called for a wake pattern, an @mention or a reply to the bot (`telegram.md:280-296`, `:712-716`). It is cheaper and fully predictable.

```bash
PATTERNS="[$(sed -n 's/^ *#B   - \(".*"\)$/\1/p' hermes/config.snippet.yaml | paste -sd, -)]"
echo "$PATTERNS" | cut -c1-80          # must start with ["^\\s*(hey
hermes config set telegram.mention_patterns "$PATTERNS"
hermes config set telegram.require_mention true
hermes config set telegram.observe_unmentioned_group_messages true
hermes config set telegram.reactions true
```

Restart the gateway and send `/new --yes` in the group. By hand instead: print the lines with `sed -n 's/^\( *\)#B /\1/p' hermes/config.snippet.yaml` and paste them under the existing `telegram:` key.

The patterns cover English and Finnish, with one optional Swedish line. They were tested against 54 trigger sentences and 29 small-talk sentences. A false wake costs one silent turn, because `allow_silence` from Part 2 still applies.

Differences from Mode A:

- A photo with no caption does not wake the bot. Send the letter with a caption such as `letter from the landlord`, or reply to the bot (`telegram.md:296`, `:843`).
- `reactions: true` puts an eyes reaction on the message that woke the bot (`telegram.md:1502-1515`). It is off in Mode A, where it would mark every message.
- The consent note appears on the first wake, so send `@yourbot hello` once after setup.

Back to Mode A: `hermes config unset telegram.require_mention`, and the same for `telegram.observe_unmentioned_group_messages`, `telegram.reactions` and `telegram.mention_patterns` (`cli-commands.md:1376`). Restart, `/new --yes`.

## The gate: small talk never leaves the laptop

A Hermes plugin on the `pre_gateway_dispatch` hook decides, on this machine, whether a group message may reach the cloud model. Small talk is dropped before any model call, any transcript entry and any network request. Direct messages are never gated.

Order of the decision (`hermes/plugins/kaveri-gate/gate.py`):

1. **Rules, no model.** Wake when the message names Kaveri, replies to the bot, is a slash command, or carries a photo or file (it may be an official letter, and the text-only gate cannot look).
2. **Wake patterns.** The nine Mode B patterns from `config.snippet.yaml`. A hit is a sure trigger: wake at once.
3. **Local Gemma** (`gemma3:1b` through Ollama, JSON-schema output) labels the rest `trigger`, `small_talk` or `unsure`. Only `small_talk` is dropped. Unsure wakes the bot.
4. **Gate down or slower than 8 seconds:** the wake patterns alone have decided. Never "let everything through".

After a wake the chat stays open to the bot for 180 seconds (`KAVERI_GATE_OPEN_SECONDS`), so answers to its questions and taps on its buttons reach it. A woken bot still applies its own silence rule.

```bash
bash hermes/install-gate.sh        # copy the plugin into the Hermes home and enable it
bash hermes/gate.sh start          # Ollama in a podman or docker container, model data in .hermes-local/ollama
bash hermes/stop.sh && bash hermes/start.sh
bash hermes/install-gate.sh --remove   # switch the gate off again
```

`hermes/start.sh` starts the gate model by itself once the plugin is installed. On macOS without podman or docker, install the Ollama app: `gate.sh` uses whatever answers on port 11434. Every decision is logged to `.hermes-local/home/logs/kaveri-gate.jsonl` (decision, source, label, milliseconds; message text only with `KAVERI_GATE_LOG_TEXT=1`).

**Measured** on `eval/gate/messages.jsonl` (60 messages: 40 small talk, 20 triggers, half English, half Finnish), Fri night, laptop CPU, no GPU. Run it yourself with `python3 eval/gate/run.py`; results land in `eval/results/gate-*.json`.

| Gate | Missed triggers | False wakes | Median per message |
|---|---|---|---|
| Wake patterns alone (the fallback) | 3 of 20 | 0 of 40 | under 1 ms |
| `gemma3:1b` alone | 3 of 20 (one of them "I'm pregnant") | 4 of 40 | 3.7 s |
| Patterns, then `gemma3:1b` (what runs) | 0 of 20 | 4 of 40 | 3.5 s for messages that reach the model, 0 for pattern hits |

Read these numbers with care: the message set and the patterns were written by the same people, so the set flatters the patterns. The 1B model alone is not good enough to be the gate. A false wake costs one cloud call that should end in `[SILENT]`. A dropped message is also absent from the bot's context, so the bot cannot refer back to small talk it never saw.

## Judge mode

Three ways to let a judge try the bot. All need a gateway restart after the change.

| Option | Setting | Effect | Doc |
|---|---|---|---|
| 1. Pairing code | `hermes config set telegram.unauthorized_dm_behavior pair` | A judge who DMs the bot gets a code. You run `hermes pairing approve telegram <CODE>`. No restart per judge. | `configuration.md:2838-2861`, `security.md:516-540`, `cli-commands.md:1419` |
| 2. Open door | `TELEGRAM_ALLOW_ALL_USERS=true` in `.env` | Anyone can DM the bot. Remove it after the demo. | `environment-variables.md:315` |
| 3. Judge's own group | `TELEGRAM_GUEST_MODE=true` and `TELEGRAM_GROUP_ALLOWED_USERS=*` in `.env` | In any group other than the family group the bot answers only when @mentioned, every turn. | `telegram.md:1314-1340`, `:1297-1299` |

Two warnings:

- **Memory is one store per Hermes profile, not per chat** (`memory.md:82`). A judge's country and city land in the same memory as the family's. `SOUL.md` tells the model to label facts by chat and never mix them, which is a rule, not a wall. The clean way is a second bot on a second profile: `hermes profile create judges --clone`, give it its own bot token, empty its `memories/` folder, and start it with `hermes -p judges gateway run` (`cli-commands.md:2050`, `telegram.md:739`).
- Option 3 depends on how guest mode and sender authorization combine, which the docs do not spell out (`CHECKS.md`, U5). Test it with an account that is not in `TELEGRAM_ALLOWED_USERS`.
- By default every allowed user can run every slash command, `/sethome` and `/new` included (`telegram.md:1346`). Before judges get access, add the admin list described in `CHECKS.md`, U10. It is not in the config snippet yet.

## Keep the laptop awake

These are operating system commands, not Hermes features.

- macOS: `caffeinate -is hermes gateway run`, with the charger connected and the lid open. Closing the lid still puts a MacBook to sleep.
- Linux: `systemd-inhibit --what=sleep:idle:handle-lid-switch --why="Kaveri bot" hermes gateway run`

When the laptop was asleep or offline:

- Telegram holds incoming messages for up to 24 hours and the bot works through them at the next start (`telegram.md:108-112`).
- A one-time reminder that was missed by more than 120 seconds is dropped unless it was created with `catch_up` (`cron.md:1187-1193`). The `deadline-keeper` skill sets `catch_up`.
- If the venue Wi-Fi drops, switch the laptop to a phone hotspot. Long polling needs no public address.

To survive a crash, install the service instead of running in the foreground: `hermes gateway install`, then `hermes gateway start`, `hermes gateway status` (`messaging/index.md:657-660`, `:723-726`). Never do both: a second process on the same token causes `Telegram polling conflict` (`telegram.md:1563`).

## Logs

| What | Command | Doc |
|---|---|---|
| Gateway: connections, incoming messages, authorization | `hermes logs gateway -f` | `cli-commands.md:1257`, `:1270` |
| Agent: model calls, tool calls | `hermes logs -f` | `cli-commands.md:1255` |
| Warnings and errors, last 30 minutes | `hermes logs errors --since 30m` | `cli-commands.md:1256`, `:1273` |
| MCP servers that did not connect | `grep "MCP: registered" ~/.hermes/logs/agent.log \| tail -1` | `mcp.md:889-894` |
| Scheduled jobs | `hermes cron list`, `hermes cron runs`, `hermes cron status` | `cron.md:293-302`, `:494` |
| Overall state | `hermes status`, `hermes gateway status` | `cli-commands.md:767`, `:325` |

Log files live in `~/.hermes/logs/` (`cli-commands.md:1249`). In foreground mode the gateway also prints to its terminal.

## After you change something

| You changed | Do this |
|---|---|
| `SOUL.md` in the repo | `bash hermes/install.sh`, then `/new --yes` in each chat (`use-soul-with-hermes.md:226`) |
| A `SKILL.md` | `/new --yes` in each chat. Skills in `auto_load` are fixed when a session starts (`configuration.md:905`). |
| `config.yaml` or `.env` | Restart the gateway, then `/new --yes` (`messaging/index.md:380`) |
| The web app's MCP tools | `/reload-mcp` in the chat, or restart (`mcp-config-reference.md:294-300`) |

## The six most likely failures

**1. The bot is silent in the group, or answers only you.**
Check in this order (`telegram.md:796-819`):
- Privacy mode still on, or the bot was not removed and re-added after turning it off.
- `Unauthorized user` in `hermes logs gateway`: the sender is not covered. Part 2 (`group_allowed_chats`) fixes it for every member.
- The chat ID in Part 2 is wrong. Telegram gives a group a new ID when it is upgraded to a supergroup (the new one starts with `-100`). Send `/sethome` again, then update all three places.
- Part 2 was applied with the placeholder still in it.

**2. The bot answers but never calls `research_case`.**
Run `hermes mcp test casefile`. `401`: `CASEFILE_SECRET` differs from Vercel. Variable named in the error: missing from `.env`. Connects but lists no `research_case`: the deployed app is older than the contract, redeploy. Tools listed but the model does not call them: check the names (step 10, item 2) and send `/new --yes`.

**3. The plan is slow or the call times out.**
`research_case` takes about 6 to 12 seconds in fast mode and about 80 seconds in deep mode. The server stops a call at 300 seconds (`maxDuration` in `src/app/api/mcp/route.ts`) and Hermes waits up to `mcp_servers.casefile.timeout` (240 s). After a failure the skill falls back to the Exa tools and `case_publish`, which takes longer. If only deep mode fails, stay on fast for the demo.

**4. The bot chatters.**
- `The model returned only a silence marker...` on questions: `allow_silence` is not in effect. Check the chat ID under `platforms.telegram.channel_overrides`, restart, `/new --yes`. If your release does not support it, use Mode B.
- `Memory updated` lines: `display.memory_notifications` is not the quoted string `"off"`.
- "Queued" or "interrupting" notices while it works: `display.busy_ack_enabled` is not `false`.
- "Gateway restarted" lines: `gateway_restart_notification` is not `false` under `platforms.telegram`.
- Model text next to `[SILENT]`: the reply must be the token alone (`messaging/index.md:145`). Tighten the wording in `SOUL.md` or choose a stronger model.

**5. A change does not take effect.**
Almost always one of: the gateway was not restarted, `/new --yes` was not sent, or `config.yaml` no longer parses and Hermes is serving the last good copy (`configuration.md:253`). Run `hermes config check` and `hermes doctor`.

**6. A letter cannot be read.**
- PDF: the bot has no file tools, so it asks for a photo. This is deliberate. Reading PDFs needs the `file` toolset (`document-extraction.md:9-19`), which also gives the bot read and write access to the laptop. Do not enable it on a bot that judges can reach.
- Photo text unreadable: send a sharper photo, one page per photo. If the model still calls figures unreadable, set `vision.embed_target_bytes: 1048576` in `config.yaml` (`vision.md:232-243`), restart, `/new --yes`.
- The model cannot see images at all: pick a vision-capable model in `hermes model` (`vision.md:197-206`).

## Known limits

- **"forget everything"** removes the household entries from memory and the reminder jobs. It does not delete the chat transcript on the laptop (`~/.hermes/state.db`) or the published case pages. Say so if asked.
- **Approval buttons** stay live for 300 seconds. Any other message sent in the group while they are open cancels them (`configuration.md:3259`). After that, reply to the bot's message with `draft the notice`.
- **Voice notes** without a caption cannot be judged by the silence rule and are transcribed only if speech-to-text is set up (`telegram.md:515-521`, `:735`).
- **No acknowledgement line?** It is the text the model writes next to its first tool call (`configuration.md:2540`). Some models call the tool without writing text. The typing indicator is then the only sign of life. Try another model.
