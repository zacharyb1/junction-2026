# Challenge status and evidence

Updated Sunday 15 November 2026, 09:40 Helsinki, against `main` at `c77cbd4`, which is what the live server runs. The first version was a Saturday snapshot of `vlad/hermes-bot` ([PR #6](https://github.com/zacharyb1/junction-2026/pull/6)); the rows below now describe the deployed product.

**Final selection:** Exa (main), Nemotron, Gemma, Verda and ElevenLabs. Not selected: Oxylabs, Context.dev, CRACI, Gemini API, Aiven, OpenAI Codex. The text to paste is in [SUBMISSION_TEXT.md](SUBMISSION_TEXT.md).

**For the submission form, use [SUBMISSION_TEXT.md](SUBMISSION_TEXT.md)** and [CHALLENGES_TO_SELECT.md](CHALLENGES_TO_SELECT.md): together they cover every main and tech challenge on the platform, say which to select, and have a note to paste for each.

**Exa remains the main challenge.** Tech challenges support the same product only when their technology has a demonstrated role. The [decision log](DECISIONS.md) records the choices and proposals; the [Friday plan](research/tech-challenges-2026-11-13.md) preserves the original research, prizes and rationale. This status update reconciles that plan with the implementation; it does not settle the team's outstanding choices.

## What we are pursuing

| Challenge | Role and current evidence | Current limit or dependency |
|---|---|---|
| **Exa — The Internet Butler** (main) | The shared Engine uses Exa Search `auto` with an output schema, Search `lite` for a first look, Exa Contents as the second page reader, and Exa Agent as a second research mode on `/try`. Scorecard (fast mode): 19/19 scenarios, 98/98 quotes, 6/6 refusals, median 5.6 s. The live site and the Telegram bot use the same Engine. | The scorecard was not re-run in agent mode; agent mode has single measured runs (32 s, 11/11 quotes). |
| **NVIDIA — Best Use of Nemotron** | Hermes uses `nvidia/nemotron-3.5-super-vl-120b-a12b` for the conversation in Telegram and on `/chat`, tool calls, drafts and native letter-photo reading. The Hermes track is the deployed bot. An emergency rule wakes it and forbids `[SILENT]`. | The brief requires the model/use/improvement text in the form; it is in SUBMISSION_TEXT.md. The seizure wording of Sun 08:51 was not rehearsed live in the bot. |
| **Gemma** | The Hermes gate on the server uses `gemma3:1b` through Ollama, after rules and wake patterns: 0 of 20 life events missed, 1 of 40 small-talk messages woke the bot (14 Nov 08:30 run). `/listen` can send missed sentences to the same model as an optional "Model check". | A development set, not a blind test. A Gemma-only trigger outside the 180-second open window remains unmeasured live. |
| **Verda** | The whole product runs on one Verda CPU instance in Finland, deployed automatically on every merge to main with a health-check rollback. | Their brief requires a Discord post linking [VERDA.md](VERDA.md). |
| **ElevenLabs** | Live on the server: text to speech for chat replies and case plans in the case's language, Scribe for voice notes, pre-rendered emergency clips in AIDaddy's voice, and an ElevenLabs agent on the `/call` browser line. Checked Sun 09:35: speak returned audio in about 1 s and listen transcribed it back. | Live replies use the standard voice "Bill" when the server's account lacks AIDaddy's designed voice. A real voice conversation on `/call` is not yet confirmed (#32); Twilio phone calls are not configured. |
| **Oxylabs Web API** (not selected) | A third page reader is implemented in the verifier and recheck. Its response handling was tested with a local stand-in; no real API call is recorded. | No key. The saved brief requires a live API call and source URLs; the implementation alone does not establish that use. |
| **Gemini API** (not selected) | No demonstrated role on the Hermes track. The earlier letter-reader fallback was not used: Nemotron read the test photo. No comparative Gemini test was run. | Another bot track may use Gemini, but this document does not establish that role. The platform selection has not been rechecked. |
| **Context.dev** (not selected) | Proposed extra verifier reader and monitors for cited pages. No implementation or live test is present on this branch. | The alert rule, chat ownership and controllable demo page are unresolved. A second submission under its main challenge remains conditional on a working production change watch. |
| **Aiven** (not selected) | Proposed Postgres index from cited pages to affected Cases; Cases would remain in Blob. No integration is present on this branch. | This is an unconfirmed proposal associated with the change watch. No database migration is currently required to run AIDaddy. |

Hostinger's scam-check idea is exploratory and is not part of the implemented demo. Beyond the Clinic, Meta glasses, MariaDB's main challenge and Cloudinary remain parked. See the original rationale in the [Friday plan](research/tech-challenges-2026-11-13.md).

## Evidence we can use

**Exa and the bot.** The [Hermes handover](HERMES_HANDOVER.md) distinguishes Telegram delivery from CLI rehearsals and records the local Case recovery. The latest hardening rehearsals returned three fresh washing-machine Cases with working page/API links and 6/6, 7/7 and 9/9 checked quotes. These are selected local runs, not production or general reliability evidence. Engine grounding changes remain separately reviewable in [PR #7](https://github.com/zacharyb1/junction-2026/pull/7). Use the scorecard for the exact version being presented, rather than quoting the older pitch numbers as current.

**Nemotron.** The live rent-letter photo covered all six field categories, with two street-name transcription errors. Text acknowledgements took 3–4 seconds in two observed group turns; the photo acknowledgement took 12 seconds and its Plan 33 seconds. The fresh DM acknowledgement took 12.4 seconds, so the five-second target is not consistently met. Missing-Case and reminder rehearsals show the instruction improvements: fetch before reusing a Case, save/read back the deadline before scheduling, and avoid duplicate jobs. See [the handover](HERMES_HANDOVER.md) and the [rehearsal records](../eval/results/).

**Gemma.** The [combined evaluation](../eval/results/gate-gemma3-1b.json) has 20 triggers and 40 small-talk messages: 0 missed triggers, 1 false wake ("treenit loppuu viideltä"), 0 gate errors (run of 14 Nov 08:30). [Patterns alone](../eval/results/gate-patterns-only.json) missed 3 triggers; the [model alone](../eval/results/gate-gemma3-1b-model-only.json) also missed 3. This is a development set, not a holdout. In the selected live group sample, 6 of 7 small-talk messages stopped locally; the false wake reached Nemotron, which stayed silent. The [gate implementation](../hermes/plugins/kaveri-gate/gate.py) and [handover](HERMES_HANDOVER.md) explain the bypasses: media always wakes the bot, direct messages bypass the group gate, and the conversation stays open for 180 seconds after a wake. The current runtime also attaches bounded recent same-chat/topic context when a later message wakes it; those earlier facts can then reach the conversation model. Say that the gate reduced cloud calls in these tests, not that all small talk or photos stay local.

**Oxylabs.** [The endpoint note](OXYLABS_NOTE.md) is the implementation reference: Exa finds pages; Oxylabs reads pages the normal readers cannot open. With no key the fallback is skipped. Record which pages it alone recovered before claiming a quality benefit.

**ElevenLabs.** On the production server, `/api/health` reports `"voice":"elevenlabs"` and `"calls":"browser"`; on Sun 09:35 `/api/aidaddy/speak` returned audio in about one second and `/api/aidaddy/listen` transcribed it back as "Hello, this is AIDaddy". Language and delivery choices are in DECISIONS.md (Sun 02:40), the stand-in voice in Sun 04:36, the browser call line in Sun 02:46. [Pitch audio](pitch/voiceover/) uses the premade George voice; [the same lines in AIDaddy's voice](pitch/voiceover-aidaddy/) exist.

## Unresolved state

- The Hermes track is the deployed bot. The broad live silence run was cancelled, so silence is measured on the labelled set and selected live messages only.
- Live Telegram Cases exist (#103), but the final live acceptance of #103 is still open.
- Oxylabs has no key and no recorded real API result.
- The change-watch alert rule, Case/chat scope and demo page are unsettled. Existing `case_recheck` and a watch template do not demonstrate the proposed Context.dev/Aiven integration; no live daily watch is enabled.
- On Sun 09:30 the platform draft seen from Vlad's account was still unsaved (name "Skarb Hunters", other fields empty). Whoever submits sets the name to AIDaddy and ticks the selection above.

## Submission and claim rules

- Keep Exa as the finder and the core demo as the priority. A tech challenge does not justify weakening quote verification or adding unsupported amounts, deadlines or rules.
- Keep bot conversation, approvals, reminders and silence handling in the Bot runtime; the shared Engine owns research and verification. English and Finnish are the product/demo focus; use the current Engine language lists and team policy before expanding support.
- For every selected tech challenge, write what technology runs, where it appears in the demo, and what evidence supports the claim. Remove selections with no demonstrated role before FINAL.
- For Nemotron, the saved brief specifically requires text in the submission form identifying the model, its job, why it matters and how its output was improved. Prompt changes, Case checks and rehearsal evidence provide concrete material; distinguish these from Engine verification work.
- The saved Oxylabs brief requires a live Web API call at runtime and visible source URLs. An optional reader in the source tree is insufficient.
- Follow [the submission checklist](SUBMISSION_CHECKLIST.md) for the final video, source access and deadline. Provider/account conditions and challenge eligibility must be checked against the platform before the team submits.

## Research references

These are dated research notes, not live vendor specifications:

- [Main challenge brief](CHALLENGE.md): Exa's five judging criteria.
- [Friday tech-challenge plan](research/tech-challenges-2026-11-13.md): original requirements, prize notes, cut lines and proposals, including external source links.
- [Hermes and Nemotron facts](research/HERMES_FACTS.md): provider research and the saved Nemotron challenge requirements.
- [Additional technology facts](research/ADDON_FACTS.md): Context.dev, Aiven, vision and gate research, with sources and verification limits.
- [Decision log](DECISIONS.md): chronology and reasons; preserve the earlier entries when recording a later change.
