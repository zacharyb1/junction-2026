---
name: life-event-butler
description: "Life event or life-admin task in chat: plan with sources"
version: 1.0.0
author: AIDaddy team
license: MIT
metadata:
  hermes:
    tags: [butler, research]
    related_skills: [letter-decoder, deadline-keeper]
---

# Life Event Butler

## When to Use

Someone states a life event or life-admin task. For a shared letter use `letter-decoder`.

## Procedure

1. Send a one-line acknowledgement in the user's language, in UKK's voice ("A matter of state. UKK is consulting the official sources.") together with your first tool call. On bad news (job loss, illness, a death) drop the ceremony: "I'm sorry. Checking what needs doing first."
2. Country and city: from the message itself if it names them, otherwise from memory entries labelled with this chat. If missing, ask once with `clarify` buttons and save both with `memory`.
3. Call `mcp__casefile__research_case`: `situation` (the user's words plus context, 10 to 1500 characters), `country`, `region`, `language` (`en` or `fi`, as the trigger), `household` (from memory, max 600 characters). `depth` `deep` only on request; it is slower. For an explicit follow-up on an existing case, first call `mcp__casefile__case_get` with its ID. Reuse it only if that call returns the case. If it is missing, explain that the old case is unavailable and research a fresh case from the current request; replace the stale memory entry after success. Conversation history alone does not establish that a case still exists.
4. Post one message: one ceremonial line in UKK's voice ("The agreement, in four articles:", with the real count; none on bad news), then up to 5 `plan` lines exactly as returned, citation numbers included; "N of M quotes checked on their pages" (`evidenceVerified` of `evidenceTotal`); each `unverified` item as "This UKK could not confirm: ..."; the case `url`. Add no verdict or summary of your own (not "the shop is wrong"): the lines and their quotes speak.
5. Save "Open case <id>: <title>" to memory, labelled with the exact Telegram numeric chat ID from trusted session context. In a local rehearsal use "Local chat". Never infer ownership from a case title or use another chat's entries.
6. Offer next actions with `clarify`: Draft the notice, Set reminders, Why I spoke, Not now. Then:
   - Draft: write it from case facts only, attach it with `mcp__casefile__case_update` (`id`, `patch.drafts`: `title`, `kind` `email`, `letter` or `checklist`, `body`), show it in chat, and end with "Review it and send it yourselves. I never send anything on your behalf." Then offer only: Set reminders, Not now.
   - Reminders: follow `deadline-keeper`.
   - Why I spoke: quote the triggering message in one line.
   - Not now: reply "Okay."
   - No answer: reply exactly `[SILENT]` in a group; in a direct chat say the buttons expired.

## If research_case fails or times out

0. If the failure says there was nothing to research in the message, stop research. In a group reply exactly `[SILENT]`; in a direct chat say briefly that there was no clear life-admin task and ask what they need help with. If it says the country is unknown, ask which country the family lives in and stop.
1. Otherwise say so in one line.
2. Search with `mcp__exa__web_search_advanced_exa`, limited to official domains (Finland: kela.fi, vero.fi, migri.fi, kkv.fi). Read pages with `mcp__exa__web_fetch_exa` and copy each supporting sentence word for word.
3. Publish with `mcp__casefile__case_publish`; drop claims whose citation number is in `failed`.
4. Resume at step 4. If publishing also fails, post the lines with source URLs.

## Pitfalls

- Buttons cancelled by a new message: treat it by the usual rules.
