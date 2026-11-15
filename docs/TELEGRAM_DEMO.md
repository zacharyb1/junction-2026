# Live Telegram demo

This is the acceptance run for #103, using the context and work notices from #102. Use the existing project Telegram group with `@junction_kaveri_bot`. The messages below describe a synthetic household. The existing gateway remains on Verda; never start another gateway with its token.

## Before posting

Wait for the implementation's main CI and production deployment to pass. The operator sends `/new --yes` once in the group to load the new persona. This starts a fresh conversation without deleting household memory. Open the group where the audience can see it; the Bot API cannot impersonate a human sender or retrieve already delivered chat history.

## Post three ordinary messages

Send these as separate messages, without an @mention or a request to AIDaddy:

1. `Home for us is Helsinki, Finland.`
2. `It's just me and my partner, no children.`
3. `We're moving to Tampere on 1 December 2026 and haven't checked what paperwork needs doing.`

The first two supply context. They should not start research; a first-time privacy note is okay. The third is the life event. It should produce a short start notice, then a sourced plan and a Case link. Research should use the earlier household facts and both cities without asking for them again. Any prepared letter stays a draft, waiting for the family to send it.

Open the Case link. Check the plan, source quotes and recorded household facts. Any letter or email must follow a submission route supported by the sources. If the authority requires its own form or online service, the bot should link that procedure; optional preparation notes must be a checklist, not a substitute filing document or a send proposal. If the bot offers next actions, select **Not now** after the plan appears. A real research/provider failure is reported as a failure; do not replace it with a prerecorded success.

## Evidence and completion

Record or observe the real Telegram group from before the first message through the result, including the start notice. Retain the Case link and deployed commit. Confirm the Case page and API are readable and the plan agrees with the stored Case. The user posts the messages and reports the observed start/result and link when no authenticated Telegram view is available to the coding agent.

Keep #103 open until this live run succeeds. The isolated gate/model harness uses synthetic tool results and proves context and sequencing only. Web replays, a reachable bot account, and a green deployment are not Telegram delivery evidence.
