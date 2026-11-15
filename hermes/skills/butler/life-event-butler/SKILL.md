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

1. Follow SOUL's work-notice rule: the Telegram runtime announces research; elsewhere acknowledge briefly with the first tool call.
2. Read country, city, household and relevant dates from the current message, recent same-chat/topic context, then memory entries labelled with this chat. Use facts already supplied without asking again. For a move include both origin and destination. Ask one `clarify` question only for a missing or conflicting fact required for research; save confirmed household basics with this chat's label.
3. Call `mcp__casefile__research_case`: `situation` (the user's words plus context, 10 to 1500 characters), `country`, `region`, `language` (`en` or `fi`, as the trigger), `household` (from memory, max 600 characters). `depth` `deep` only on request; it is slower. For an explicit follow-up on an existing case, first call `mcp__casefile__case_get` with its ID. Reuse it only if that call returns the case. If it is missing, explain that the old case is unavailable and research a fresh case from the current request; replace the stale memory entry after success. Conversation history alone does not establish that a case still exists.
4. Check the submission route before preparing a notice, application or claim. Use the case evidence or a fetched official page, not the step title alone:
   - Evidence supporting written correspondence: prepare the useful letter or email from case facts, and attach it with `mcp__casefile__case_update` (`patch.drafts`, explicit `kind: letter` or `email`). Pass `patch` as a JSON object, for example `{"drafts":[{"title":"Notice","kind":"letter","body":"..."}]}`.
   - A required official form or online service: give its verified link and instructions. Optional known fields can be attached as explicit `kind: checklist`, titled "Preparation notes" and described as notes for completing the official process. They are not a filing document and have no send proposal.
   - An unconfirmed route: report that gap and continue without a filing draft. A deadline or a step named "submit a notification" does not establish that a letter is accepted.
   This check is complete when the route is classified and any claimed draft is confirmed saved, or a preparation failure is reported. Preparing changes nothing outside the case and needs no approval. Sending remains the family's action. Continue to 4b even when there is no draft.
4b. Put the completed result in your assistant text alongside the memory tool call in step 5 (or alongside `clarify` if memory is unavailable). The runtime emits accompanying text before executing tools and attempts to flush it before showing clarification buttons; text saved for the final reply arrives too late for the question. Write "Your plan is ready" in the user's language, then up to 5 `plan` lines exactly as returned, citation numbers included; "N of M quotes checked on their pages" (`evidenceVerified` of `evidenceTotal`); each `unverified` item as "AIDaddy could not confirm this: ..."; the case `url`. Include the verified submission route or route gap from step 4. For a saved letter/email, add "I drafted <title>. Sending waits for your click on the case page." For a checklist, say "Preparation notes are ready for completing the official process." If preparation failed, say so. Add no verdict of your own (not "the shop is wrong"): the plan lines and their quotes speak. This message completes research and any stated preparation, not sending, filing, booking or payment. Only after emitting this text may step 6 ask what to do next.
5. Save "Open case <id>: <title>" to memory, labelled with the exact Telegram numeric chat ID from trusted session context. In a local rehearsal use "Local chat". Never infer ownership from a case title or use another chat's entries.
6. After the plan is visible, offer next actions with `clarify`: Set reminders, Why I spoke, Not now. Include Draft the notice only if step 4 established a supported letter/email route and that notice remains undrafted. On the web page (`/chat`) leave out Set reminders: reminders cannot reach the web, so say they work in the Telegram group. Then:
   - Draft: apply step 4's submission-route check again, write the eligible letter/email from case facts only, attach it with `mcp__casefile__case_update` (`id`, `patch.drafts`: `title`, explicit `kind`, `body`), show it in chat, and end with "Review it and send it yourselves. I never send anything on your behalf." If no letter/email is eligible, explain the verified procedure or route gap instead. Then offer only: Set reminders, Not now.
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
