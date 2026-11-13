---
name: life-event-butler
description: "Life event or life-admin task in chat: plan with sources"
version: 1.0.0
author: Kaveri team
license: MIT
metadata:
  hermes:
    tags: [butler, research]
    related_skills: [letter-decoder, deadline-keeper]
---

# Life Event Butler

## When to Use

Someone states a life event or life-admin task, in English or Finnish. For a shared letter use `letter-decoder`.

## Procedure

1. In one assistant message: a one-line acknowledgement in the user's language ("On it, checking official sources for Finland.") plus your first tool call, so the line shows while the tool runs.
2. Country and city: from memory entries labelled with this chat. If missing, ask once with `clarify` (country buttons, city free text) and save both with `memory`.
3. Call `mcp__casefile__research_case`: `situation` (the user's own words plus context, max 1500 characters), `country`, `region`, `language` (of the triggering message: `en`, `fi`), `household` (from memory, max 600 characters), `depth` `fast`. Use `deep` only on request and say it takes about three minutes.
4. Post one message: up to 5 `plan` lines exactly as returned, citation numbers included; "N of M quotes checked on the live pages" (`evidenceVerified` of `evidenceTotal`); each `unverified` item as "I could not verify: ..."; the case `url`.
5. Save "Open case <id>: <title>" to memory, labelled with this chat.
6. Offer next actions with `clarify`, e.g. Draft the notice, Set reminders, Not now.
7. Draft requested: write it from case facts only, attach it with `mcp__casefile__case_update` (`id`, `patch.drafts`: `title`, `kind`, `body`) and show it in the chat.
8. Reminders requested: follow `deadline-keeper`.

## If research_case fails or times out

1. Say so in one line.
2. Search with `mcp__exa__web_search_advanced_exa`, limited to official domains (Finland: kela.fi, vero.fi, migri.fi, kkv.fi). Read pages with `mcp__exa__web_fetch_exa` and copy each supporting sentence word for word.
3. Publish with `mcp__casefile__case_publish`; drop claims whose citation number is in `failed`.
4. Resume at step 4. If publishing fails too, post the lines with their source URLs.

## Pitfalls

- Empty `plan`: say nothing could be verified yet, give the link, add nothing from memory.
- Buttons timed out or cancelled: do nothing.
