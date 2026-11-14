# Checks: where each fact was confirmed

Hermes docs: repository `main`, commit `4932eea7`, cloned 13 Nov 2026. Line references are files under `website/docs/` in that repository. "Source" means the Python code of the same commit, read but never run.

What was tested here: `config.snippet.yaml` parses in Mode A and Mode B with no duplicate keys, the nine wake patterns match 54 trigger sentences and none of 29 small-talk sentences, the skills' front matter and word counts, `install.sh` with `bash -n` and against a stub `hermes`. Since then part of it was run live: see the next section.

## Run against a live Hermes, Fri night to Sat 02:30 (Vlad's laptop, Fedora)

Hermes v0.23.1 (commit `3b421578`), installed by `hermes/setup-local.sh`. Model `nvidia/nemotron-3.5-super-vl-120b-a12b`, provider `nvidia`. Engine on localhost. "Seen" means it is in the gateway or agent log or in the session database of that run.

| Item | Result |
|---|---|
| U1 release versus docs | v0.23.1 has `allow_silence`, `pre_gateway_dispatch`, `clarify_timeout`, `channel_overrides`, `skills.auto_load`, `tools.tool_search`. No key from the snippet was refused. |
| U2 tool prefix | Double underscore, as the runbook says: `mcp__casefile__research_case` registered and called. |
| U3 `allow_silence` in a Telegram group | Works. Before Part 2: `silence marker rejected on a user turn` and a Hermes notice in the chat. After: `Suppressing intentional silence marker`, nothing sent. |
| U4 acknowledgement | Nemotron writes it when told to in `SOUL.md`. 12 of 12 rehearsal runs opened with "On it, ...". In the group one first line was a question. Not timed against the 5-second target: the first model call took 2 to 12 s. |
| U7 Exa MCP server | `hermes mcp test exa` lists `web_search_advanced_exa` and `web_fetch_exa` (and four resource and prompt helpers). Never called in a turn: `research_case` did not fail. |
| U8 `hermes config set` | Every command in `hermes/configure.sh` was accepted. `telegram.allowed_chats` is stored as a string holding a JSON list, which the adapter decodes. The group flow works with it. |
| U10 slash commands | `allow_admin_from` works: `/sethome` from a non-admin was refused with a visible line. |
| `clarify` buttons in a group | Work: country question and next-step buttons were answered by tapping. |
| Letter photo | Works with Nemotron: `Image routing: native (model supports vision)`, one photo, all fields read, two street names misspelt. |
| `pre_gateway_dispatch` | Works: the gate skipped four small-talk messages in the live group with no model call. |
| A second profile (`hermes profile create X --clone`) | Copies `.env` with the bot token. The running gateway then serves it too. `eval/bot/rehearse.py` strips the `TELEGRAM_` lines. |

Not run: U5 (guest mode), U6 (the consent note was not looked for), reminders and `cronjob_manage` (U11 `catch_up`), the daily change watch, Mode B in a live chat, PDFs (U13), `scope` (U14), a direct message from an account outside `TELEGRAM_ALLOWED_USERS`, voice.

## UNVERIFIED: test these first

| # | Item | Why it is not confirmed | What to test |
|---|---|---|---|
| U1 | Installed release versus these docs | The installer gives the latest stable release (`getting-started/installation.md:90`), which can be older than `main`. | `hermes --version`, then `hermes config check`. If a key below is rejected, `hermes update --channel main` (`getting-started/updating.md:43`). |
| U2 | MCP tool prefix | `reference/mcp-config-reference.md:302-321` says `mcp__<server>__<tool>`. `user-guide/features/mcp.md:574` still shows the older `mcp_<server>_<tool>`. | README step 10, item 2. If the names come back with single underscores: `sed -i.bak 's/mcp__casefile__/mcp_casefile_/g; s/mcp__exa__/mcp_exa_/g' hermes/SOUL.md hermes/skills/butler/*/SKILL.md`, then `bash hermes/install.sh` and `/new --yes`. |
| U3 | `allow_silence` in a Telegram group | Documented with a Matrix example (`user-guide/messaging/index.md:356-380`). The source reads it for every platform. | README step 14, test 1, with questions. If the "silence marker" notice appears, use Mode B. |
| U4 | Acknowledgement before the plan | It is the text the model writes next to its first tool call (`user-guide/configuration.md:2540`). Some models write none. | README step 10, item 3. If it is missing, try another model. |
| U5 | Guest mode for a judge's own group | `user-guide/messaging/telegram.md:1314-1340` does not say whether a sender outside the allowlists passes. The source still checks the sender, so `TELEGRAM_GROUP_ALLOWED_USERS=*` is set next to it. | @mention the bot in a second group from an account that is not in `TELEGRAM_ALLOWED_USERS`. |
| U6 | Consent note when the bot joins | The Telegram adapter has no handler for "bot was added to a group" (source). The note is posted on the first message the bot handles. | README step 13, item 1. |
| U7 | Exa MCP server | The URL, the `?tools=` parameter, the `x-api-key` header and the two tool names come from Exa, not from the Hermes docs. | `hermes mcp test exa` must list `web_search_advanced_exa` and `web_fetch_exa`. |
| U8 | `hermes config set` blocks in the README | Generated from the snippet and checked for quoting. Never run against a real CLI. Semantics from `reference/cli-commands.md:1375` and the source. | The `hermes config get` checks in step 9. If a command is refused, use Option B. |
| U9 | Bot as group admin, pinning | `user-guide/messaging/telegram.md:1624` describes pinning. It was not found in the source. | Nothing: the runbook keeps the bot a normal member. |
| U10 | Slash commands are open to everyone the bot answers | Default: every allowed user can run every slash command (`user-guide/messaging/telegram.md:1346`). **Not in the snippet yet.** Fix from `telegram.md:1348-1386`: under `platforms.telegram.extra` set `allow_admin_from` and `group_allow_admin_from` to your user ID, and `user_allowed_commands` and `group_user_allowed_commands` to `[start]`. Source: without `start` a newcomer's first `/start` is refused with a visible line. | After adding it: `/whoami` says admin for you, and `/new` from the second account is refused. |
| U11 | Keys that are new on `main` | `skills.auto_load`, `tools.tool_search`, `catch_up` on `cronjob_manage`, `platforms.telegram.channel_overrides` may be missing on an older stable release. | `hermes config check`. After "Set reminders": `hermes cron list`. |
| U12 | `session_search` | Disabled because it could surface one chat's history in another. Its scoping was not checked. | None needed while it stays disabled. |
| U13 | PDF letters | `user-guide/features/document-extraction.md:9-19`: PDFs are read by `read_file`, which belongs to the disabled `file` toolset. The skill asks for a photo. | Send a PDF: expect a request for a photo. |
| U14 | `scope` on `research_case` | The engine accepts `scope` (`official`, `open`, default `auto`). The skill does not pass it and relies on `auto`. | Ask for a restaurant for an anniversary: expect an open-web plan. |
| U15 | Wording of the evidence line | The skills say "N of M quotes checked on their pages", as `docs/CONTRACTS.md` does. The original brief said "on the live pages". | Decide which one the team wants. One line in `life-event-butler`. |
| U16 | Keep-awake commands, supergroup ID change | `caffeinate` and `systemd-inhibit` are operating system commands. The new chat ID after a supergroup upgrade is Telegram behaviour. Neither is in the Hermes docs. | Close and reopen the laptop lid once before the demo. |

## Places where the Hermes docs disagree with themselves or with the source

- MCP tool prefix: see U2.
- Duplicate YAML keys: `user-guide/messaging/telegram.md:375` says later keys override earlier ones. The source loader rejects duplicates, and Hermes then serves the last good copy (`user-guide/configuration.md:253`). The runbook forbids duplicates.
- `/cron` is listed as CLI-only in `reference/slash-commands.md:318` and shown as a chat command in `user-guide/features/cron.md:286`. The runbook uses `hermes cron` on the laptop.
- `gateway_restart_notification` and `typing_indicator` are shown under `gateway.platforms` (`user-guide/messaging/index.md:908-914`). The gateway reads both blocks and the top-level `platforms` block wins (`user-guide/configuration.md:2534`). The snippet uses the top-level block, where `/sethome` also writes.

## Facts taken from the source because the docs are silent

| Fact | Source file |
|---|---|
| The `/sethome` reply shows the chat ID | `locales/en.yaml:395` |
| `/sethome` stores the home channel under `platforms.telegram` in `config.yaml` | `gateway/config.py:388-395` |
| A rejected sender is logged as `Unauthorized user` | `gateway/run_inbound.py` |
| A one-time "No home channel is set" note before `/sethome` | `locales/en.yaml:659` |
| Chat ID keys under `channel_overrides` are compared as strings | `gateway/config.py:483-488` |
| `vision_analyze` takes `image_url`, `question` and an optional `region` | `tools/vision_tools.py:962-1001` |
| Skill descriptions are clipped at 60 characters in the skill index | `agent/skill_utils.py` |

## Config keys

| Key | Value we set | Confirmed in |
|---|---|---|
| `web.backend` | `exa` | `user-guide/features/web-search.md:412` |
| `mcp_servers.<name>.url` | MCP endpoint | `reference/mcp-config-reference.md:51` |
| `mcp_servers.<name>.headers` | auth header | `reference/mcp-config-reference.md:52` |
| `mcp_servers.<name>.timeout` | 240, 120 | `reference/mcp-config-reference.md:57` |
| `mcp_servers.<name>.supports_parallel_tool_calls` | `true` (exa) | `reference/mcp-config-reference.md:60` |
| `${VAR}` inside an MCP entry | url, headers | `reference/mcp-config-reference.md:77-90` |
| `${VAR}` in `config.yaml` | | `user-guide/configuration.md:178` |
| `skills.external_dirs` | this repo's `hermes/skills` | `user-guide/features/skills.md:406-420`, missing path skipped `:428` |
| `skills.auto_load` | the three skills | `user-guide/configuration.md:894-905` |
| `skills.write_approval` | `true` | `user-guide/features/skills.md:668`, `user-guide/configuration.md:924` |
| `agent.disabled_toolsets` | nine toolsets | `user-guide/configuration.md:1029-1051`, names `reference/toolsets-reference.md:51-81` |
| `agent.clarify_timeout` | 300 | `user-guide/configuration.md:3252-3259` |
| `agent.reasoning_effort` | `low` | `user-guide/configuration.md:1976` |
| `tools.tool_search.enabled` | `"off"` | `user-guide/features/tool-search.md:109`, `:133` |
| `group_sessions_per_user` | `false` | `user-guide/configuration.md:2792`, `user-guide/sessions.md:1052-1074` |
| `timezone` | `Europe/Helsinki` | `user-guide/configuration.md:3047`, `user-guide/features/cron.md:216` |
| `display.busy_input_mode` | `queue` | `user-guide/messaging/index.md:505` |
| `display.busy_ack_enabled` | `false` | `user-guide/messaging/index.md:506` |
| `display.memory_notifications` | `"off"` | `user-guide/features/memory.md:364-387` |
| `display.platforms.telegram.tool_progress` | `"off"` | `user-guide/configuration.md:2518-2532` |
| `display.platforms.telegram.interim_assistant_messages` | `true` | `user-guide/configuration.md:2540` |
| `display.platforms.telegram.long_running_notifications` | `false` | `user-guide/messaging/index.md:953-977` |
| `auxiliary.background_review.enabled` | `false` | `user-guide/features/memory.md:427-439` |
| `cron.wrap_response` | `false` | `user-guide/features/cron.md:734-760` |
| `platforms.telegram.channel_overrides.<chat>.allow_silence` | `true` | `user-guide/messaging/index.md:356-380` (U3) |
| `platforms.telegram.gateway_restart_notification` | `false` | `user-guide/messaging/index.md:899-914`, `:951` |
| `platforms.telegram.typing_indicator` | optional | `user-guide/messaging/index.md:924-937` |
| `telegram.allowed_chats`, `telegram.group_allowed_chats` | family chat ID | `user-guide/messaging/telegram.md:284-294`, `:1298` |
| `telegram.require_mention` | Mode B | `user-guide/messaging/telegram.md:712-722` |
| `telegram.mention_patterns` | Mode B | `user-guide/messaging/telegram.md:716`, `:839-848` |
| `telegram.observe_unmentioned_group_messages` | Mode B | `user-guide/messaging/telegram.md:280-296` |
| `telegram.reactions` | Mode B | `user-guide/messaging/telegram.md:1502-1515` |
| `telegram.unauthorized_dm_behavior` | judge mode | `user-guide/configuration.md:2838-2861`, `user-guide/security.md:516-540` |
| `vision.embed_target_bytes` | only if photos are unreadable | `user-guide/features/vision.md:232-243` |

## Environment variables

| Variable | Confirmed in |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `user-guide/messaging/telegram.md:333`, `reference/environment-variables.md:313` |
| `TELEGRAM_ALLOWED_USERS` | `user-guide/messaging/telegram.md:334`, `:1296` |
| `TELEGRAM_HOME_CHANNEL` | `user-guide/messaging/telegram.md:485`, `reference/environment-variables.md:318`, written by `/sethome` per `reference/cli-commands.md:1375` |
| `TELEGRAM_GROUP_ALLOWED_USERS` | `user-guide/messaging/telegram.md:1297-1299`, `reference/environment-variables.md:316` |
| `TELEGRAM_GUEST_MODE` | `user-guide/messaging/telegram.md:1333` (U5) |
| `TELEGRAM_ALLOW_ALL_USERS` | `reference/environment-variables.md:315` |
| `EXA_API_KEY` | `reference/environment-variables.md:158`, `user-guide/features/web-search.md:318` |
| `CASEFILE_URL`, `CASEFILE_SECRET` | ours: `docs/CONTRACTS.md` and `.env.bot`. Used through `${...}` in the snippet. |
| Secrets go in `.env` | `user-guide/configuration.md:67` |

## CLI commands

| Command | Confirmed in |
|---|---|
| install script | `getting-started/installation.md:54`, shell reload `:136`, prerequisites `:169` |
| `hermes --version` | `reference/cli-commands.md:27` |
| `hermes model` | `getting-started/quickstart.md:84` |
| `hermes chat -q "..." --oneshot` | `reference/cli-commands.md:128-130` |
| `hermes gateway setup` | `user-guide/messaging/telegram.md:320-326`, `reference/cli-commands.md:329` |
| `hermes gateway run` | `reference/cli-commands.md:319` |
| `hermes gateway install`, `start`, `status`, `restart` | `reference/cli-commands.md:322-327`, `user-guide/messaging/index.md:657-660` |
| `hermes config edit`, `get`, `set`, `unset`, `path`, `env-path`, `check` | `reference/cli-commands.md:1373-1379` |
| `hermes config set` with a list value | `user-guide/configuring-models.md:400` |
| `hermes doctor` | `reference/cli-commands.md:1001` |
| `hermes mcp test <name>` | `reference/cli-commands.md:1653`, `guides/use-mcp-with-hermes.md:90` |
| `hermes skills list` | `reference/cli-commands.md:1437` |
| `hermes skills opt-out --remove` | `reference/cli-commands.md:1443`, `user-guide/features/skills.md:59-71` |
| `hermes cron create "<schedule>" "<prompt>" --skill --name` | `user-guide/features/cron.md:73-78` |
| `hermes cron create ... --deliver telegram` | `user-guide/features/cron.md:994-998`, target `:653` |
| `hermes cron list`, `run`, `status` | `user-guide/features/cron.md:293-300`, `reference/cli-commands.md:795` |
| `hermes cron runs` | `user-guide/features/cron.md:494`, `reference/cli-commands.md:785` |
| `hermes logs [name] -f --since` | `reference/cli-commands.md:1243-1273` |
| `hermes status` | `reference/cli-commands.md:767` |
| `hermes pairing approve <platform> <code>` | `reference/cli-commands.md:1419` |
| `hermes profile create <name> --clone` | `reference/cli-commands.md:2050` |

## Chat commands and tokens

| Item | Confirmed in |
|---|---|
| `/sethome` | `user-guide/messaging/telegram.md:480`, `reference/slash-commands.md:259` |
| `/new --yes` | `reference/slash-commands.md:248` |
| `/reload-mcp` | `reference/mcp-config-reference.md:294-300`, `user-guide/messaging/index.md:267` |
| `/whoami` | `user-guide/messaging/telegram.md:1386` |
| `/start` is answered silently | `reference/slash-commands.md:247` |
| `[SILENT]` as the whole reply | `user-guide/messaging/index.md:133-157` |
| `[SILENT]` in a Telegram group | `user-guide/messaging/telegram.md:724-735` |
| `[SILENT]` in a scheduled job | `user-guide/features/cron.md:906-917` |
| BotFather `/newbot`, Group Privacy off, remove and re-add | `user-guide/messaging/telegram.md:34`, `:270`, `:273` |

## Tool names as the model sees them

| Name | Confirmed in |
|---|---|
| `mcp__casefile__research_case`, `mcp__casefile__case_update`, `mcp__casefile__case_get`, `mcp__casefile__case_recheck`, `mcp__casefile__case_publish` | prefix rule `reference/mcp-config-reference.md:302-321` (U2), tool names `src/app/api/mcp/route.ts` in this repo |
| `mcp__exa__web_search_advanced_exa`, `mcp__exa__web_fetch_exa` | same prefix rule, tool names from Exa (U7) |
| `clarify` | `reference/tools-reference.md:32-44`, timeout `user-guide/configuration.md:3252-3259` |
| `memory` | `user-guide/features/memory.md:20` |
| `cronjob_manage` | `reference/tools-reference.md:71`, `catch_up` `user-guide/features/cron.md:1187-1193` |
| `vision_analyze` | `reference/tools-reference.md:302`, `user-guide/features/vision.md:222` |

`research_case` input fields (`situation`, `country`, `region`, `language`, `household`, `document`, `depth`, `scope`) and limits were read from `src/lib/engine/research.ts`. Draft and step fields (`title`, `kind`, `body`, `owner`, `due`, `status`) were read from `src/lib/case.ts`.
