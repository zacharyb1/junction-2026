---
name: birthday-planner
description: "Birthdays of the people closest to the household: choose them, remember the dates, plan each one ahead"
version: 1.0.0
author: UKK team
---

# Birthday planner

Issue #23. The household chooses whose birthdays matter (parents, grandparents, children, partners, siblings). UKK remembers them, reminds two weeks ahead, and comes with a plan: gift and celebration ideas from real, current sources. Reading and drafting run unattended; anything that books, orders or pays waits for the family's click, and UKK never does it himself.

## When

- Someone asks to plan or remember birthdays ("UKK, remember our birthdays", "Mum turns 60 in March", "syntymäpäivät").
- A birthday reminder job fires (see "Reminder job").
- "Which birthdays are coming up?": list the saved ones, soonest first, with the days left.

## Choose the people

1. Acknowledge in one line, in UKK's voice: "A matter of the family's calendar. Let us set it up."
2. Ask with `clarify`, letting them pick several: Mother, Father, Grandparents, Children, Partner, Siblings, Someone else. On the web page there are no buttons: ask the same in one plain sentence.
3. For the chosen relations, ask in ONE message for each person's first name and birthday (day and month; the year only if they want the age mentioned). Example: "Mum Liisa 3 March, Grandpa Pekka 12 December".
4. Confirm the list back in one short message, sorted by the next date. Wrong date? Correct it, then confirm again.

## Remember and schedule (Telegram only: the web page has no memory and no reminders)

5. Save one memory entry per person, labelled with the exact Telegram numeric chat ID from trusted session context: "Birthday <chat id>: <relation> <first name>, <day> <month>[, born <year>]". Never mix chats.
6. List existing jobs and skip a person who already has a "Birthday: <first name>" job for this chat. For each remaining person call `cronjob_manage` with:
   - `action`: `create`
   - `name`: "Birthday: <first name> (<relation>)"
   - `schedule`: a yearly cron expression 14 days before the birthday at 09:00, e.g. birthday 3 March → `0 9 17 2 *`
   - `prompt`: self-contained, since the job runs in a fresh session: "Birthday reminder for chat <chat id>: <relation> <first name>'s birthday is on <day> <month>[, turning <age>]. Follow the birthday-planner skill, Reminder job."
   - no `deliver`, so it posts to this chat
7. Confirm in one line how many reminders were set and when the first one fires. Count only successful creates.

## Reminder job

8. One line: "A reminder from the office of UKK: <first name>'s birthday is on <day> <month>, in two weeks."
9. Research with `mcp__casefile__research_case`: `situation` "Birthday of <relation> <first name> on <date>[, turning <age>], in <city>. Ideas for a gift and a place or way to celebrate, available now." with `country`, `region` (city from memory) and `language`. This uses the Engine's occasion research: real, currently available options with quotes from the provider's own pages.
10. Post up to 4 options as the tool returned them, citation numbers included, and the case link. Add nothing the tool did not return.
11. Work ahead, unasked: draft a short invitation or greeting for the family to send, attach it with `mcp__casefile__case_update` (`patch.drafts`, kind `email` or `letter`), and log it: `patch.log`: `[{"kind": "draft", "trigger": "schedule", "summary": "Birthday plan for <first name>: options researched, invitation drafted"}]`.
12. Offer next steps with `clarify`: Draft the invitation differently, Remind me again in a week, Not now. Booking a table, ordering a gift or paying is never yours to do: say it waits for their click on the case page and they do it themselves.

## Rules

- Birthdays and names are household basics: store nothing else about these people (no health, no addresses).
- "Forget everything" also removes every birthday entry and every "Birthday:" job for this chat.
- No ceremony on a sad date: if a message says the person has died, offer to remove the reminder and stop.
