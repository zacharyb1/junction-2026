# Decisions log

Append-only. One line per decision: `[Fri 20:14] Decision — why — who`.
`/grill-me` writes resolved questions here.

[Fri 20:20] Hostinger (Decode the Noise) excluded, by team decision.
[Fri 20:20] Cala (Make Unicorns Real) excluded: first prize is travel, team wants cash.
[Fri 20:20] S-Pankki (Personal Economic Trainer) excluded: gift-card prize, low team interest.
[Fri 20:20] Shortlist: AfterQuery (Break the Agent) vs Valio Aimo (Trusted Trade Agents, messenger bot angle). Backups: Exa, Tieto. Decide after asking AfterQuery at their booth.
[Fri 21:21] Challenge chosen: Exa, The Internet Butler. Valio and AfterQuery dropped by the team.
[Fri 21:21] Product: family butler in a Telegram group on Hermes Agent. It overhears life events and returns a sourced plan plus a case file.
[Fri 21:21] Research runs in the web app, not in the chat model. The bot calls one MCP tool, research_case. Reason: parallel Exa calls (about 8 s per case), same flow every time, and the same engine serves the /try page for judges without Telegram.
[Fri 21:21] Exa structured search (outputSchema) is the engine's model. No second LLM key is needed for research.
[Fri 21:21] Nothing is shown unless a sentence on a fetched page supports it. Quotes are snapped to real sentences, amounts and deadlines must be on the page, the rest goes to "could not verify".
[Fri 21:21] Each cited page is read two ways in parallel: our own live request and Exa Contents. The case page says which one confirmed the quote. Reason: some government sites refuse fresh crawls.
[Fri 21:21] Official-domain lists per country with wildcards such as *.gov. Reason: Exa accepts wildcards, which covers city and state sites.
[Fri 21:21] Storage: Vercel Blob, private store junction-cases in fra1. Case ids are 16 random characters.
[Fri 21:21] Repo stays private while building. Organizers get read access before Sunday 10:00.
[Fri 22:00] Also enter four tech challenges with the same project: Gemini API, ElevenLabs, Oxylabs Web API, Gemma. Exa stays the only finder and the grounding rule does not change. Plan in docs/TECH_CHALLENGES.md — Zachary.
[Fri 22:05] Official-source map: 12 countries, about 650 hostnames that were checked to answer, plus wildcards such as *.gov. Merged with the seed list in jurisdiction.ts.
[Fri 22:05] Demo material found by the data research, to confirm with a live engine run before pitching: Finnish rent-increase rules changed on 1 Oct 2026 (Act 531/2026 on Finlex), and EU air passenger rights were amended by Regulation (EU) 2026/2202, which applies from 23 Oct 2027. Both are "memory versus web" examples.
[Fri 22:05] About 25 Finnish government hosts refuse a plain server request. Their pages can only be confirmed through Exa Contents, which the verifier already uses as its second reading.
[Fri 22:05] Dark mode is not wired (no .dark class is ever set). Light theme only for the demo.
[Fri 23:15] The Hermes track runs NVIDIA Nemotron 3.5 Super VL as the bot's model, not Gemini. Reason: Hermes has a native provider for this exact model, and the Nemotron tech challenge rewards grounded output and evaluation loops, which the verifier and scorecard already show. Milan's track keeps its own model until the bake-off. To confirm with the team — Vlad.
[Fri 23:15] Gemini stays only as the letter reader, and only if it reads the two printed Finnish letters better than Nemotron and runs as Hermes' separate image model. Without that job we do not enter the Gemini challenge — Vlad.
[Fri 23:15] Gemma gate is built as a Hermes plugin on the pre_gateway_dispatch hook with a small local Gemma. When the gate is unsure it wakes the bot. When the gate is down the bot falls back to the wake patterns, never to letting every message through. This answers the open decision in docs/TECH_CHALLENGES.md — Vlad.
[Fri 23:15] Context.dev added as a tech challenge: an extra page reader in the verifier and page monitors on cited pages. Reason: no card needed, 50,000 credits per team, and it does a job Exa does not do. Exa stays the only finder — Vlad.
[Fri 23:15] Aiven added as a tech challenge: a Postgres index of which cases cite which page, so a page change finds the affected families. Cases stay in Vercel Blob. Proposal, to confirm with Zachary — Vlad.
[Fri 23:15] Second submission planned: the same product under Context.dev's main challenge once the change watch runs on production. The platform has a "New submission" button and each submission takes one main challenge — Vlad.
[Fri 23:15] Hostinger is revisited on Sat 14:00, only if the core is green: a scam check for messages that claim to come from an authority. Ask their booth in the morning whether we get the server — Vlad.
[Fri 23:15] Hermes runs from a pinned install inside the repo folder (installer flags --dir, --hermes-home, --commit), with nothing installed globally. Reason: easy to remove, and a teammate can reproduce it from the repo — Vlad.
[Fri 23:15] Beyond the Clinic, Meta glasses and MariaDB's main challenge were considered for this product and parked: no job in Kaveri, see docs/TECH_CHALLENGES.md — Vlad.
[Fri 23:35] Review of the engine by four code reviewers and a read of 13 live cases. Fixed the same night: quotes are shown in the page's own words only; numbers match as whole numbers; a deadline or amount needs one sentence on its own page; no fact is borrowed from another page; unsourced figures are removed from titles, details and summaries.
[Fri 23:35] Two sources with different figures for one step are both shown ("Two figures found"), instead of one silently winning. Replaces the "memory versus web" card on the landing page, which nothing in the engine produced.
[Fri 23:35] A time limit that binds someone else (airline refund, landlord notice) is listed under entitlements, not as the family's deadline.
[Fri 23:35] Unknown country names return 400. Before, "France" resolved to a retired code and every search failed.
[Fri 23:35] Public demo: 20 requests per minute per address (a venue shares one), 40 in total, fast mode only. Deep research needs the bot secret.
[Fri 23:35] Change watch: a page that does not open is reported as unreachable and keeps its last confirmed state. A quote last confirmed live must still be on a live reading.
[Fri 23:35] The scaffold's /api/chat now needs the bot secret. The /chat page and src/lib/ai.ts are unused and can be deleted by a person.
[Fri 23:45] A message with nothing to research (gibberish, small talk) now gets a clear answer instead of an invented plan. Asking the search model to flag it did not work, so the engine checks that a word of the message comes back in what the search wrote or quoted.
[Fri 23:45] Each verified source links to the official page with the quoted sentence highlighted (text fragment).
[Sat 00:05] Hermes is pinned to release v0.23.1, commit 3b421578. Reason: allow_silence, pre_gateway_dispatch and clarify_timeout all exist there, so the fallback pin 4932eea7 was not needed. Installed by hermes/setup-local.sh into .hermes-local/ with a throwaway HOME for the installer, so nothing lands in ~/.local/bin or a shell profile — Vlad.
[Sat 00:10] Team secrets live in the private repo kapuchai/junction-2026-keys, never in this one. hermes/secrets.sh copies them into the git-ignored env files. Reason: this repo's history is opened to the organisers on Sunday — Vlad.
[Sat 00:21] Bot is open to all direct messages (TELEGRAM_ALLOW_ALL_USERS=true). Reason: judges and teammates must be able to try it without being added one by one. Accepted: shared memory and shared quota. Remove the line in the keys repo's bot.env to restrict it again — Vlad.
[Sat 00:25] Because the bot is open, slash commands are admin-only (the IDs in TELEGRAM_ALLOWED_USERS). Everyone else may only use /start and /new. Reason: by default any user could run /sethome or /model — Vlad's session, to confirm with Vlad.
[Sat 00:25] A reader checked seven stored cases against their cited pages. Fixed from that audit: an amount carries a step's name only when the step's own sentence states it, otherwise it is listed under the start of its own sentence; titles that differ only in spelling or spacing merge ("job seeker", "jobseeker"); a figure that is on the page but in another sentence is no longer reported as "not stated"; number words count as figures ("two months' notice"); a place at the end of a title is dropped, because it was wrong for a move to another town.
[Sat 00:25] A step whose verified sentence states a money figure, or one qualified period ("within 30 days", "two months in advance"), shows it in the sentence's own words even when the search left the field empty.
[Sat 00:25] Differing figures across steps are pointed out only when the steps' titles are about the same thing, when both are percentages, or when the two sentences share a word no other quote in the case has. A looser rule gave false alarms.
[Sat 00:25] Commit messages carry no model name from here on, as CLAUDE.md asks. Earlier commits have a co-author trailer that names one.
[Sat 00:25] The case page turns a deadline phrase into a date in the browser, only when the phrase is one clear period before or after a day the family gives. Ranges, rates, estimates and an earliest day ("at least 14 days after") get no date. Working days skip weekends, not public holidays, and the page says so. Nothing is stored in the case.
[Sat 00:30] Gate order: rules, then wake patterns as sure triggers, then the local Gemma for the rest. Reason: on the 60 labelled messages gemma3:1b alone missed 3 of 20 triggers, "I'm pregnant" among them, and patterns alone missed 3 others. Together they missed none, with 4 false wakes of 40. Would change it: a larger local model that beats the patterns alone on a set someone else wrote — Vlad's session, to confirm with Vlad.
[Sat 00:30] A photo or file in the group always wakes the bot. Reason: the gate model reads text only and a letter is the product's second trigger. Cost: family photos reach the cloud model, which weakens the privacy claim for images. To confirm with the team — Vlad's session.
[Sat 01:05] In a direct chat the bot always answers and never replies [SILENT]. Reason: Nemotron answered [SILENT] to "hey there" in a DM and Hermes replaced it with its own notice, which reads as broken to a first-time judge — Vlad's session.

[Sat 02:39] Preserve and migrate .data/cases before deleting or changing a local engine directory. Reason: the 02:29 switch deleted prior test cases; a reused plan and a scheduled reminder now carry broken links. This is an operational correction, not a change to the engine storage contract — Vlad's continuation session.
