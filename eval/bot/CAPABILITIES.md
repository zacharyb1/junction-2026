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
| `call` | Remembers the current chat's dinner preference, prepares before confirmation, starts the same proposal only on the next Yes, reads the outcome and labels it simulated. | Requires a checkout with the demo-call persona. All phone tools are fixtures; no phone is dialed. |
| `collection` | The same two-turn call procedure for an unrelated appliance-collection task without inventing a usual preference. | Same synthetic phone tools. |

These are live-model smoke checks with explicit assertions, not deterministic model outputs. The fixture tools check agent sequencing; they do not replace the Engine's separate tests or establish the ElevenLabs provider contract. Recorded outputs contain fabricated households only. Memory fixtures use Hermes' actual entry delimiter so deleting one entry cannot inadvertently delete the entire fixture.

The deterministic proactive-path check is:

```sh
pnpm exec vitest run tests/proactive-route.test.ts tests/case-actions.test.ts tests/approve-route.test.ts
```

It executes the real scheduled route and Case functions with an in-memory store and synthetic page-verification results. It checks scheduled change logging, independent once-only notification state for the bot watcher, preservation after unreachable pages, and repeated-run suppression. It does not send a Telegram alert or establish production scheduler operation.
