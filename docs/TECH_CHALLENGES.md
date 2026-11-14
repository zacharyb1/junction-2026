# Challenge status and evidence

Snapshot: Saturday 14 November 2026, on `vlad/hermes-bot` (draft [PR #6](https://github.com/zacharyb1/junction-2026/pull/6)). This describes the code and recorded tests on this branch. It does not certify production integration, Milan's bot track, or the current selections on the Junction Platform.

**Exa remains the main challenge.** Tech challenges support the same product only when their technology has a demonstrated role. The [decision log](DECISIONS.md) records the choices and proposals; the [Friday plan](research/tech-challenges-2026-11-13.md) preserves the original research, prizes and rationale. This status update reconciles that plan with the implementation; it does not settle the team's outstanding choices.

## What we are pursuing

| Challenge | Role and current evidence | What remains before claiming it |
|---|---|---|
| **Exa — The Internet Butler** (main) | The shared Engine uses Exa structured search and page contents to produce a sourced Plan and Case file. Local Telegram research, browser research and engine scorecards have run. | Choose and rehearse the demo scenarios; connect the bot to the deployed Engine and confirm its Case links work on another device. Keep a live-query path for judges. Zachary owns the Engine; Vlad and Milan own the bot tracks. |
| **NVIDIA — Best Use of Nemotron** | Hermes uses `nvidia/nemotron-3.5-super-vl-120b-a12b` for the conversation, tool calls, drafts and native letter-photo reading. Local group and DM flows are recorded. | If Hermes is selected, show that role in the demo and add the required model/use/improvement explanation to the submission form. The bot bake-off remains a team decision. |
| **Gemma** | The local Hermes gate uses `gemma3:1b` through Ollama, after rules and wake patterns. The labelled-set evaluation and selected Telegram messages have evidence. | Show the gate in the chosen demo and report measured misses and false wakes. A Gemma-only trigger outside the 180-second open window remains unmeasured live; this is an evidence gap, not a new broad testing obligation. |
| **Oxylabs Web API** | A third page reader is implemented in the verifier and recheck. Its response handling was tested with a local stand-in; no real API call is recorded. | The team decides whether to obtain/use the account. Then record a successful live read, its source URL and the reader label in the Case file. Do not claim live use from implementation alone. |
| **ElevenLabs** | Pitch voiceover files have been rendered and transcribed back to text. Bot voice input/output has no live test evidence. | Listen to the audio, refresh any stale narration numbers and include the audio in the final video. Confirm that this use meets the selected challenge's brief; claim bot voice only if it is implemented and demonstrated. |
| **Gemini API** | No demonstrated role on the Hermes track. The earlier letter-reader fallback was not used: Nemotron read the test photo. No comparative Gemini test was run. | Keep this selection only if the final bot track demonstrates a meaningful Gemini role. Check Milan's implementation before deciding; the platform selection has not been rechecked. |
| **Context.dev** | Proposed extra verifier reader and monitors for cited pages. No implementation or live test is present on this branch. | Deferred until the core demo works. Agree the alert rule and a controllable page for the demo before building the monitor/webhook path. A second submission under its main challenge is conditional on a working production change watch. |
| **Aiven** | Proposed Postgres index from cited pages to affected Cases; Cases would remain in Blob. No integration is present on this branch. | Confirm the proposal with Zachary and justify it through a working change-watch flow. No database migration is currently required to run Kaveri. |

Hostinger's scam-check idea is an exploratory revisit scheduled for Saturday 14:00 only if the core is green; it is not part of the implemented demo. Beyond the Clinic, Meta glasses, MariaDB's main challenge and Cloudinary remain parked. See the original rationale in the [Friday plan](research/tech-challenges-2026-11-13.md).

## Evidence we can use

**Exa and the bot.** The [Hermes handover](HERMES_HANDOVER.md) distinguishes Telegram delivery from CLI rehearsals and records the local Case recovery. The latest hardening rehearsals returned three fresh washing-machine Cases with working page/API links and 6/6, 7/7 and 9/9 checked quotes. These are selected local runs, not production or general reliability evidence. Engine grounding changes remain separately reviewable in [PR #7](https://github.com/zacharyb1/junction-2026/pull/7). Use the scorecard for the exact version being presented, rather than quoting the older pitch numbers as current.

**Nemotron.** The live rent-letter photo covered all six field categories, with two street-name transcription errors. Text acknowledgements took 3–4 seconds in two observed group turns; the photo acknowledgement took 12 seconds and its Plan 33 seconds. The fresh DM acknowledgement took 12.4 seconds, so the five-second target is not consistently met. Missing-Case and reminder rehearsals show the instruction improvements: fetch before reusing a Case, save/read back the deadline before scheduling, and avoid duplicate jobs. See [the handover](HERMES_HANDOVER.md) and the [rehearsal records](../eval/results/).

**Gemma.** The [combined evaluation](../eval/results/gate-gemma3-1b.json) has 20 triggers and 40 small-talk messages: 0 missed triggers, 4 false wakes, 0 gate errors. [Patterns alone](../eval/results/gate-patterns-only.json) missed 3 triggers; the [model alone](../eval/results/gate-gemma3-1b-model-only.json) also missed 3. This is a development set, not a holdout. In the selected live group sample, 6 of 7 small-talk messages stopped locally; the false wake reached Nemotron, which stayed silent. The [gate implementation](../hermes/plugins/kaveri-gate/gate.py) and [handover](HERMES_HANDOVER.md) explain the bypasses: media always wakes the bot, direct messages bypass the group gate, and the conversation stays open for 180 seconds after a wake. Say that the gate reduced cloud calls in these tests, not that all small talk or photos stay local.

**Oxylabs.** [The endpoint note](OXYLABS_NOTE.md) is the implementation reference: Exa finds pages; Oxylabs reads pages the normal readers cannot open. With no key the fallback is skipped. Record which pages it alone recovered before claiming a quality benefit.

**ElevenLabs.** [Pitch instructions](PITCH.md#voiceover-files), [audio files](pitch/voiceover/) and [voiceover text](pitch/voiceover.json) are present. Audio generation is evidence of video preparation, not a tested voice feature in the bot. The existing numbers line describes an older engine run and needs review before recording the final video.

## Decisions still with the team

1. Choose the bot track and concrete scenarios at the Saturday 10:30 bake-off. Tonight's scope is selected scenarios and polite handling of other messages; the broad live silence run was cancelled.
2. Agree the production Engine URL and matching secret, then verify the full demo path from Telegram on another device. Current local Case links use localhost.
3. Decide whether Oxylabs is worth the account requirement and collect a real API result if retained.
4. Settle the change-watch alert rule, Case/chat scope and demo page before pursuing Context.dev, Aiven or a second submission. Existing `case_recheck` and a watch template do not demonstrate that integration; no live daily watch was enabled.
5. Reconcile the platform's actual challenge selections with the final demo. The prior supervisor recorded renaming the draft to Kaveri; this document does not verify the platform state.

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
