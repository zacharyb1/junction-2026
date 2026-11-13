# Research: what the best personal agents do, and what we take

Researched Fri 13 Nov 2026. Sources at the bottom. Items marked (unverified) came from third-party write-ups only.

## 1. Feature inventory by product

### Grok Bot (xAI's persistent agent product)
- Personal memory shared across all chats, plus "Import Memory" from another assistant.
- Routines: recurring schedules, one-off "Once" reminders, pause and resume, webhook-triggered routines, routines that read the bot's inbox.
- Background work that follows up by itself when it finishes.
- Approval cards, auto-review rules, an "Ask first" rule and custom rules, a Permissions settings page.
- Pages: reports and dashboards the bot keeps up to date and co-edits with you.
- Voice calls that remember earlier calls, voice memo transcripts.
- Connectors: Gmail (drafts, sends, attachments), Google and Outlook Calendar, Drive and OneDrive, GitHub, Slack, CRM.
- Team Bots in group chats and Slack threads, with approvals handled in the thread.
- Skill templates such as "Order Concierge", "Deal Watcher", "Find unused subscriptions".
- Shopping: product cards, order tracking, "Buy now" behind an approval.
- Vault for logins and cards, each use approved.
- Cloud computer with a built-in browser, secure forms, save as PDF.
- Sub-agents and background cloud agents.

### Grok inside Telegram (official bot)
- @mention in group chats for summaries and factual answers, direct messages for questions, live web information. (unverified beyond that)

### ChatGPT
- Pulse (daily proactive briefing) was retired in mid-2026 and folded into Scheduled Tasks.
- Scheduled Tasks: run a prompt later or on a schedule, a hub page to edit them, and a monitoring type that checks sources and notifies only when something changed.
- Connectors to calendar and mail feed those tasks.

### Poke (Interaction Company)
- No app: lives in iMessage, SMS, WhatsApp and Telegram. Sign up with a phone number.
- Texts you first: daily planning, email alerts, reminders.
- Picks the best model per task.

### OpenClaw
- Heartbeat: wakes about every 30 minutes, reads a HEARTBEAT.md file, decides whether anything needs doing, stays quiet otherwise.
- Cron for fixed schedules, heartbeat for judgment calls.
- Skills registry, memory as plain Markdown files, many messaging channels, browser control.

### Hermes Agent (our runtime, verified from its source and docs)
- Telegram and WhatsApp gateways. Group chats with privacy mode off or the bot as admin.
- Can observe every group message and answer only when needed. The model returns `[SILENT]` to say nothing.
- Wake words by regex (`telegram.mention_patterns`), per-chat free response, guest mode.
- Web search and page extraction with Exa as the backend (`EXA_API_KEY`, `web.backend: exa`).
- MCP client for remote HTTP servers with headers. This is how we attach Exa's advanced tools and our own tools.
- Skills as `SKILL.md` folders, loadable from an external directory, so the repo can hold them.
- Cron jobs created from chat or CLI, delivered to a "home" chat. `[SILENT]` suppresses a delivery.
- `clarify` tool renders inline buttons in Telegram. This is our approval tap.
- Voice notes are transcribed automatically. Images go through a vision tool. Files are supported.
- Bounded persistent memory (MEMORY.md, USER.md), session search, sub-agent delegation, profiles.
- Toolsets can be disabled globally (`agent.disabled_toolsets`), so a public bot gets no terminal.

### Others, briefly
- Perplexity: citation-first answers, every sentence traceable.
- Manus: long multi-step research that ends in a deliverable file.
- Lindy: trigger-based workflows across mail and calendar.
- Martin: voice-first delegation and scheduling.
- Gemini: strongest when your life is already in Google Workspace.

### Exa itself (what the judges want to see used)
- `search` types: fast, auto, deep variants. Date filters, domain include and exclude, categories.
- `contents`: full text, highlights, summaries, subpage crawling.
- `outputSchema` on search: structured JSON straight from a search, max depth 2 and 10 properties.
- `answer`: one call, answer plus citations.
- Agent API: multi-step research runs with a structured output schema and a cost budget.
- Agent Monitors (beta): keep a table of entities and fields fresh on a cadence, with a change feed.
- Hosted MCP server at `https://mcp.exa.ai/mcp`. Default tools `web_search_exa`, `web_fetch_exa`. Optional `web_search_advanced_exa` and `agent_run` via `?tools=`.

## 2. The best features, ranked for our project

Ranked by value for Exa's five criteria, each worth 20%: use of Exa, usefulness to a specific group, clarity of sources, originality, working on live queries.

| # | Feature | Seen in | Criterion it serves | In scope |
|---|---|---|---|---|
| 1 | Lives in the chat you already use, no app | Poke, Hermes | Usefulness, originality | Must |
| 2 | Speaks only when useful, silent otherwise | OpenClaw heartbeat, Hermes | Originality | Must |
| 3 | Citation-first answers, quote plus link plus date | Perplexity | Clarity of sources | Must |
| 4 | A living page per task that stays up to date | Grok Pages | Clarity, usefulness | Must |
| 5 | Approval cards before anything is sent or decided | Grok Bot, Hermes clarify | Usefulness ("final approval to the user") | Must |
| 6 | Reminders created from the task itself | Grok routines, ChatGPT tasks | Usefulness | Must |
| 7 | Structured research output, not prose | Exa outputSchema, Agent API | Use of Exa | Must |
| 8 | Voice note or photo in, task out | Grok Bot, Hermes | Usefulness, demo | Should |
| 9 | Monitoring that notifies only on change | ChatGPT monitoring tasks, Exa Monitors | Use of Exa, originality | Should |
| 10 | Household memory, who is who | Grok memory, Hermes memory | Usefulness | Should |
| 11 | Background work with a follow-up message | Grok Bot | Working implementation feel | Should |
| 12 | Drafts as files: letters, emails, checklists | Manus, Grok Bot | Usefulness | Should |
| 13 | Verified lists for choices (daycare, movers) | Exa Websets, Agent API | Use of Exa | Could |
| 14 | Calendar and mail connectors | Grok, ChatGPT | Usefulness | Could, after the hackathon |
| 15 | Shopping and payments behind approval | Grok Bot | Not needed | No |

## 3. Our own ideas on top

1. **The butler overhears.** Nobody types a command. Someone writes "I'm pregnant" or drops a photo of a letter into the family chat, and the butler starts working. Every other team will build a chat you have to ask.
2. **Case file.** Each life event becomes one case with a timeline, money, an evidence table, drafts and approvals. Telegram shows the short version, a link opens the full page.
3. **Verified quotes.** When a case is published, our server re-fetches every cited page and checks the quoted sentence is really there. Each source gets a "quote verified" mark or an honest "could not verify".
4. **Memory versus web badge.** Before searching, the model writes what it believes from memory. If the live page says something different, the case shows both. This is direct proof of "information that could not come from training data".
5. **Jurisdiction lock.** Every case pins a country and municipality. Search starts on official domains and widens only if needed. Secondary sources are labelled as such.
6. **Letter decoder.** Photo of an official letter in Finnish. The butler explains it in your language, checks the rule and the deadline on the live web, and drafts the reply.
7. **Deadline keeper.** Every deadline found in a source becomes a scheduled reminder in the same chat, addressed to the person who owns the step.
8. **Change watch.** A daily job re-checks the cited pages. If an amount or a rule changed, the chat gets one message and the case updates.
9. **The right person approves.** Steps have owners. The approval button is addressed to that person by name.
10. **Reads Finnish, answers in your language.** Official sources stay in Finnish or Swedish, quotes are shown in the original with a translation.
11. **Judge mode.** A QR code on the table opens the bot. A judge says where they live and tries their own problem. Guest mode keeps the main family chat private.
12. **Measured quality.** A fixed set of 20 real-life scenarios, scored on source found, quote verified, deadline present, right jurisdiction, time to answer. We show the scorecard in the pitch.
13. **Privacy by design.** Consent message when the bot joins, a forget command, no terminal or file tools on the public bot, allowlisted chats only.

## 4. What we deliberately skip
- Payments, shopping, password vaults, browser automation. High risk, low judging value.
- Our own agent loop. Hermes already does it, and Vlad knows it.
- Mail and calendar connectors. Nice later, not needed for the demo.

## Sources
- Grok Bot changelog: https://www.gradually.ai/en/changelogs/grok-bot/
- Grok in Telegram: https://mira.tg/blog/grok-in-telegram-what-it-means-for-users-and-why-it-matters , https://www.unifyport.ai/blog/grok-in-telegram-what-it-means-for-custom-bots/
- ChatGPT Pulse and Scheduled Tasks: https://help.openai.com/articles/12293630-chatgpt-pulse , https://pulse2.com/openai-chatgpt-launches-new-scheduled-tasks-page/ , https://venturebeat.com/ai/chatgpt-pulse-delivers-daily-personalized-research-moving-ai-from-reactive
- Poke: https://techcrunch.com/2026/04/08/poke-makes-ai-agents-as-easy-as-sending-a-text/ , https://appleinsider.com/articles/26/06/04/first-ai-agent-for-messages-business-chat-approved-by-apple
- OpenClaw: https://clawdocs.org/getting-started/introduction , https://www.mindstudio.ai/blog/what-is-openclaw-ai-agent
- Roundups: https://www.gradually.ai/en/personal-ai-agents/ , https://mastra.ai/blog/best-personal-ai-assistants-in-2026
- Hermes Agent source and docs: https://github.com/NousResearch/hermes-agent
- Exa SDK and MCP server: https://github.com/exa-labs/exa-js , https://github.com/exa-labs/exa-mcp-server
