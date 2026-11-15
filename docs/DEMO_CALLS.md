# Demo calls

AIDaddy makes a call for the person: it shows what it will say, waits for a confirmation, speaks with whoever answers, and reports what was agreed. The conversation is real, with an ElevenLabs agent in AIDaddy's voice. Purchases, reservations and payments discussed during the call are role-play; no payment integration exists. This supports everyday tasks and update calls, rather than one food-order script.

The call never goes to a business found on the web. It goes to one of two test lines, and the operator's settings pick which:

| Line | Needs | Who answers |
|---|---|---|
| **Browser** | An ElevenLabs key and the agent. No phone number. | Whoever opens the call's web address (`/call/line/...`) and taps Answer. They talk to the agent through their browser's microphone. |
| **Phone** | The same, plus a Twilio number imported into ElevenLabs and one test phone. | The operator's test phone rings. |

A person can ask for a call in two places:

- **In the chat.** Telegram uses its existing chat-labelled memory. Give it a test preference explicitly, such as “Remember for this chat: I prefer collections before 11.” Web chat uses the current conversation only. The assistant shows the task and preferences and waits for a new Yes before starting. Changed details require a fresh proposal. Confirmation is enforced by the conversation instructions, not an independently authenticated approval button.
- **On the `/call` page.** The visitor writes the task and any preferences, reads the proposal, and presses “Call with these details”. That button is the confirmation. The page then shows the ringing line, and the result when the call ends.

This is a controlled demo, not a public purchasing or calling service.

## Operator configuration

Do not put credentials, recipient numbers or private transcripts in Git.

1. Create the agent. With the key of the ElevenLabs account that owns AIDaddy's voice:

   ```bash
   ELEVENLABS_API_KEY=... node scripts/setup-call-agent.mjs
   ```

   It creates the agent “AIDaddy calls”, or updates it when it exists, and prints `ELEVENLABS_AGENT_ID=...`. The script holds the agent's first line and prompt, its three variables (`task`, `preferences`, `demo_notice`), the two-minute limit and the rule that a conversation starts only from a link this server signed. The agent has no payment, purchasing or transfer tool. `--check` reports what exists and changes nothing.
2. In the server's private `.env.local`, set `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` and `DEMO_CALLS_ENABLED=1`. Optionally set `DEMO_CALL_RECIPIENT` (the name shown for whoever answers). This is the browser line.
3. For the phone line, also set `ELEVENLABS_PHONE_NUMBER_ID` (the imported number's ElevenLabs ID, not the phone digits) and `DEMO_CALL_TO_NUMBER` (the test phone in international `+` format). Setting only one of the two leaves calls unavailable; it does not fall back to the browser line.
4. Recreate the web container to load its env. `/api/health` then reports `"calls":"browser"` or `"calls":"phone"`. The Hermes persona and tools require applying the normal deployment and a fresh chat session. Keep only the existing shared gateway running.
5. Telegram discovers the tools automatically. To rehearse from web chat too, set `KAVERI_DEMO_CALLS=1` in the Compose env and recreate `hermes-web`. The web chat tools remain off by default.

The `/call` page is open wherever calls are enabled on the browser line, because that line rings nobody's phone. On the phone line the page stays closed unless `DEMO_CALLS_WEB=1`: enabling it permits visitors to ring the test phone, so enable it only for a controlled rehearsal and disable it afterward.

## Limits that hold on both lines

- One confirmed proposal starts at most one call, including after a restart, a double click or a timeout.
- At most `DEMO_CALLS_PER_HOUR` calls start in an hour (default 12). The agent itself ends a conversation after two minutes and accepts 60 conversations a day.
- On the browser line the provider is contacted only when somebody answers, a call is answered once, and it stops ringing after ten minutes. The answer link is not the call's id: whoever answers hears the task from the agent but cannot read the household's request, preferences or result.
- Missing configuration returns `unavailable`. A timeout while dialing returns `unknown` because the phone might already be ringing; inspect the provider before preparing another attempt.
- Results are fetched from the provider, not fabricated. Private call state lives in `.data/demo-calls`, within the existing persistent data volume.

## Rehearse and verify

1. Ask the bot to remember a harmless test preference in the test chat, or open `/call`.
2. Ask it to call to arrange a task using that preference. Expect `prepare_demo_call`, a proposal containing that preference, the demo explanation and a confirmation question. Nothing should ring yet.
3. Confirm. Expect `start_demo_call`. On the phone line the test phone rings. On the browser line the status is `ringing` and the reply carries an answer link (the `/call` page shows it as a QR code): open it on a phone, allow the microphone and tap Answer.
4. Hold the conversation. The assistant waits up to a minute with `get_demo_call`; ask for the result again if the conversation lasts longer. The `/call` page updates by itself.
5. Check that the result matches the actual conversation and still says purchases/payment were simulated. Dialing or ringing alone is not task completion.
6. Repeat with a different kind of task, such as an appointment enquiry or an important update. A separate proposal needs a separate confirmation.

Automated tests use a fake provider to verify the request, confirmation boundary, one-call and one-answer claims, and results. A browser run with the provider's audio socket played by the test script covers the two pages. Neither establishes that a real voice conversation works. Keep issue #32 open until the actual rehearsal above passes.

Provider contracts: [signed conversation link](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url), [Twilio outbound call](https://elevenlabs.io/docs/eleven-agents/api-reference/integrations/twilio/outbound-call), [conversation summary](https://elevenlabs.io/docs/api-reference/conversations/get-summary).
