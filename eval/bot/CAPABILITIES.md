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

**Historical evidence limit discovered in #111:** earlier versions configured skill autoload while setting `skip_context_files=True`, which disables autoload in the pinned runtime. Those recorded runs show their observed behavior, but do not establish that the intended skill was loaded. Current rehearsals use a fresh home as their working directory, enable context loading without repository instructions, and inspect the actual built system prompt before any provider call. Each new report records `skill_preflight`: exact skill-body presence, native loaded-skill names and hashes, never the full system prompt. Historical artifacts remain unchanged.

The `proactive` run is recorded in [`../results/proactive-20261115.json`](../results/proactive-20261115.json) (25.7 seconds, Hermes v0.23.1). The agent called research and attached a relevant letter before asking what to do next, showed the fixed sourced plan and Case link, and said “Sending waits for your click on the case page.” It then acknowledged “Not now.” No product instructions needed changing. Run it with the command above by substituting `proactive --output /results/proactive.json` for the routine arguments.

`tests/case-actions.test.ts` replays that recorded draft payload through the real `CasePatch` and Case update code: drafting is done, while sending remains `waiting`, including after a source check and a later draft edit. The transcript assertions separately reject missing approval wording, a claim of sending, and a new Case entry without its own chat label. These checks complete the isolated validation in #85, not the broader #28: real scheduled runs, live research and Telegram delivery remain unverified.

The deterministic proactive-path check is:

```sh
pnpm exec vitest run tests/proactive-route.test.ts tests/case-actions.test.ts tests/approve-route.test.ts
```

It executes the real scheduled route and Case functions with an in-memory store and synthetic page-verification results. It checks scheduled change logging, independent once-only notification state for the bot watcher, preservation after unreachable pages, and repeated-run suppression. It does not send a Telegram alert or establish production scheduler operation.

## Telegram context and work notices

`rehearse_telegram_context.py` feeds two ordinary household messages and a later moving-house trigger through the real gate hook and pinned Hermes prompt formatter, then runs the real NVIDIA model. Memory starts with a privacy-note marker only: city and household facts must come from the retained messages. The gate's first two classifications, Engine tools and Telegram delivery are fixtures. The runtime start hook uses a fake session-bound adapter, not the live bot.

Run it with the same isolated container command above, replacing the final script invocation with:

```sh
/workspace/eval/bot/rehearse_telegram_context.py --output /results/telegram-context.json
```

The [recorded passing run](../results/telegram-context-20261115.json) took 41.7 seconds. It kept Helsinki as the origin and Tampere as the destination, two adults without children, and 1 December 2026. One start notice preceded research. The model attached an unrequested landlord draft, then showed the sourced fixture plan, Case link and sending-approval wording before offering next actions. It answered the actual **Not now** option. A malformed draft-tool attempt was rejected and corrected before the successful attachment; only the successful saved draft counts.

The regression checker rejects missing context, reversed cities, changed dates, unsupported residence-tenure assumptions, duplicate starts, missing or premature drafts, hidden plans, invented button answers and irreversible action choices. It also distinguishes supported letters from required forms and unconfirmed submission routes. Run the deterministic checks with `python3 -m unittest discover -s eval/bot -p test_rehearse_telegram_context.py`.

The current rehearsal loads the plugin through the actual pinned `PluginManager`, and AIAgent dispatches its response and tool hooks natively. Only the delivery adapter, classifier and Engine results are fixtures. `plugin_preflight` records the version and registered hooks; `blocked_tools` records premature questions vetoed by the runtime. An offline scripted AIAgent run also checks research → blocked early question → visible plan → allowed question, without provider calls.

The #111 runs below all verify the current skill body and native plugin `0.3.0`. The old-prompt [baseline](../results/telegram-unconfirmed-route-before-20261115.json) loaded the former skill and produced an unsupported DVV letter; the checker rejects it as a fabricated filing draft.

| Scenario | Result | Time | Runtime questions blocked |
|---|---|---:|---:|
| [Required official form](../results/telegram-official-form-20261115.json) | Verified route, no filing letter; plan before actual Not now | 20.5 s | 1 |
| [Supported landlord notice](../results/telegram-landlord-notice-20261115.json) | Letter saved, review boundary shown, plan before actual Not now | 39.7 s | 0 |
| [Unconfirmed route](../results/telegram-unconfirmed-route-20261115.json) | Route gap stated, no filing draft; plan before actual Not now | 28.0 s | 1 |

Run each by adding `--scenario official-form`, `--scenario landlord-notice` or `--scenario unconfirmed-route` to the invocation above. These are measured smoke checks, not a guarantee of deterministic model behavior or real Telegram delivery.

Separately, all 59 gate/plugin tests pass inside the pinned Hermes image, including the real inbound dispatch, prompt formatting, native MCP result parsing/tool veto and `PluginContext.post_message` routing through a fake Telegram adapter. CI runs these offline on both architectures and fails if any native test is skipped. These establish runtime integration for the configured NVIDIA model and selected model behavior; [the live group procedure](../../docs/TELEGRAM_DEMO.md) remains required for #103.
