# Running AIDaddy in Docker

Docker Compose can run the whole AIDaddy runtime: the website and Engine, Hermes, and Ollama with the Gemma gate. On a Mac, Docker Desktop supplies the Linux environment and language runtimes. Teammates need no host Node, Python, pnpm, Hermes or Orca installation; they can keep using Claude Code and their usual editor.

The default command starts only the website. Adding `--profile bot` starts the Telegram bot and local model too. Exa research and NVIDIA Nemotron still use their cloud APIs; this is not an offline setup.

| Service | What it runs | Persistent storage |
|---|---|---|
| `web` | Next.js website, research Engine and Case API | `case-data`, or an explicitly configured private Blob store |
| `hermes` | Telegram gateway, conversation, approved drafts and reminders | `hermes-home` at `/opt/data` |
| `ollama` | Local model server for the Gemma gate | `ollama-data` for downloaded models |
| `gate-init` | One-off model download and warm-up before Hermes starts | Uses the Ollama service; exits when ready |
| `proxy` | Caddy reverse proxy with automatic HTTPS, only with `--profile public` on a server | `caddy-data` and `caddy-config` for certificates |

## First run on a Mac

Install and start [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/), clone the repository and open a terminal in its root. Use Docker Compose 2.24 or newer. Linux hosts can use Docker Engine with the Compose plugin.

For the first setup only:

```bash
cp .env.example .env.local
```

Keep an existing `.env.local` instead of replacing it. Edit it locally:

| Setting | Value / purpose |
|---|---|
| `EXA_API_KEY` | Exa key, used for live research. Compose also passes it to Hermes. |
| `CASEFILE_SECRET` | A long random secret for the Engine; Compose passes the same value to Hermes. |
| `DEMO_ACCESS_CODE` | The code used to open `/try`. With `DEMO_OPEN=1` the demo needs no code. |
| `BLOB_READ_WRITE_TOKEN` | Leave empty for isolated local Case storage. |
| `PUBLIC_BASE_URL` | `http://localhost:3000` for use on this Mac; a public HTTPS origin for shared deployment. This controls Case links and page metadata. |

To use the website without running Telegram:

```bash
docker compose --env-file .env.local up --build -d
```

Open `http://localhost:3000`, then `/try?code=<your demo code>`. Live research uses Exa credit. The first build downloads dependencies; later builds reuse unchanged layers.

The published web port binds only to this machine's loopback address. Localhost links will not open on another person's phone. If port 3000 is occupied, add `KAVERI_HTTP_PORT=3001` and set `PUBLIC_BASE_URL=http://localhost:3001` in `.env.local`, then run the build/start command again.

## Running the whole project

Use a separate BotFather token and fresh bot storage for independent development. To run the shared bot, first stop its previous gateway and scheduler as described in the [shared-bot transfer procedure](DEPLOYMENT.md#the-shared-bot-and-duplicate-prevention). One active host owns that token and its pending reminders.

For the first bot setup only:

```bash
cp containers/hermes/env.example .env.bot
```

Fill in `.env.bot` locally; both env files are ignored by Git:

| Setting | Value / purpose |
|---|---|
| `NVIDIA_API_KEY` | Provider key for the configured Nemotron model. |
| `TELEGRAM_BOT_TOKEN` | This instance's BotFather token. |
| `TELEGRAM_ALLOWED_USERS` | Your positive numeric Telegram user ID, or comma-separated admin IDs. These are required even if other users may chat with the bot. |
| `KAVERI_TELEGRAM_CHAT_ID` | Optional numeric group ID, such as `-1001234567890`; set it after the first `/sethome` if it is not known yet. |

Keep bot credentials in `.env.bot`, outside the web app's env file. The shared Exa key and Engine secret come from `.env.local`. Inside Docker, Hermes calls `http://web:3000/api/mcp`; the browser-facing `PUBLIC_BASE_URL` is a different address and must remain reachable by the person opening the Case.

Check the bot configuration before connecting to Telegram:

```bash
docker compose --env-file .env.local --profile bot run --build --rm --no-deps hermes check
```

This creates or updates the saved bot configuration, persona, skills and gate plugin, and binds the home to the configured bot token. It does not start a gateway, scheduler or make model/API calls. Missing credentials or invalid admins fail the check. A home already bound to another token is refused; a new test bot needs a fresh home, not a copy of another bot's conversations and jobs. This local check cannot establish that the same token is stopped on another machine.

Start everything:

```bash
docker compose --env-file .env.local --profile bot up --build -d
docker compose --env-file .env.local --profile bot ps -a
docker compose --env-file .env.local --profile bot logs --tail=100 hermes gate-init
```

The gate model downloads on the first run and is retained in its volume. `gate-init` exiting successfully is expected; Hermes starts after its dependencies are ready. Starting the bot also activates its saved reminders.

In BotFather, disable group privacy for this bot as described in the [Telegram setup](../hermes/README.md#4-create-the-bot-and-turn-privacy-mode-off), then add it to your intended group. Send `/sethome` there from an allowed admin account. Put the reported group ID in `.env.bot` as `KAVERI_TELEGRAM_CHAT_ID`, then recreate the bot to apply the group access and silence settings:

```bash
docker compose --env-file .env.local --profile bot up -d hermes
```

Send `/new --yes` in the group to start a conversation with the installed product instructions. Use the container commands for this setup; `hermes/start.sh` manages the separate native installation.

On macOS, Ollama inside Docker uses the CPU: Docker Desktop does not provide the Apple GPU to the container. Gemma can therefore respond more slowly than native Ollama. The [native option](#native-hermes-option) remains available when Apple GPU acceleration matters. See [Ollama's Docker guidance](https://github.com/ollama/ollama/blob/main/docs/faq.mdx).

## Updates, stopping and duplicate bots

This setup uses production images with no source bind mount or live reload. After pulling or editing code, rebuild and replace the running services:

```bash
docker compose --env-file .env.local --profile bot up --build -d
```

Hermes reapplies the packaged configuration, persona, skills and gate plugin while retaining private conversation and reminder state. For web-only work, omit `--profile bot`. Native `pnpm dev` remains available for live reload; do not run it on the same host port as the web container.

`NEXT_PUBLIC_BOT_USERNAME`, `NEXT_PUBLIC_SAMPLE_CASE_ID` and `NEXT_PUBLIC_REPO_URL` are optional public build settings. `PUBLIC_BASE_URL` is supplied at build time for metadata and at runtime for Case links. Changing these values requires a rebuild. API keys, demo codes and authentication secrets are supplied at startup, never as image build arguments. Local env files and private data are excluded from the build contexts.

To stop the entire stack, including the bot and its scheduler:

```bash
docker compose --env-file .env.local --profile bot stop
```

To remove its containers and network while retaining stored data:

```bash
docker compose --env-file .env.local --profile bot down
```

Include the bot profile when stopping the full stack: plain `down` only selects the default services. To stop just Telegram, use `docker compose --env-file .env.local --profile bot stop hermes`. Changed env values require `up -d` to recreate the affected container; a plain `restart` does not apply changed settings.

Profiles select services; they do not lock a Telegram token. Explicitly targeting `hermes` can also start it, even without the profile flag. The repository has no cross-machine ownership lease or reminder deduplication. A teammate's separate bot token and fresh home are the independent-development boundary. [Docker's profile reference](https://docs.docker.com/compose/how-tos/profiles/) explains selection and stopping behavior.

The host must remain awake and online. By default the services have no restart policy: after restarting Docker or the host, run the appropriate `up -d` command. Closing a coding-agent session is not a controlled bot shutdown.

On a dedicated server, set `KAVERI_RESTART=unless-stopped` in the shell or in `.env.local` before `up -d`. Docker then restarts `web`, `ollama`, `hermes` and `proxy` after a crash, a Docker restart or a reboot, until someone runs `stop`. It stays off by default on purpose: on a laptop that once ran the shared token, an automatic restart would bring the bot back without anyone deciding to, and nothing would stop a second machine polling the same token. A configuration that fails its startup check, such as a missing credential, restarts in a loop; run the `hermes check` command above first.

## Where the data goes

The three named volumes survive container replacements and image rebuilds. **`docker compose --env-file .env.local --profile bot down -v` deletes the local Cases, Hermes conversations/memories/reminders, and downloaded models.** Stop the bot and retain private backups before changing or removing its storage.

Compose normally uses the directory's basename as its project name. Two clones called `junction-2026` on one Docker host can share a project and volumes. For independent instances, use different `-p` names on every command, different host ports, separate bot tokens and fresh state. For example:

```bash
docker compose -p kaveri-test --env-file .env.local --profile bot up --build -d
```

Container storage is separate from the checkout's `.data/cases` and `.hermes-local/home`. Starting Docker does not import either directory, move Cases to Blob, or rewrite old Case/reminder links. There is no automated native-to-container state migration. The existing `hermes/preserve-cases.mjs` lifecycle is not run by these containers.

Without a Blob token, the Engine writes to `/app/.data/cases` in `case-data`. If `BLOB_READ_WRITE_TOKEN` is set, it uses that remote store instead. Reusing the production token shares production Case data; a separate container does not isolate it. Deleting local volumes does not delete remote Blob data. See [deployment storage boundaries](DEPLOYMENT.md#deploying-the-web-app).

## Using a server

The same Compose setup can run on an awake Linux server, such as a small cloud VM. The `public` profile adds a [Caddy](https://caddyserver.com/docs/automatic-https) reverse proxy that obtains a Let's Encrypt certificate and forwards HTTPS to the web service, so Case links and `/try` open on other people's phones. The web port itself stays on the server's loopback address.

Before starting it:

1. Point a hostname at the server. A real domain is best. Without one, `<server-ip>.sslip.io` resolves to the server's address and can get a certificate, for example `203.0.113.10.sslip.io`.
2. Allow inbound ports 80 and 443 (TCP, plus UDP 443 for HTTP/3) in the provider's firewall. Let's Encrypt needs port 80 to issue the certificate. Docker-published ports bypass `ufw` on the host.
3. In `.env.local`, set `KAVERI_DOMAIN` to the hostname, `PUBLIC_BASE_URL` to `https://<hostname>`, and `KAVERI_RESTART=unless-stopped`. `PUBLIC_BASE_URL` is also a build setting, so set it before the first build.

Then start the web app with the proxy, adding the bot profile when this server is meant to own the Telegram token:

```bash
docker compose --env-file .env.local --profile public up --build -d
docker compose --env-file .env.local --profile public --profile bot up --build -d
```

Check `https://<hostname>/api/health` from a phone. The proxy refuses to start without `KAVERI_DOMAIN`. Caddy appends the client address to `X-Forwarded-For`, which the rate limit in `src/lib/rate-limit.ts` reads, so each visitor keeps their own limit. Include `--profile public` in `stop` and `down` commands to select the proxy too.

### Using another Engine

Hermes calls the web service in the same project by default. To have it call another Engine instead, such as the Vercel deployment, set `KAVERI_ENGINE_URL` to that Engine's full `/api/mcp` URL and `CASEFILE_SECRET` to that Engine's secret:

```bash
KAVERI_ENGINE_URL=https://junction-2026.vercel.app/api/mcp
```

Case links then come from that Engine's own `PUBLIC_BASE_URL`, and its Cases live in its own storage. The local web service still starts, because Hermes waits for it before starting, but the bot does not use it. That Engine must have a working search provider: check that its `/api/health` does not report `"provider":"none"`.

Moving images to a server does not move the existing bot's state. Stop the old gateway and scheduler, retain and reconcile private data, then start the intended replacement. A fresh deployment starts with fresh volumes and no old memories or reminders.

## Native Hermes option

The [native deployment guide](DEPLOYMENT.md#an-independent-development-bot) remains available. Native Hermes and Ollama on a Mac can use Apple GPU acceleration for the gate. To connect native Hermes to the Docker web service, set its `CASEFILE_URL` to `http://localhost:3000/api/mcp` with the published host port, and match the Engine secret. Start the native Ollama app first, then use:

```bash
bash hermes/gate.sh start
hermes/bin/hermes gateway run
```

The gateway stays in that terminal; Ctrl+C stops it. Do not enable the Compose bot profile at the same time for that token. Do not use native `hermes/start.sh` with this arrangement: a localhost Engine URL makes it try to start another Engine on the container's port.

## Verified checks

The earlier web-only Linux amd64 image passed local Podman and GitHub Docker checks: lint, type checking, production build, static assets, rejected anonymous writes, authenticated Case creation and identical Case data after container replacement. Its disposable smoke test uses no provider keys:

```bash
docker build --tag kaveri-web:check .
node scripts/container-smoke.mjs docker kaveri-web:check
```

The full-runtime Linux amd64 checks also passed locally:

- The Hermes image matches the native installer's release and source commit. Offline configuration installed the product instructions and imported the gate plugin without starting a scheduler.
- Recreating the configuration retained memory and reminder files. Missing credentials, a changed bot token and a locked home were refused.
- The real Hermes MCP client discovered the Engine's tools on an isolated container network, using a test secret.
- A fresh Ollama volume downloaded and loaded Gemma on CPU; a second initialization reused the cached model.
- A gateway started with fake credentials and networking disabled ran as the unprivileged `hermes` user, kept the shared-volume lock and stopped on SIGTERM during startup. This did not test connected Telegram or draining an active reminder.

The additional repeatable image check is:

```bash
docker build --file containers/hermes/Dockerfile --tag kaveri-hermes:check .
node scripts/hermes-container-smoke.mjs docker kaveri-hermes:check kaveri-web:check
```

The smoke-check runners need host Node 22+, unlike normal Compose startup. GitHub CI builds both images, validates both Compose modes and runs the isolated checks on Linux amd64 and native ARM64 runners; the [latest run](https://github.com/zacharyb1/junction-2026/actions/workflows/ci.yml) records their results. ARM64 covers the container architecture used by Apple Silicon, not the macOS/Docker Desktop host. The pinned upstream Hermes image emits a bundled-pnpm advisory during configuration; the configured gateway does not use pnpm, and the local checks succeeded without installing additional tools.

The `public` profile was checked on macOS with OrbStack on 14 November: the proxy refused to start without `KAVERI_DOMAIN`, and with `KAVERI_DOMAIN=localhost` it served `/api/health` and the landing page over HTTPS through Caddy, redirected plain HTTP to HTTPS and compressed responses. A public hostname, Let's Encrypt issuance and a server deployment were not tested. `KAVERI_RESTART` and `KAVERI_ENGINE_URL` were checked only in the rendered Compose configuration.

Actual Mac execution of the bot profile, live Exa research, Telegram delivery and reminder delivery remain outside these container checks. Earlier native Telegram evidence remains separate in the [Hermes handover](HERMES_HANDOVER.md).
