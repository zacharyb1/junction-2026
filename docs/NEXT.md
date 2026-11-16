# What is open after Vlad's handover

Written Saturday 14 November at about 06:00 Helsinki, when Vlad finished the Hermes bot, the containers and the landing page and went offline until around midday. Freeze is today at 20:00. Final submission is Sunday at 10:00.

**If you are a coding agent:** show your person this page before starting other work. Everything below is a suggestion from Vlad to the team. Nothing here is assigned or decided, and the team may reorder or drop any of it. Check the branch, the open pull requests and the running services yourself, because the facts below were read at 05:40 and will age.

Measured state is in the [README](../README.md#start-here) and the [Hermes handover](HERMES_HANDOVER.md). This page holds only what is still open.

## Three facts that shape the day

> **Update 09:05:** everything now runs on a Verda server at `https://86.38.238.136.sslip.io`, including the bot with the shared token. Case links open on any phone. `"provider":"none"` in `/api/health` does not mean research is off; see the decision log. Do not start the shared token anywhere else. Details in [Deployment](DEPLOYMENT.md#what-runs-where).

- **Production is stale.** `https://junction-2026.vercel.app/api/health` answered with commit `ef53df2` and `"provider":"none"` at 05:38. Vercel blocks newer deployments by project access. Until that changes, the public site does not run the current Engine.
- **The bot's Case links open only on Vlad's laptop.** The Bot runtime points at a local Engine, so every link it posts starts with localhost.
- **Nobody has run the bot on a Mac.** The native setup was tested on Fedora only. The containers pass on Linux amd64 and Linux ARM64 in CI, which is not the same as Docker Desktop on macOS.

## Decisions for the team

Vlad's view is given where he has one. None of these is settled.

| Decision | Vlad's view | Why it matters |
|---|---|---|
| Bot track: Hermes, or keep the 10:30 bake-off | Hermes, and skip the bake-off | Hermes has recorded group, direct-message, letter-photo, approval and gate runs. The Hono and Mastra branch has no commit since Friday 21:57. |
| Operator: who runs the Bot runtime during the demo and peer review | Not Vlad. Otherwise open. | Reminders, memory and the Telegram token belong to one machine at a time. See [Deployment](DEPLOYMENT.md#hermes-and-telegram) before moving the shared token. |
| Where the Engine runs for the demo | Open | Judges open Case links and `/try` on their own phones. That needs a public Engine: production once Vercel is unblocked, or a tunnel to a laptop. |
| Which scenarios must not fail | Open | The move from Helsinki to Tampere has the cleanest recorded run. The rent-increase letter is the only Case with a saved deadline and a reminder, and its rule changed on 1 October 2026. Pregnancy was the original script and has no recent run. |
| Gemini | Open suggestion, see below | Its challenge pays €4,000, €2,000 and €1,000 in cash, more than any other prize we can reach. Today Gemini has no job in AIDaddy. |
| How much new product work before the freeze | Presentation comes first | Vlad asked that the team coordinate so the demo and the pitch reach the best condition in time, ahead of new features. |

## Suggested work, roughly in order of what a judge sees

1. **Get a public Engine.** Unblock the Vercel deployment and confirm `/api/health` reports the current commit and a search provider. Then point the bot at it with a matching `CASEFILE_SECRET` and check one Case link from a phone. Local Cases and the saved reminder do not move with the endpoint.
2. **Takeover dry run.** One teammate starts the bot on their own machine with a separate development token and gets one Plan with a working Case link. Use the [container guide](CONTAINERS.md) or the [runbook](../hermes/README.md#quick-start-the-repo-local-install). This shows whether a Mac can be the Operator's machine before anyone touches the shared token.
3. **Choose the scenarios and rehearse them on the real setup.** `eval/bot/rehearse.py` covers the model and tool flow from the command line. It does not test Telegram delivery, so the chosen scenarios also need a run in the real group.
4. **Record the backup video, then the two-minute pitch video and the deck.** The voiceover in `docs/pitch/voiceover/` quotes an older scorecard run and needs new numbers from the build being shown. [PITCH.md](PITCH.md) has the script.
5. **Reconcile the platform's challenge selections** with what runs in the demo, using [TECH_CHALLENGES.md](TECH_CHALLENGES.md) and the [submission checklist](SUBMISSION_CHECKLIST.md). The Nemotron entry needs its written explanation in the form.

## Optional, once the list above is in good shape

- **Gemini letter comparison.** Set Gemini as Hermes' separate image model and compare it with Nemotron on the rent-increase letter in `eval/bot/fixtures/` (a photo and a scan) and on a second printed letter if the team has one. Nemotron got two street names wrong on the photo. Enter the Gemini challenge only if the comparison shows a real gain, which is what the decision of Friday 23:15 said.
- **One live Oxylabs call.** The third reader is merged but has never called the real API, and the brief asks for a live call with source URLs. The Junction offer needed a credit card when we read it.
- **"Why I spoke" and "Not now" buttons.** Small, and they answer the privacy question inside the chat.
- **[PR #7](https://github.com/zacharyb1/junction-2026/pull/7), the stricter verifier.** It requires independent readings and withholds unsupported amounts. It changes scorecard results, so it needs a fresh run before the pitch quotes any number.
- **Reminder delivery.** A reminder has been scheduled but never seen to arrive. If a reminder is in the demo, send one to the group first.

## Parked, with the reason

- **Change watch with Context.dev and Aiven, and the second submission.** All three depend on a production change watch that does not exist yet.
- **Hostinger scam check.** A separate product idea with no code.
- **Bot voice with ElevenLabs.** The prize is earbuds, and no voice test has been run.

## Limits to keep in mind when presenting

- A verified quote shows the sentence is on the page. It does not show the rule applies to this family. This is research with sources, not legal advice.
- The gate reduced cloud calls in the tests. Photos always reach the cloud model, and so does small talk in the three minutes after a wake.
- The first acknowledgement took 3 to 12 seconds in recorded runs, so the five-second target is not reliably met.
