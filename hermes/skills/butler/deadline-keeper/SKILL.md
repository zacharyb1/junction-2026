---
name: deadline-keeper
description: "Case deadlines: reminders and the daily source re-check"
version: 1.0.0
author: Kaveri team
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

1. Call `mcp__casefile__case_get` with the case `id`. Use only steps that have a `due` date. Never invent a date.
2. For each such step call `cronjob_manage` with:
   - `action`: `create`
   - `schedule`: ISO timestamp, 09:00 two days before the due date (tomorrow 09:00 if that has passed)
   - `name`: "Reminder: <step title>"
   - `catch_up`: true, so a laptop that slept delivers it late instead of dropping it
   - `prompt`: self-contained, because the job runs in a fresh session: "Reply with exactly this text: <first name>, <step title> is due on <date>. Case: <url>", written in the family's language
   - no `deliver`, so it posts to this chat
3. Address the step `owner` by first name. No owner: address whoever approved.
4. Confirm in one line: how many reminders, the first date, which steps had no date.

## Reminder job

Reply with the text from the job prompt and nothing else.

## Daily change watch job

1. For every "Open case <id>" entry in memory call `mcp__casefile__case_recheck` with that `id`.
2. Every `changed` list empty: reply exactly `[SILENT]`.
3. Otherwise, one line per changed case: "A source for <case title> changed (citations <numbers>). Re-check before acting: <url>". Do not guess what changed.
4. A failed call means unknown, not changed: stay `[SILENT]`.

## Step done, case finished

- Step done: send the whole step from `case_get` back through `mcp__casefile__case_update` (`patch.steps`) with only `status` changed to `done`.
- Case finished: remove its "Open case" entry from memory and its reminders (`cronjob_manage` `list`, then `remove`).

## Pitfalls

- `clarify` does not exist inside scheduled jobs: state, never ask.
- Before creating reminders, `list` existing jobs to avoid duplicates.
