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
