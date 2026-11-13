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
[Fri 22:05] Official-source map: 12 countries, about 650 hostnames that were checked to answer, plus wildcards such as *.gov. Merged with the seed list in jurisdiction.ts.
[Fri 22:05] Demo material found by the data research, to confirm with a live engine run before pitching: Finnish rent-increase rules changed on 1 Oct 2026 (Act 531/2026 on Finlex), and EU air passenger rights were amended by Regulation (EU) 2026/2202, which applies from 23 Oct 2027. Both are "memory versus web" examples.
[Fri 22:05] About 25 Finnish government hosts refuse a plain server request. Their pages can only be confirmed through Exa Contents, which the verifier already uses as its second reading.
[Fri 22:05] Dark mode is not wired (no .dark class is ever set). Light theme only for the demo.
[Fri 23:35] Review of the engine by four code reviewers and a read of 13 live cases. Fixed the same night: quotes are shown in the page's own words only; numbers match as whole numbers; a deadline or amount needs one sentence on its own page; no fact is borrowed from another page; unsourced figures are removed from titles, details and summaries.
[Fri 23:35] Two sources with different figures for one step are both shown ("Two figures found"), instead of one silently winning. Replaces the "memory versus web" card on the landing page, which nothing in the engine produced.
[Fri 23:35] A time limit that binds someone else (airline refund, landlord notice) is listed under entitlements, not as the family's deadline.
[Fri 23:35] Unknown country names return 400. Before, "France" resolved to a retired code and every search failed.
[Fri 23:35] Public demo: 20 requests per minute per address (a venue shares one), 40 in total, fast mode only. Deep research needs the bot secret.
[Fri 23:35] Change watch: a page that does not open is reported as unreachable and keeps its last confirmed state. A quote last confirmed live must still be on a live reading.
[Fri 23:35] The scaffold's /api/chat now needs the bot secret. The /chat page and src/lib/ai.ts are unused and can be deleted by a person.
[Fri 23:45] A message with nothing to research (gibberish, small talk) now gets a clear answer instead of an invented plan. Asking the search model to flag it did not work, so the engine checks that a word of the message comes back in what the search wrote or quoted.
[Fri 23:45] Each verified source links to the official page with the quoted sentence highlighted (text fragment).
[Sat 00:25] A reader checked seven stored cases against their cited pages. Fixed from that audit: an amount carries a step's name only when the step's own sentence states it, otherwise it is listed under the start of its own sentence; titles that differ only in spelling or spacing merge ("job seeker", "jobseeker"); a figure that is on the page but in another sentence is no longer reported as "not stated"; number words count as figures ("two months' notice"); a place at the end of a title is dropped, because it was wrong for a move to another town.
[Sat 00:25] A step whose verified sentence states a money figure, or one qualified period ("within 30 days", "two months in advance"), shows it in the sentence's own words even when the search left the field empty.
[Sat 00:25] Differing figures across steps are pointed out only when the steps' titles are about the same thing, when both are percentages, or when the two sentences share a word no other quote in the case has. A looser rule gave false alarms.
[Sat 00:25] Commit messages carry no model name from here on, as CLAUDE.md asks. Earlier commits have a co-author trailer that names one.
[Sat 00:25] The case page turns a deadline phrase into a date in the browser, only when the phrase is one clear period before or after a day the family gives. Ranges, rates, estimates and an earliest day ("at least 14 days after") get no date. Working days skip weekends, not public holidays, and the page says so. Nothing is stored in the case.
