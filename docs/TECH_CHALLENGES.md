# Tech challenges we also enter

Decided Fri 13 Nov, about 22:00, by Zachary. The main challenge stays Exa. Junction lets one project enter several challenges, so the same repo and demo go to four tech challenges as well.

Prize and requirement text below comes from the challenge pages on the Junction platform, as read on Friday evening. Items marked (unverified) were not checked against the vendor's own documentation yet.

## Rules for all four

- **Exa first.** An add-on is cut the moment it puts the demo path at risk. Cut order is at the end.
- **Grounding does not change.** No amount, deadline or rule without a sentence on a fetched page. None of these tools may add a claim to a plan.
- **Bot features live in the bot runtime**, not in this app. Only the Oxylabs reader touches this repo's engine.
- **Languages stay English and Finnish.**
- **Keys never go in the repo.**
- **Time budget: 6 hours in total** across the team for all four.

## Summary

| Challenge | Prize | Our use | Where | Owner | Effort |
|---|---|---|---|---|---|
| Gemini API (Google DeepMind) | €4,000 plus $1,000 cloud credits each, €2,000, €1,000 | The bot's model: reads letter photos, decides when to speak, writes drafts | Bot runtime | Vlad or Milan | A model choice, no extra build |
| ElevenLabs (MLH) | Wireless earbuds | Voice note in, spoken plan out, voiceover for the 2:00 video | Bot runtime, video | Bot owner, Zachary | 1 to 2 h |
| Oxylabs Web API | €1,000 Apple voucher for the team, $500 credits each | Third reader in the quote verifier and the recheck | `src/lib/verify.ts` | Claude Code | 1 to 2 h |
| Gemma (Google DeepMind) | €1,000 per team, top three, unranked | Local privacy gate: small talk never leaves the laptop | Bot runtime | Bot owner | 2 to 3 h |

## 1. Gemini API

**What they ask.** Open challenge: "a meaningful, innovative, and technically impressive use of Gemini. Show us why Gemini matters to your solution."

**Our use.** Gemini is the bot's model on whichever bot track wins on Saturday. It has three jobs:

1. **Read the letter photo.** Sender, date, demand, amount, deadline and the full text. The text goes to `research_case` as `document`. This is step 6 of the demo script.
2. **Decide when to speak** under the silence rule, and write the one-line acknowledgement in English or Finnish.
3. **Write drafts** (employer notice, reply to the landlord) from verified case lines only.

**Pitch line.** Gemini reads what the family cannot, a Finnish letter on paper. Exa proves what it says.

**Guardrail.** Gemini never supplies an amount, deadline or rule. Those come only from the tool result. Values read from the family's own letter are passed as values the family supplied, which the engine does not treat as claims (plan section 4, step 4).

**Needs a human**
- Vlad and Milan set the bot's model to Gemini tonight, so nothing is rebuilt later.
- A key from Google AI Studio. Ask the DeepMind booth about hackathon credits.
- Check that Hermes accepts Gemini as a provider (unverified). Mastra does through the AI SDK's Google provider (unverified).
- Use the current multimodal Flash-class model listed at ai.google.dev. No model name is pinned here.

**Evidence for the pitch.** The letter flow on the two printed letters (milestone M3), with a count of fields read correctly.

## 2. ElevenLabs

**What they ask.** MLH prize for the best hack that uses ElevenLabs audio. We need ElevenLabs anyway, for the agent's voice and for the video.

**In the agent**
- **Voice note in.** ElevenLabs speech to text turns a voice note into text, which then takes the same trigger path as a typed message. English and Finnish.
- **Spoken plan out.** A "Read it to me" button sends a Telegram voice message. The text is the plan lines as returned, plus "N of M quotes checked on their pages". Nothing is added or rephrased, so the grounding rule holds.

**In the video (milestone M5)**
- Voiceover for the 2:00 video and the backup video, generated from the script in `docs/PITCH_TEMPLATE.md`.
- Claude Code cloud sessions can call `api.elevenlabs.io` directly, because the key is injected by a proxy there. Claude Code can render the voiceover file itself.

**Models.** Checked Fri 21:59 with `GET /v1/models` on our account: `eleven_v4`, `eleven_v4_turbo`, `eleven_v3`, `eleven_flash_v2_5` and `eleven_multilingual_v2` all list Finnish. Use a flash or turbo model in the bot for speed, and `eleven_v4` or `eleven_v3` for the video. The speech-to-text model was not checked.

**Needs a human**
- An `ELEVENLABS_API_KEY` on the bot machine. The proxy key works only inside Claude cloud sessions.
- Pick the voice.

**Stretch.** A "Listen" button on the case page. It would need the key on Vercel.

## 3. Oxylabs Web API

**What they ask.** The demo makes at least one live Web API call (`/search` or `/scrape`) at runtime, and the solution shows the source URLs behind what it states. Submit the same repo and demo, plus a short note on which endpoints we used and why.

**Why it fits.** Their own inspiration list names a "fact-checker that reads the source" and "watchers" that explain what changed. Those are our quote verifier and `case_recheck`.

**Build**
- **Third reader in `src/lib/verify.ts`.** Today each cited page is read twice: our own live request and Exa Contents. When our own request is refused or returns too little text (blocked, or rendered by JavaScript), read the page with the Oxylabs scrape call (`POST /v1/scrape`, unverified, from their docs index).
- `checkedVia` gains the value `"oxylabs"`, and the case page labels it like the other two.
- The same fallback runs inside `case_recheck`.
- The research trail records the call, so it is visible in the demo.
- Without `OXYLABS_API_KEY` the reader is skipped and nothing else changes. The variable name is a proposal, and the auth scheme is unverified.

**Exa stays the only finder.** Do not use Oxylabs search in the main flow. Criterion 1 of the main challenge is use of Exa, and its judges should see Exa doing the finding.

**Evidence for the pitch.** Run the scorecard with and without the reader, and report how many pages only Oxylabs could read. If that number is zero, do not claim a benefit: keep it as a fallback and say so.

**Needs a human**
- An Oxylabs account and key, set on the Vercel project. Their site mentions a free trial with $5 of credits (unverified). Ask the booth for hackathon credits and what they judge on.

**Cut.** If it is not merged by Sat 15:00, drop it and unselect the challenge.

## 4. Gemma

**What they ask.** "The most innovative and impactful use of Google's Gemma open models."

**Our use: a local privacy gate.** A small Gemma model runs on the bot machine and labels every group message: life event, official document, addressed to the bot, or none. Only messages labelled as triggers are sent to the cloud model and the engine. Small talk never leaves the laptop.

**Why.** It answers "it reads my family chat" with architecture instead of a promise. That worry is already in the plan's risk table.

**Where**
- **Track B (Hono and Mastra):** one function that runs before the agent is invoked.
- **Track A (Hermes):** needs a hook before the model call. Whether Hermes can route by a local model is unverified. If it cannot, the Gemma entry exists only on track B.
- Model: a small Gemma 4 variant through Ollama, for example `gemma4:e4b` (name from third-party write-ups, unverified).

**Open decision for the team.** What happens when the gate is unsure: wake the bot (better recall, less private) or fall back to the wake patterns (more private, may miss an event).

**Evidence for the pitch.** A labelled set of about 60 messages in `eval/` (40 small talk, 20 triggers, English and Finnish), with missed triggers and false wakes reported as counts.

**Cut.** Only start once milestone M1 is green. This is the first add-on to drop.

## Order and cut lines

Order of work:
1. Gemini as the bot's model (a decision, no build).
2. ElevenLabs voiceover for the video (needed anyway).
3. Oxylabs reader.
4. ElevenLabs voice in the bot.
5. Gemma gate.

Cuts:
- Behind at M2: drop the Gemma gate.
- Behind at M3: drop voice in the bot, keep the voiceover.
- Oxylabs not merged by Sat 15:00: drop it.
- Never cut for an add-on: anything on the plan's "never cut" list.

## Submission

- Select each challenge under Tech Challenges on the platform when the project submission is created.
- Write one short note per challenge: which endpoints or models we used, what they do in the demo, and why.
- Claim only what runs in the demo. If an add-on is cut, unselect its challenge before setting the submission to FINAL.

## Sources

- Challenge pages on the Junction platform, Tech Challenges tab, read Fri 13 Nov.
- Oxylabs Web API: https://oxylabs.io/blog/web-api-quick-start-guide , https://developers.oxylabs.io/llms.txt (found by search, pages not opened).
- Gemma 4: https://siliconangle.com/2026/04/02/googles-new-gemma-4-models-bring-complex-reasoning-skills-low-power-devices/ , https://dzone.com/articles/run-gemma-4-locally-guide (third-party, not Google's docs).
- ElevenLabs model list: `GET https://api.elevenlabs.io/v1/models`, called Fri 21:59.
