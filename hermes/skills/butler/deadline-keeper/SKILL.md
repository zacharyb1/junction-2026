---
name: deadline-keeper
description: "Case deadlines: reminders and the daily source re-check"
version: 1.0.0
author: AIDaddy team
license: MIT
metadata:
  hermes:
    tags: [butler, reminders, cron]
    related_skills: [life-event-butler, letter-decoder]
---

# Deadline Keeper

## When to Use

The family approves "Set reminders"; you run as a scheduled job (a reminder or the daily change watch); a step is done or a case is finished.

## Set reminders

1. Call `mcp__casefile__case_get` with the case `id`. Proceed only when it returns that case as JSON. A missing case or failed call: say the case is unavailable and no reminders were set, then stop. Use only steps whose `due` is a calendar date (YYYY-MM-DD). Never invent a date. If the family supplies a date, store it with `case_update`, then read the case again and verify that the step has that date. A failed update ends this attempt; do not schedule from conversation history.
2. List existing jobs and skip a reminder already scheduled for the same case, step, date and chat. For each remaining dated step call `cronjob_manage` with:
   - `action`: `create`
   - `schedule`: ISO timestamp, 09:00 two days before the due date (tomorrow 09:00 if that has passed)
   - `name`: "Reminder: <case id>: <step title>"
   - `catch_up`: true, so a laptop that slept delivers it late instead of dropping it
   - `prompt`: self-contained, because the job runs in a fresh session: "Reply with exactly this text: A reminder from the office of AIDaddy: <first name>, <step title> is due on <date>. Case: <url>", written in the household's language
   - no `deliver`, so it posts to this chat
2b. After the reminders are created, log it on the case: `mcp__casefile__case_update` with `patch.log`: `[{"kind": "read", "trigger": "deadline", "summary": "Reminder set for <step title> on <date>"}]`.
3. Address the step `owner` by first name. No owner: address whoever approved.
4. Count only successful `create` results with job IDs. Confirm how many were created, already existed, failed, or lacked a date; state the first reminder time only when a reminder exists.

## Reminder job

Reply with the text from the job prompt and nothing else.

## Daily change watch job

1. Read the exact Telegram chat ID from the job prompt. It must match the job's explicit `telegram:<chat_id>` delivery target. Missing or conflicting IDs: reply exactly `[SILENT]` without calling case tools.
2. Select only "Open case <id>" memory entries labelled with that exact chat ID. Skip entries belonging to other chats or whose owner is missing or ambiguous; profile memory is shared across chats. Call `mcp__casefile__case_recheck` only for the selected IDs.
3. No matching cases, or every `changed` list empty: reply exactly `[SILENT]`.
4. Otherwise, one line per changed case in this chat: "AIDaddy reports a change: a source for <case title> changed (citations <numbers>). Re-check before acting: <url>". Do not guess what changed.
5. A failed call means unknown, not changed: stay `[SILENT]` for that case. The same goes for the `unreachable` list in the result: a page that did not open today says nothing about the rule.

## Step done, case finished

- Step done: call `mcp__casefile__case_update` with `patch.steps` holding the step's exact `title` and `status: "done"`. Fields you leave out keep their stored value.
- Case finished: remove its "Open case" entry from memory and its reminders (`cronjob_manage` `list`, then `remove`).

## Pitfalls

- `clarify` does not exist inside scheduled jobs: state, never ask.
- A case tool that fails (for example "No case with id") is reported in one line. Never confirm an update that did not happen.
