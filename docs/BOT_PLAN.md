# How the bot becomes cutting edge

Written Saturday 14 November, 09:05 Helsinki, at Zachary's request. Freeze is 20:00 today.

This is a proposal for the team. The Bot runtime (Hermes on Telegram) belongs to whoever operates it today, see [NEXT.md](NEXT.md). Nothing here changes the Engine's grounding rules, and nothing here builds a second bot inside the web app.

## 1. What "cutting edge" means for us

The strongest personal agents of 2026 share one list of features (see [RESEARCH.md](RESEARCH.md)): they live in a chat, cite sources, keep a page per task, ask before acting, remind, watch for changes, remember the household, and take voice and photos.

Two things none of them do:

- **They are built for one person who asks.** None is built for a group where most messages are not for the assistant.
- **They cite, but they do not check their own citations.** A link next to a sentence does not show the sentence is on the page.

So our edge is three claims, and each one has a number today:

| Claim | Number today | Where it comes from |
|---|---|---|
| It knows when to stay silent | 0 of 20 life events missed, 4 of 40 small-talk messages woke it | `eval/results/gate-gemma3-1b.json` (a development set, not a blind test) |
| It cannot quote what is not on the page | 98 of 98 quotes found, latest run | `src/data/scorecard.json` |
| It says no when there is nothing to research | 6 of 6 refused | same |

"Cutting edge" for the demo means: **a judge sees all three happen in the real group chat, on their own question.**

## 2. Where the bot stands now

- **Engine: live.** Production runs the current commit, research works there, and `/api/health` now reports `search`, `store` and `voice`.
- **Bot: offline since 05:48.** Vlad removed his local install after the merge. Its memory, test Cases and the saved reminder went with it.
- **Never run on a Mac.** Tested on Fedora, and in containers on Linux in CI.
- **Its Case links pointed at localhost.** It was never connected to the production Engine.
- **First reply took 3 to 12 seconds** in recorded runs. The target is 5.

## 3. Today, in order

### Step 0: bring it back on the public Engine (must, by 13:00)

1. **Pick the operator.** One machine and one Telegram token at a time ([DEPLOYMENT.md](DEPLOYMENT.md#hermes-and-telegram)).
2. **Fresh install** with the [container guide](CONTAINERS.md) or the [runbook](../hermes/README.md), using a separate development token first.
3. **Point it at production:** `CASEFILE_URL=https://junction-2026.vercel.app/api/mcp` and the same `CASEFILE_SECRET` as Vercel.
4. **One plan in a direct message.** Open the Case link on a phone that is not on the operator's Wi-Fi.
5. **Then the shared token and the real family group.** Rename the bot to AIDaddy in BotFather.

Done when a teammate's phone opens a Case link that the bot posted in the group.

### Step 1: three upgrades a judge can see (each 90 minutes or less, each can be dropped)

| | Upgrade | What the judge sees | What it needs |
|---|---|---|---|
| A | **"Why I spoke"** | Every reply nobody asked for starts with one line, for example "I'm stepping in because this looks like a pregnancy, and it starts deadlines." Two buttons: "Go on" and "Not now". | A change to the butler skill's instructions only. About 30 minutes with a rehearsal. |
| B | **Change alert** | Someone writes "AIDaddy, check our sources again". The bot answers "All 11 sentences are still on their pages", or names the one that changed. | The Engine has it: tool `case_recheck`, and a nightly job on Vercel. The bot needs one instruction, and a daily job that speaks only when `changed` or `unreachable` is not empty. |
| C | **Voice** | A voice note goes in, and the plan comes back as a voice message. | The Engine has it: `GET /api/cases/:id/audio` returns an MP3 of the stored plan. Needs `ELEVENLABS_API_KEY` on Vercel (Zachary) and one instruction for the bot to send the file. Voice in depends on Hermes' transcription, which is untested. |

Order: A, then B, then C. A answers the first question every judge asks about a bot that reads a family chat.

### Step 2: only when Step 1 is rehearsed

- **D. First reply within 5 seconds.** Send "On it. Checking official sites." before the research call, then edit that message as stages finish. The Engine's REST endpoint streams its stages ([CONTRACTS.md](CONTRACTS.md)). Check whether Hermes can show them before promising it.
- **E. A reminder that arrives.** One has been scheduled but never seen to arrive. Send one to the group before showing it.
- **F. Steps with an owner.** "Anna: book the clinic", with the approval addressed to that person.

## 4. What we say is next (for the pitch, not built)

- **Calendar and mail,** behind the same approval.
- **Exa monitors on cited pages,** so a rule change reaches the family the day it happens.
- **More countries.** Official site lists exist for 12 countries. Finland is the one we tested in depth.
- **A blind test set for the gate,** written by people who have not seen the bot.

## 5. What not to do today

- **Do not let it act.** It never sends, files, books or pays.
- **Do not weaken grounding** to make a scenario pass.
- **Do not start a second gateway** on the same token, on any machine.
- **Do not claim** that all small talk stays on the family's machine (photos, and messages in the three minutes after a wake, reach the cloud model), that this is legal advice, or that it runs on a Mac before someone has run it.

## 6. Who can do what

| Work | Who |
|---|---|
| Engine endpoints, tests, the website, the scorecard, these documents | A Claude Code cloud session, or anyone |
| Everything in Step 0, Telegram rehearsals, the BotFather rename, the Vercel key for voice | A person with a laptop and the tokens |
| Upgrades A to C | The operator, with Claude Code on that laptop: they are changes to `hermes/skills/butler/` plus a rehearsal in the real group |
