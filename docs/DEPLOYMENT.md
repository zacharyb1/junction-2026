# Deployment and runtime state

This is an operational reference for the current implementation, not a roadmap or task assignment. All commands run from the repository root in an ordinary terminal. Claude Code, Orca and this machine's agent tools are not runtime dependencies.

## What runs where

**Production since Saturday 14 November, 09:00 Helsinki:** the whole runtime runs on one Verda CPU server with Compose from `/opt/kaveri` (branch `ops/server-compose`): the web app and Engine at <https://86.38.238.136.sslip.io>, Hermes with the shared token, and the Gemma gate. Services restart after a crash or reboot. **The shared Telegram token is in use there; do not start it on another machine.** Ask in the team chat for SSH access. The table below describes the parts in general.

| Part | Current implementation / recorded state |
|---|---|
| Web app and Engine | Next.js in Compose on the Verda server, at `https://86.38.238.136.sslip.io`. The Vercel project `junction-2026` was deleted on Saturday 14 November at 15:51 Helsinki; `https://junction-2026.vercel.app` no longer serves this app. Cases live in the server's `case-data` volume. Merges to `main` reach the server through the Deploy workflow, which needs `DEPLOY_SSH_KEY` (see below). Nothing runs the daily source re-check from `vercel.json` any more. |
| Hermes | A separate persistent process on a laptop/server, using Telegram polling and calling the Engine's MCP endpoint. It is not started by a Vercel deployment. The former local installation was removed after its source merged; its remaining Engine and gate processes were stopped at 05:48 EET on 14 November. No gateway or scheduler from that installation was running. |
| Local gate | Ollama with Gemma, used by the Hermes plugin. Setup installs the plugin into each Hermes home; its presence alone does not establish a running model service. |
| Case data | Private Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise `.data/cases` under the Engine's working directory. The five former local test Cases are no longer available from the removed installation. |
| Bot state | Memories, conversations, configuration and scheduled jobs in the private `.hermes-local/home`. They are not in Git or Blob. |

Earlier Telegram tests targeted a local Engine and used localhost links; production bot integration and reminder delivery are unverified. The removed installation's private bot state and reminder were not in Git, and targeted checks found no surviving external backup. A new installation starts with fresh state unless a separate backup is supplied. Detailed evidence is in [HERMES_HANDOVER.md](HERMES_HANDOVER.md).

The whole runtime can also run in Docker: see [CONTAINERS.md](CONTAINERS.md) for Mac/Linux setup and separate persistent volumes for Cases, Hermes state and Ollama models. The default Compose command starts only the web service; `--profile bot` explicitly starts Hermes and the Gemma gate too, and `--profile public` adds an HTTPS reverse proxy for a server. Starting containers does not move existing runtime state. Exa and NVIDIA remain external API services.

## Automatic deployment

Every push to `main` that passes CI is deployed to the production server by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). Merging a pull request is a push to `main`. Vercel keeps deploying `main` on its own as before.

How it works:

1. The workflow runs when the CI workflow succeeds for a push to `main`. Deploys run one at a time, in order.
2. It sends the exact commit to the server as a git bundle over SSH. The server has no GitHub access.
3. On the server, the deploy key can only run [`scripts/deploy/server-deploy.sh`](../scripts/deploy/server-deploy.sh), installed as `/usr/local/sbin/kaveri-deploy`. It checks out the commit, builds, and restarts only the containers whose image or settings changed. A change outside `hermes/` and `containers/hermes/` does not restart the bot.
4. The deploy passes when `/api/health` reports the new commit and the bot stays up for 30 seconds. Otherwise the previous commit is deployed again and the workflow run fails. Bot memory, reminders, Cases and models are in volumes and survive either way.
5. The workflow then checks the public site reports the new commit.

To redeploy `main` by hand: GitHub, **Actions**, **Deploy**, **Run workflow** on `main`. The run's log shows the server output. A deploy takes about 1 to 2 minutes, and a failed one about 5, including the rollback.

### One-time setup (repository owner)

Only the owner of this personal repository can add secrets. The key is created on the owner's machine and never shared:

1. GitHub, **Settings**, **Environments**, **New environment** named `production`. Under **Deployment branches and tags**, choose **Selected branches and tags** and add `main`. This keeps the key away from workflows on other branches.
2. Create the key and store it in that environment, then delete the private key file:

   ```bash
   ssh-keygen -t ed25519 -N '' -C kaveri-deploy -f kaveri-deploy
   gh secret set DEPLOY_SSH_KEY --env production -R zacharyb1/junction-2026 < kaveri-deploy
   rm kaveri-deploy
   ```

3. Send `kaveri-deploy.pub` (the public key, safe to share) to whoever has server access. They add it to `/root/.ssh/authorized_keys` on the server as one line, so the key can only run the deploy script:

   ```text
   command="/usr/local/sbin/kaveri-deploy",restrict ssh-ed25519 AAAA... kaveri-deploy
   ```

4. Run the Deploy workflow by hand once and check it is green.

When `scripts/deploy/server-deploy.sh` changes, copy it to `/usr/local/sbin/kaveri-deploy` on the server by hand. The deploy uses the installed copy, not the one in the commit it deploys.

### The web chat (`/chat`)

`hermes-web` serves the `/chat` page: the same AIDaddy, web-only, with memory and reminders off and only the `research_case`, `case_get` and `find_products` Engine tools. It needs, on the server:

- `.env.local`: `UKK_API_URL=http://hermes-web:8642` and `UKK_API_KEY` (a long random value; Compose passes it to `hermes-web` as `API_SERVER_KEY`).
- `.env.web`: only `NVIDIA_API_KEY` (template `containers/hermes/env.web.example`). Never the Telegram token; the web instance refuses to start with it.

Port 8642 is not published; only the `web` service reaches it. Without `UKK_API_URL` (on Vercel) the page links to `NEXT_PUBLIC_UKK_CHAT_URL`, by default the server's `/chat`. The names `UKK_API_URL`, `UKK_API_KEY` and `NEXT_PUBLIC_UKK_CHAT_URL` predate the rename to AIDaddy and still configure the `/chat` page.

## Deploying the web app

The existing Git-connected Vercel project is the normal shared deployment. A teammate needs access to that Vercel project as well as the GitHub repository; GitHub access alone does not grant environment/storage administration.

1. In the Vercel dashboard, open the existing project. Confirm the repository, root directory (this repo's root), Next.js framework and production branch. The repo specifies `fra1` in `vercel.json`; Node 22 is the version used in CI, and `package.json` pins pnpm.
2. Configure the variables below for the intended environment. Existing values can be retained; a newly generated `CASEFILE_SECRET` must also be supplied to every bot/client that writes to that environment.
3. Connect a **private Blob store** and ensure `BLOB_READ_WRITE_TOKEN` is present. This application's storage switch explicitly checks that token; an OIDC-only connection does not select Blob in the current code. The local fallback is for development, not persistent storage on Vercel. See [Vercel's Blob connection instructions](https://vercel.com/docs/vercel-blob/using-blob-sdk).
4. Deploy the intended revision through the team's usual Vercel/Git workflow. On the existing integration, production-branch pushes deploy production and other branches create previews. Environment changes require a new deployment. [Vercel Git deployments](https://vercel.com/docs/git) and [environment guidance](https://vercel.com/docs/deployments/environments) describe those behaviors.
5. Open `/try?code=<the environment's demo code>`, run one test situation, and open its returned `/c/<id>` page from another device. Confirm the stored Case is readable at `/api/cases/<id>`. An authenticated bot/MCP call needs a separate check; a public landing page or passing CI does not establish that path.

For a separate deployment, import the repository into a new Vercel project with the same root/framework settings and configure its own values. The Hermes scripts/docs merged into `main` through PR #6 (`318f760`); the independent verifier changes remain on `review-grounding` in draft #7. GitHub CI passed for the merge, but its Vercel deployment was blocked by project access. Repository access and successful checks do not establish a successful production deployment.

| Variable | Required role |
|---|---|
| `EXA_API_KEY` | Live research and Exa Contents. |
| `CASEFILE_SECRET` | Bot/script authentication for research, direct Case operations and MCP. MCP/direct authenticated writes fail in production without it; public research can still publish a Case using a valid demo code. |
| `DEMO_ACCESS_CODE` | Browser `/try` access. Not asked for where `DEMO_OPEN=1` is set: the demo is then open to everyone and rate limited. |
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

The [full-container setup](CONTAINERS.md#running-the-whole-project) needs Docker and Compose on the host; it packages the language runtimes and Hermes. The native instructions below are a separate option. For native installation, the tested installer needs macOS/Linux, Git and curl; a local Engine also needs Node 22+ with npx, and the gate needs Podman/Docker or an existing local Ollama. Fedora was tested; native macOS installation was not. Windows-native operation is not established by this handover.

```bash
git clone https://github.com/zacharyb1/junction-2026.git
cd junction-2026
bash hermes/setup-local.sh
```

The installer is pinned and uses `.hermes-local/`; it does not depend on a teammate's global Hermes or Claude configuration. Its launchers contain absolute paths, so install on the target machine instead of copying the installed Python environment.

### An independent development bot

1. Create a different bot in BotFather and a separate test group. Use a **fresh** `.hermes-local/home`; cloning the source gives this, copying the live home does not.
2. Populate `.hermes-local/home/.env` from [hermes/env.example](../hermes/env.example) in your editor. Set your own `TELEGRAM_BOT_TOKEN`, numeric `TELEGRAM_ALLOWED_USERS`, provider key and Exa key. Set `CASEFILE_URL` to the chosen Engine's **full `/api/mcp` URL** and `CASEFILE_SECRET` to that Engine's secret. Keep the test token local; do not replace the shared keys repo's `bot.env`.
3. For a local Engine, also fill the root `.env.local` from `.env.example`, omit Blob for isolated data, and make the two `CASEFILE_SECRET` values match. The default Engine port is 3000. `start.sh` starts the local Engine itself when the MCP URL is localhost; do not also run `pnpm dev` on that port. For an Engine already running in Docker, use the [foreground gateway procedure](CONTAINERS.md#native-hermes-option) instead of `start.sh`. For a remote preview, complete its deployment/auth checks first.
4. Configure the runtime and install the gate, if used:

   ```bash
   bash hermes/configure.sh
   bash hermes/install-gate.sh
   ```

5. Follow the [Telegram group setup](../hermes/README.md#4-create-the-bot-and-turn-privacy-mode-off) for your test bot: disable its group privacy as described, then add it to your test group. The existing shared group's ID and admin settings do not belong in the new bot's configuration.
6. Start on that bot host with `bash hermes/start.sh`. Once it is connected, send `/sethome` in your test group from an allowed admin account. Then `bash hermes/configure.sh --group <numeric-chat-id>` applies that group's silence/access settings. Stop with `bash hermes/stop.sh`, start again, and use `/new --yes` to load changed prompts.

**Shared-key helper caveat:** `hermes/secrets.sh` copies the shared `TELEGRAM_BOT_TOKEN` and other values on each run. It can overwrite a locally entered test token. The independent setup above uses a local env file deliberately. Re-running the shared helper is not a harmless refresh for a test bot. The helper can also offer to write missing values back to the shared private keys repo.

The bot host must stay awake and online. `start.sh` backgrounds processes; the native setup does not install a reboot/restart supervisor. The container setup can restart itself on a dedicated server with `KAVERI_RESTART=unless-stopped` (see [CONTAINERS.md](CONTAINERS.md#updates-stopping-and-duplicate-bots)). A server can use the team's existing service manager, with only one active gateway for the token. Closing a coding-agent session is not a controlled runtime shutdown.

### The shared bot and duplicate prevention

**One active gateway per Telegram token**, whether Hermes or another runtime. A second poller causes conflicts; branches, profiles and laptops do not provide independent bot identities. A different token plus fresh runtime state is the independent-development boundary.

`start.sh` checks only PID files in its own `.hermes-local/run`. The container setup requires explicit bot startup and checks which token owns its saved home, but those checks cover only that storage. There is **no cross-machine lock, lease, automatic failover or scheduler deduplication across hosts**. A missing local PID file or fresh container does not prove the shared token is unused elsewhere.

For transferring the shared bot:

1. Establish which host currently runs that token. Stop its gateway and scheduler before starting a replacement. For the native setup, `bash hermes/stop.sh` handles the processes tracked by that checkout and snapshots local Cases. For Compose, `docker compose --env-file .env.local --profile bot stop hermes` stops the bot container. Separately started gateways/schedulers or service-manager restarts must also be accounted for. Confirm the old host will remain stopped.
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
| Compose `case-data`, `hermes-home`, `ollama-data` volumes | Container Cases, private bot state/reminders and downloaded models | Created for that Compose project; no automatic import from native state. Container replacement retains them; `down -v` deletes them. |
| Private Blob store | Cases for deployments using that store's token | Remains remote; reusing the token reuses the same data. |

A Git pull changes source, not running processes. The local startup script reuses an existing `.next/BUILD_ID`; it does not automatically rebuild after source updates. For a managed local Engine update, stop the runtime, retain its data, run the repository's checks/build, then start again. For a deployed Engine, the web deployment is independent of the persistent bot host. Runtime prompt/config updates still need their own application/restart; see [the runbook](../hermes/README.md).

This reference documents the current scripts and their limits. The final handover cleanup stopped the orphaned Engine and gate after removal of their worktree. It did not deploy the app, change a token, transfer private state or start a replacement bot.
