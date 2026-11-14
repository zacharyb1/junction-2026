# Isolated capability rehearsals

`rehearse_capabilities.py` drives the real pinned Hermes agent and NVIDIA model with synthetic household data. It creates a fresh `HERMES_HOME` before importing Hermes, never starts a gateway, and refuses an environment containing Telegram settings. The model credential is the only credential it needs.

Run inside the existing Hermes image, with `NVIDIA_API_KEY` already supplied through the environment. This example writes only synthetic results into a temporary directory:

```sh
mkdir -p /tmp/aidaddy-capability-results
podman run --rm --env NVIDIA_API_KEY --security-opt label=disable \
  --volume "$PWD:/workspace:ro" \
  --volume /tmp/aidaddy-capability-results:/results \
  --entrypoint /opt/hermes/.venv/bin/python --workdir /opt/hermes \
  docker.io/nousresearch/hermes-agent:v0.23.1@sha256:276d44685c65c0cb2a25f190b63c65c8906f9dc76486fb1c05ae71b5826bda08 \
  /workspace/eval/bot/rehearse_capabilities.py routine --output /results/routine.json
```

The scenarios are:

| Scenario | Checks | Limit |
|---|---|---|
| `routine` | A seeded count of two becomes a third completion, one household confirmation, one staged skill, no active skill, and a truthful operator-approval reply. | The earlier two completions and successful menu search are fixtures. Operator approval is not exercised. |
| `specialist` | Closing a legal matter removes this chat's legal entry, preserves another chat and another desk, and keeps them out of the reply. | Legal cleanup only; this does not establish specialist selection or general isolation. |
| `proactive` | An ordinary moving-house message leads to research, an unrequested landlord notice, a sourced proposal with sending awaiting approval, and a Case entry labelled for this chat. The household answers “Not now” only after the draft exists. | Research, verification and next-action response are fixtures; the life-event skill is selected in advance. No gate decision, scheduling or Telegram delivery is exercised. |
| `call` | Remembers the current chat's dinner preference, prepares before confirmation, starts the same proposal only on the next Yes, reads the outcome and labels it simulated. | Requires a checkout with the demo-call persona. All phone tools are fixtures; no phone is dialed. |
| `collection` | The same two-turn call procedure for an unrelated appliance-collection task without inventing a usual preference. | Same synthetic phone tools. |

These are live-model smoke checks with explicit assertions, not deterministic model outputs. The fixture tools check agent sequencing; they do not replace the Engine's separate tests or establish the ElevenLabs provider contract. Recorded outputs contain fabricated households only. Memory fixtures use Hermes' actual entry delimiter so deleting one entry cannot inadvertently delete the entire fixture.

The `proactive` run is recorded in [`../results/proactive-20261115.json`](../results/proactive-20261115.json) (25.7 seconds, Hermes v0.23.1). The agent called research and attached a relevant letter before asking what to do next, showed the fixed sourced plan and Case link, and said “Sending waits for your click on the case page.” It then acknowledged “Not now.” No product instructions needed changing. Run it with the command above by substituting `proactive --output /results/proactive.json` for the routine arguments.

`tests/case-actions.test.ts` replays that recorded draft payload through the real `CasePatch` and Case update code: drafting is done, while sending remains `waiting`, including after a source check and a later draft edit. The transcript assertions separately reject missing approval wording, a claim of sending, and a new Case entry without its own chat label. These checks complete the isolated validation in #85, not the broader #28: real scheduled runs, live research and Telegram delivery remain unverified.

The deterministic proactive-path check is:

```sh
pnpm exec vitest run tests/proactive-route.test.ts tests/case-actions.test.ts tests/approve-route.test.ts
```

It executes the real scheduled route and Case functions with an in-memory store and synthetic page-verification results. It checks scheduled change logging, independent once-only notification state for the bot watcher, preservation after unreachable pages, and repeated-run suppression. It does not send a Telegram alert or establish production scheduler operation.
