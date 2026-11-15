# Swarm calls

AIDaddy asks one question of several people at the same time by phone and lays their answers side by side: "ask the three test shops whether they have the blue kettle under 40 euros." The household confirms once, every recipient's phone rings at once, and an ElevenLabs agent in AIDaddy's voice holds each conversation. Purchases, bookings and payments discussed on a call are role-play; the agent has no tool for them.

| Piece | Role |
|---|---|
| **Twilio** | The phone number the calls come from. Imported into ElevenLabs once; ElevenLabs then holds the Twilio credentials and dials through them. |
| **ElevenLabs Agents** | The voice agent "AIDaddy swarm" and the batch that dials every recipient in parallel (`POST /v1/convai/batch-calling/submit`). Each conversation's summary, success and one-line `answer` come from its analysis. |
| **The Engine** | `src/lib/swarm-calls.ts`: proposal, the one-confirmation-one-start guard, the hourly limit, reading results back and the comparison. |

## Who can be called

Only the operator's list in `SWARM_CALL_RECIPIENTS` (`Name:+358...,Other name:+358...`). Never a business found on the web, and never a number typed in a chat: the bot picks names from that list, and an unknown name returns `unknown_recipients`. A malformed list turns swarms off rather than dropping someone. Use test phones for the demo.

## Operator setup

Do not put credentials, recipient numbers or transcripts in Git.

1. With the ElevenLabs key that owns AIDaddy's voice and the Twilio account's credentials:

   ```bash
   ELEVENLABS_API_KEY=... TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_PHONE_NUMBER=+358... node scripts/setup-swarm-calls.mjs
   ```

   It creates or updates the agent "AIDaddy swarm" (two-minute limit, end-call tool only, `answer`, `price` and `currency` data collection; recording only with `SWARM_RECORD_CALLS=1`), imports the Twilio number unless it is already imported, and prints `ELEVENLABS_SWARM_AGENT_ID` and `ELEVENLABS_PHONE_NUMBER_ID`. `--check` changes nothing. A Twilio trial account only rings numbers verified in Twilio.
2. In the server's private env set `ELEVENLABS_API_KEY`, `ELEVENLABS_SWARM_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `SWARM_CALL_RECIPIENTS` and `SWARM_CALLS_ENABLED=1`. Optional: `SWARM_RECORD_CALLS=1` (see below), `SWARM_MAX_CALLS` (recipients per swarm, default 5, at most 20) and `SWARM_CALLS_PER_HOUR` (calls dialled per hour, default 20).
3. Restart the web server. `/api/health` reports `"swarm":"twilio"` when everything is set, otherwise `"off"`. `GET /api/swarm` with the server secret lists what is missing.

## The flow

| Step | MCP tool | REST (all need `Authorization: Bearer <CASEFILE_SECRET>`) |
|---|---|---|
| Propose: task, preferences, chosen names. Nothing rings. | `prepare_swarm_call` | `POST /api/swarm` `{task, preferences?, recipients?}` |
| The person says yes to that exact proposal. Every phone rings at once. | `start_swarm_call` `{id, confirmed: true}` | `POST /api/swarm/:id/start` `{confirmed: true}` |
| Progress, then `comparison`: `answered` (name, outcome, answer, price, currency), `unanswered` (name, status such as `voicemail`), `agreed`, and `cheapest` (price, currency, names) when every stated price is in one currency. | `get_swarm_call` `{id, transcript?}` | `GET /api/swarm/:id[?transcript=1]` |
| A recorded call's audio (`audio` on each call), streamed from ElevenLabs. | none | `GET /api/swarm/:id/audio/:recipientId` |
| Stop a proposal or the calls not yet ended. | `cancel_swarm_call` | `POST /api/swarm/:id/cancel` |

Swarm statuses: `proposed`, `starting`, `calling`, `finished`, `failed`, `cancelled`, `unknown`. Other answers: `unavailable` (missing settings, listed), `needs_confirmation`, `needs_new_proposal` (a recipient's number changed since the proposal), `busy` (hourly limit; the proposal stays valid), `already_started`, `too_many`, `unknown_recipients`, `not_found`.

## Prices and recordings

- **Price.** The agent asks for the total price and its currency and repeats the figure back. ElevenLabs' analysis writes it into the `price` (number) and `currency` (ISO code) fields, and each call in the results carries them. A price that is not a plain positive number, such as "about thirty", is left out instead of guessed; the recipient's own words stay in `answer` and the transcript. `cheapest` is named only when all stated prices share a currency. A price is what the recipient said on a demo call, not a quote or an order.
- **Recording.** Off unless `SWARM_RECORD_CALLS=1`, set both on the server and when running the setup script (it switches the agent's `record_voice`). A recorded swarm says so in its proposal, so the household confirms it, and every recipient first hears "This call is recorded so the household can listen to it." A proposal made with the other setting needs a new one. Audio stays with ElevenLabs and is streamed through the secret-protected route; this server stores none. Twilio's own recording stays off, so a call is not recorded twice.

## Limits that hold

- One confirmed proposal starts at most one batch, including after a restart, a double tool call or a timeout (an exclusive marker file next to the swarm).
- A provider error of 500 or more, or an unreadable answer, gives `unknown`, never a retry: phones may already be ringing. Check the batch in ElevenLabs before preparing another.
- Output shows recipient names and the last four digits only, never a full number, the batch id or conversation ids.
- Results come from ElevenLabs' conversation analysis, not from a model on our side. A swarm is `finished` only when the batch ended and every answered call's analysis is ready.
- Private state lives in `.data/swarm-calls` inside the Engine's working directory, which is not in Git.

## What is and is not checked

`tests/swarm-calls.test.ts` runs the whole flow against a fake ElevenLabs that answers like the real one (its own `rcpt_` recipient ids, matched back by phone number): the request shape, confirmation, one start under concurrent calls, provider failures, changed numbers, the hourly limit, comparison, processing delay, cancelling, prices, the cheapest pick, the recording notice and the audio route.

Real run, 15 November 2026 about 03:40 Helsinki: one recipient (a team member's phone) was called from the Twilio number through the batch. The call was answered and lasted 22 s; the recording notice was spoken first; the recipient said "10 euros" and the result carried `price: 10`, `currency: "EUR"`, the transcript and a playable recording (MP3 through `/api/swarm/:id/audio/:recipientId`). That run found that ElevenLabs replaces the recipient ids it is sent, which is now handled. Before the first batch, the ElevenLabs account must accept the batch-calling terms in the web app (Agents → Batch calling); until then the API answers 403 `batch_calling_agreement_required`.

Not checked: several recipients at once on real phones, voicemail, and a recipient who refuses.
