# Deployment and runtime state

This is an operational reference for the current implementation, not a roadmap or task assignment. All commands run from the repository root in an ordinary terminal. Claude Code, Orca and this machine's agent tools are not runtime dependencies.

## What runs where

| Part | Current implementation / recorded state |
|---|---|
| Web app and Engine | Next.js on the existing Vercel project `junction-2026`, at `https://junction-2026.vercel.app`. The Git integration uses `main`; GitHub CI checks code but does not perform the deployment. This handover has not inspected current Vercel environment settings. |
| Hermes | A separate persistent process on a laptop/server, using Telegram polling and calling the Engine's MCP endpoint. It is not started by a Vercel deployment. The latest local process check found the Engine running but no Hermes gateway. |
| Local gate | Ollama with Gemma, used by the Hermes plugin. The plugin is installed locally; its presence alone does not establish a running model service. |
| Case data | Private Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise `.data/cases` under the Engine's working directory. Five local Case files were present at the morning check. |
| Bot state | Memories, conversations, configuration and scheduled jobs in the private `.hermes-local/home`. They are not in Git or Blob. |

The bot configuration still targets a local Engine. Earlier Telegram tests used localhost links; production bot integration and reminder delivery are unverified. Detailed evidence is in [HERMES_HANDOVER.md](HERMES_HANDOVER.md).

## Deploying the web app

The existing Git-connected Vercel project is the normal shared deployment. A teammate needs access to that Vercel project as well as the GitHub repository; GitHub access alone does not grant environment/storage administration.

1. In the Vercel dashboard, open the existing project. Confirm the repository, root directory (this repo's root), Next.js framework and production branch. The repo specifies `fra1` in `vercel.json`; Node 22 is the version used in CI, and `package.json` pins pnpm.
2. Configure the variables below for the intended environment. Existing values can be retained; a newly generated `CASEFILE_SECRET` must also be supplied to every bot/client that writes to that environment.
3. Connect a **private Blob store** and ensure `BLOB_READ_WRITE_TOKEN` is present. This application's storage switch explicitly checks that token; an OIDC-only connection does not select Blob in the current code. The local fallback is for development, not persistent storage on Vercel. See [Vercel's Blob connection instructions](https://vercel.com/docs/vercel-blob/using-blob-sdk).
4. Deploy the intended revision through the team's usual Vercel/Git workflow. On the existing integration, production-branch pushes deploy production and other branches create previews. Environment changes require a new deployment. [Vercel Git deployments](https://vercel.com/docs/git) and [environment guidance](https://vercel.com/docs/deployments/environments) describe those behaviors.
5. Open `/try?code=<the environment's demo code>`, run one test situation, and open its returned `/c/<id>` page from another device. Confirm the stored Case is readable at `/api/cases/<id>`. An authenticated bot/MCP call needs a separate check; a public landing page or passing CI does not establish that path.

For a separate deployment, import the repository into a new Vercel project with the same root/framework settings and configure its own values. As of this handover, the Hermes scripts/docs are on `vlad/hermes-bot` in draft #6; the independent verifier changes are on `review-grounding` in draft #7. Deploying a branch includes only that branch's code.

| Variable | Required role |
|---|---|
| `EXA_API_KEY` | Live research and Exa Contents. |
| `CASEFILE_SECRET` | Bot/script authentication for research, direct Case operations and MCP. MCP/direct authenticated writes fail in production without it; public research can still publish a Case using a valid demo code. |
| `DEMO_ACCESS_CODE` | Browser `/try` access. |
| `BLOB_READ_WRITE_TOKEN` | Persistent Case storage in the connected private Blob store. |
| `PUBLIC_BASE_URL` | Optional Case-link origin. Use the actual site origin, without `/api/mcp`, or omit it to derive the request origin. A copied localhost value produces unusable external links. |
| `OXYLABS_API_KEY` | Optional third reader; no real API test is recorded. |
| `NEXT_PUBLIC_BOT_USERNAME`, `NEXT_PUBLIC_SAMPLE_CASE_ID`, `NEXT_PUBLIC_REPO_URL` | Optional landing-page destinations. A sample ID must exist in this deployment's store. |

[.env.example](../.env.example) is the complete app template. Telegram and NVIDIA credentials belong on the Hermes host, not in the web deployment.

**Preview isolation:** the same Blob token means the same `cases/<id>.json` namespace, with updates enabled. There is no separate preview prefix. An independent preview should use its own private Blob store, secret and demo code. Check the store's connected environments: Vercel may connect Production and Preview together by default. Local web development can omit Blob and use local JSON. `PUBLIC_BASE_URL` must match the environment, not a different deployment.

Deploying new code does not move local Cases to Blob or rewrite URLs in existing reminders. There is no local-to-Blob migration command in this repository. Reads of Case pages/API are public to anyone holding the Case link, even though the Blob store itself is private.

## Hermes and Telegram

### Installing versus running

Installing or editing the repository does not require starting the shared bot. Web-only development uses `pnpm dev` and `/try` without Hermes. To exercise Telegram independently, use a different bot token and a fresh private home.

For a bot host, the tested installer needs macOS/Linux, Git and curl; a local Engine also needs Node 22+ with npx, and the gate needs Podman/Docker or an existing local Ollama. Fedora was tested; macOS was not. Windows-native operation is not established by this handover.

```bash
git clone --branch vlad/hermes-bot https://github.com/zacharyb1/junction-2026.git
cd junction-2026
bash hermes/setup-local.sh
```

The installer is pinned and uses `.hermes-local/`; it does not depend on a teammate's global Hermes or Claude configuration. Its launchers contain absolute paths, so install on the target machine instead of copying the installed Python environment.

### An independent development bot

1. Create a different bot in BotFather and a separate test group. Use a **fresh** `.hermes-local/home`; cloning the source gives this, copying the live home does not.
2. Populate `.hermes-local/home/.env` from [hermes/env.example](../hermes/env.example) in your editor. Set your own `TELEGRAM_BOT_TOKEN`, numeric `TELEGRAM_ALLOWED_USERS`, provider key and Exa key. Set `CASEFILE_URL` to the chosen Engine's **full `/api/mcp` URL** and `CASEFILE_SECRET` to that Engine's secret. Keep the test token local; do not replace the shared keys repo's `bot.env`.
3. For a local Engine, also fill the root `.env.local` from `.env.example`, omit Blob for isolated data, and make the two `CASEFILE_SECRET` values match. The default Engine port is 3000. `start.sh` starts the local Engine itself when the MCP URL is localhost; do not also run `pnpm dev` on that port. For a remote preview, complete its deployment/auth checks first.
4. Configure the runtime and install the gate, if used:

   ```bash
   bash hermes/configure.sh
   bash hermes/install-gate.sh
   ```

5. Follow the [Telegram group setup](../hermes/README.md#4-create-the-bot-and-turn-privacy-mode-off) for your test bot: disable its group privacy as described, then add it to your test group. The existing shared group's ID and admin settings do not belong in the new bot's configuration.
6. Start on that bot host with `bash hermes/start.sh`. Once it is connected, send `/sethome` in your test group from an allowed admin account. Then `bash hermes/configure.sh --group <numeric-chat-id>` applies that group's silence/access settings. Stop with `bash hermes/stop.sh`, start again, and use `/new --yes` to load changed prompts.

**Shared-key helper caveat:** `hermes/secrets.sh` copies the shared `TELEGRAM_BOT_TOKEN` and other values on each run. It can overwrite a locally entered test token. The independent setup above uses a local env file deliberately. Re-running the shared helper is not a harmless refresh for a test bot. The helper can also offer to write missing values back to the shared private keys repo.

The bot host must stay awake and online. `start.sh` backgrounds processes; this project does not install a reboot/restart supervisor. A server can use the team's existing service manager, with only one active gateway for the token. Closing a coding-agent session is not a controlled runtime shutdown.

### The shared bot and duplicate prevention

**One active gateway per Telegram token**, whether Hermes or another runtime. A second poller causes conflicts; branches, profiles and laptops do not provide independent bot identities. A different token plus fresh runtime state is the independent-development boundary.

`start.sh` checks only PID files in its own `.hermes-local/run`. There is **no cross-machine lock, lease, automatic failover or scheduler deduplication across hosts**. A missing local PID file does not prove the shared token is unused elsewhere. There is no automatic duplicate prevention to rely on in the current implementation.

For transferring the shared bot:

1. Establish which host currently runs that token. Stop its gateway and scheduler before starting a replacement. `bash hermes/stop.sh` handles the processes tracked by that checkout and snapshots local Cases; separately started gateways/schedulers or service-manager restarts must also be accounted for. Confirm the old host will remain stopped.
2. Retain a private backup of the old Hermes home and local Case data. A source clone carries neither. Decide explicitly which memories, conversations and pending jobs must continue; a fresh home starts without them.
3. Install Hermes on the new host. Restore/reconcile any retained state while both gateways are stopped, using the runtime's supported state handling. Reapply configuration for the new paths, Engine URL, admin IDs and delivery group. The project does **not** provide an automated or validated machine-to-machine state migration; Case backups alone do not migrate Hermes.
4. Check that each pending reminder has one active owner and its Case URL is still reachable. Then start the replacement and check a normal reply and Case link. Polling conflicts are a reason to stop the replacement and locate the other poller, not a successful handover.

Telegram polling and webhooks are mutually exclusive. Pointing an alternate runtime's webhook at the same token also changes the shared bot's update path; it is not independent testing. See [Telegram's update methods](https://core.telegram.org/bots/api#getting-updates). Polling conflict checks do not prevent copied reminder jobs from sending twice.

On one machine, the gate script uses the fixed container name `kaveri-gate-ollama`. Checkouts can share the same Ollama endpoint; ordinary `stop.sh` stops that container. Use `stop.sh --keep-gate` when another local runtime uses it. Changing only the checkout or port does not rename the container. The scripts are not a multi-instance service manager.

### Pointing Hermes at the deployed Engine

The matching values are the deployed origin plus `/api/mcp` in `CASEFILE_URL`, and that deployment's `CASEFILE_SECRET`. They can be set directly in the ignored Hermes env file with the team's credential tooling.

The repository helper is optional. With a populated private keys repo, `bash hermes/secrets.sh --production` copies its production values; `--local-engine` selects local mode, and a plain run preserves local mode. `--production` depends on the keys repo containing the correct URL/secret. Without them it may leave a previously set local URL; its presence report is not an authentication test. Inspect the endpoint without exposing credentials and test the actual MCP connection after configuration.

Stop the bot before switching its endpoint, then restart on the chosen host. This changes where future research and Case calls go; it does not move existing data or pending jobs.

## Private state and updates

| Path / storage | What it contains | Behavior on a fresh clone |
|---|---|---|
| `.env.local`, `.hermes-local/home/.env` | Engine and bot credentials/configuration values | Absent; configure locally or through the team's private secret source. |
| `.data/cases` | Local Engine Case JSON | Absent; old local links need the original data and origin. |
| `.hermes-local/case-backups` | Exact Case snapshots for preservation/recovery | Absent; does not include conversations or cron jobs. |
| `.hermes-local/home/state.db`, memory files and `cron/` | Conversations, memory and scheduled-job state | Absent; Git and Vercel do not synchronize them. |
| Private Blob store | Cases for deployments using that store's token | Remains remote; reusing the token reuses the same data. |

A Git pull changes source, not running processes. The local startup script reuses an existing `.next/BUILD_ID`; it does not automatically rebuild after source updates. For a managed local Engine update, stop the runtime, retain its data, run the repository's checks/build, then start again. For a deployed Engine, the web deployment is independent of the persistent bot host. Runtime prompt/config updates still need their own application/restart; see [the runbook](../hermes/README.md).

This reference documents the current scripts and their limits. No deployment, token change, state transfer or process restart was performed while writing it.
