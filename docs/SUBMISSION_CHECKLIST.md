# Submission checklist (deadline Sun 15.11 10:00, form closes automatically)

Set the project to **FINAL** (not DRAFT). Drafts are not reviewed.

Review [the event rules](PLAYBOOK.md#rules-that-disqualify) before submission: product code must be written during the event, the project must not be tied to an existing company of ours, and the team has 1–4 members.

## Required fields
- [ ] Project name
- [ ] Punchline (one sentence, ≤ 15 words, says what it does and for whom)
- [ ] Description (problem → solution → how it works → what is real in the demo → what is next)
- [ ] Challenge(s) selected (you may submit to multiple challenges)
- [ ] Technologies used
- [ ] **Video pitch ≤ 2:00** uploaded (YouTube/Vimeo, viewable by everyone, not private). Check length to the second.
- [ ] Demo link (<https://86.38.238.136.sslip.io>, works from a fresh browser with no login)
- [ ] Source code link (GitHub repo, MIT license file present). The repo is private while we build: make it public, or add the organizers as collaborators, before setting the submission to FINAL.
- [ ] Source code publicity answered
- [ ] "Do you want to be credited?" answered
- [ ] Pitch deck (PDF): [pitch/aidaddy-pitch-deck.pdf](pitch/aidaddy-pitch-deck.pdf). Name, punchline, description and technologies to paste: [SUBMISSION_TEXT.md](SUBMISSION_TEXT.md)
- [ ] Phone numbers of all team members
- [ ] Discord usernames

## Demo hygiene
- [ ] Deployed URL opens in < 3 s, no console errors on the demo path
- [ ] Seed/demo data present so the first screen is not empty
- [ ] API keys set in the production server's private runtime configuration, not in the repo
- [ ] After #72/#77 deploy, current recorded links pass `node scripts/check-recorded-cases.mjs --origin https://86.38.238.136.sslip.io`; check the rendered homepage sample link separately if an environment setting overrides it
- [ ] Use the refreshed replay's 10.3 seconds and 9/9 quotes; keep the separate scorecard's 19/19 scenarios, 98/98 quotes and 6/6 refusals distinct
- [ ] Run the text-and-sources demo without the removed homepage narration; claim live voice only after the production playback/transcription checks in #75/#76 pass
- [ ] Works on the venue Wi‑Fi and on a phone hotspot (fallback)
- [ ] A recorded backup video of the live demo path exists (in case Wi‑Fi dies at the table)
- [ ] README: what it is, screenshot, how to run, team

## Peer review table
- [ ] Laptop charged + charger
- [ ] 3‑minute pitch rehearsed 3× with a timer
- [ ] One person pitches, one drives the demo
- [ ] Each member reviews their assigned projects on the platform (mandatory)

## Tech challenges (see `docs/TECH_CHALLENGES.md`)
- [ ] **Go through [CHALLENGES_TO_SELECT.md](CHALLENGES_TO_SELECT.md)**: which challenges to tick on the platform, with a note to paste for each
- [ ] Verda: post the link to [VERDA.md](VERDA.md) in Verda's Discord channel (their brief requires it)
- [ ] Reconcile platform selections with [the current challenge matrix](TECH_CHALLENGES.md); keep only technologies demonstrated by the chosen bot track and final demo
- [ ] Nemotron: include the required text explanation of its actual role and evaluation in the submission form
- [ ] One short note per challenge: which endpoints or models, what they do in the demo, why; refresh pitch/voiceover measurements from the chosen build
- [ ] Oxylabs: the demo makes a live Web API call and shows the source URLs
- [ ] Any add-on that was cut is unselected before FINAL
