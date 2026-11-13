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
