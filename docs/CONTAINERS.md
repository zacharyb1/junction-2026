# Running the web app in Docker

The repository's Docker setup runs the Next.js web app and research Engine together. On a Mac, Docker Desktop supplies their Linux environment, Node and pnpm. Teammates can keep using Claude Code and their usual editor; Orca is not required.

Compose starts **one web service**. Hermes and Ollama remain separate processes. Starting this setup cannot launch another copy of the shared Telegram bot because no bot service or Telegram credentials are part of it.

## First run on a Mac

Start Docker Desktop, clone the repository and open a terminal in its root. On Linux, Docker Engine with the Compose plugin supplies the same commands. For the first setup only:

```bash
cp .env.example .env.local
```

Keep an existing `.env.local` instead of replacing it. Edit the file locally:

| Setting | Local value / purpose |
|---|---|
| `EXA_API_KEY` | Your Exa key; required for live research. |
| `CASEFILE_SECRET` | A long random secret for this Engine. A connected bot must use the same value. |
| `DEMO_ACCESS_CODE` | The code used to open `/try`. |
| `BLOB_READ_WRITE_TOKEN` | Leave empty for isolated local Case storage. |
| `PUBLIC_BASE_URL` | `http://localhost:3000` for this setup; this is the origin used in Case links and page metadata. |

Then build and start:

```bash
docker compose --env-file .env.local up --build -d
docker compose --env-file .env.local ps
```

Open `http://localhost:3000`, then `/try?code=<your demo code>`. A live research request uses Exa credit. The first build downloads dependencies; later builds reuse unchanged layers.

The published port binds only to this machine's loopback address. These localhost links will not work on another person's phone. If port 3000 is occupied, add `KAVERI_HTTP_PORT=3001` and set `PUBLIC_BASE_URL=http://localhost:3001` in `.env.local`, then run the build/start command again. Use the chosen port in browser links and any bot configuration.

## Editing, updates and stopping

This is a production build with no source bind mount or live reload. After pulling or editing code, run the same command to rebuild the image and replace the web container:

```bash
docker compose --env-file .env.local up --build -d
```

`NEXT_PUBLIC_BOT_USERNAME`, `NEXT_PUBLIC_SAMPLE_CASE_ID` and `NEXT_PUBLIC_REPO_URL` are optional public build settings. `PUBLIC_BASE_URL` is also supplied at build time for metadata and at runtime for Case links. Changes to these values require a rebuild. API keys, demo codes and authentication secrets are supplied only when the container starts; they are not Docker build arguments. `.dockerignore` excludes local env files and private data from the build context.

Useful commands:

```bash
docker compose --env-file .env.local logs --tail=100 web
docker compose --env-file .env.local stop
docker compose --env-file .env.local up -d
docker compose --env-file .env.local down
```

`stop` retains the container; `down` removes the container and its Compose network. Both retain the named Case volume. **`down -v` deletes that volume and its Cases.** Changing environment values requires `up -d` to recreate the container; a plain `restart` does not apply changed settings.

For live reload during development, the native `pnpm dev` setup in the [README](../README.md#run-the-web-app) remains available. Do not run both servers on the same host port.

## Where the data goes

Without a Blob token, the Engine writes to `/app/.data/cases` inside the named `case-data` volume. That volume survives container replacement and image rebuilds. It is separate from the checkout's `.data/cases`; starting Docker does not copy existing Cases into it. Compose normally uses the directory's basename as its project name: two clones called `junction-2026` on the same Docker host can share a project and volume. For independent instances, use different `-p` names on every command (for example, `docker compose -p kaveri-test --env-file .env.local up --build -d`) and different host ports.

Retain a private backup before changing storage or removing a volume. This setup does not migrate local Cases into Docker or Blob, and it does not rewrite old links. It also does not include Hermes conversations, memories or scheduled jobs. The existing `hermes/preserve-cases.mjs` lifecycle is not run by the web container.

If `BLOB_READ_WRITE_TOKEN` is set, the Engine uses that remote store instead of local Case files. Reusing the production token means sharing production Case data; a separate container does not isolate it. See [deployment storage boundaries](DEPLOYMENT.md#deploying-the-web-app).

## Connecting Hermes

The browser demo works without Hermes. To exercise Telegram, use a separate BotFather token and fresh Hermes home for independent development, or follow the documented [shared-bot transfer procedure](DEPLOYMENT.md#the-shared-bot-and-duplicate-prevention). Docker does not provide a cross-machine lock for Telegram tokens or copied reminder jobs.

Install and configure native Hermes using the [deployment guide](DEPLOYMENT.md#an-independent-development-bot). In its private `.hermes-local/home/.env`, set `CASEFILE_URL=http://localhost:3000/api/mcp` (with your chosen host port) and match the container's `CASEFILE_SECRET`. Keep Telegram and NVIDIA credentials in the Hermes home, outside the web app's env file.

With the web container running, start the bot separately. If the gate is installed, start Ollama first; on a Mac, the native Ollama app is the preferred way to use Apple GPU acceleration. The gate script reuses an Ollama service already listening locally:

```bash
bash hermes/gate.sh start
hermes/bin/hermes gateway run
```

The gateway stays in that terminal; Ctrl+C stops it. Omit the gate command if you have not installed the gate. Do **not** use `hermes/start.sh` for this arrangement: when it sees a localhost Engine URL it tries to start its own Engine, which conflicts with the container's published port. Do not also run a gateway elsewhere with the same token. Follow the usual group setup and `/sethome` steps once connected.

Hermes itself supports containers upstream, but this repository does not yet package or validate Kaveri's bot configuration inside one. The supplied Compose file intentionally contains only the web service.

## Using a server

Docker makes the web build portable; running it on a laptop does not publish it on the internet. The existing Vercel project remains a separate hosting option. On a server, the same web image needs durable Case storage (or its own Blob store), an HTTPS reverse proxy and `PUBLIC_BASE_URL` set to the public origin. The checked-in Compose port remains loopback-only so a reverse proxy on that host can forward requests to it.

The Telegram gateway still needs one awake, connected host. Moving the web image does not move the gateway, its private state or its approved reminders.

## Verified checks

The Linux amd64 image was built and exercised locally using Podman. Lint, type checking and the standalone production build passed. The smoke check confirmed non-root operation, static assets, rejected anonymous writes, authenticated Case creation, usable Case links and identical Case data after removing and recreating the container with the same volume. It uses disposable state and no provider keys:

```bash
docker build --tag kaveri-web:check .
node scripts/container-smoke.mjs docker kaveri-web:check
```

The smoke-check runner requires host Node 22+, unlike normal Compose startup. GitHub CI also validates the Compose configuration and runs the build/smoke check with Docker. A local Podman check can use `podman build --format docker --tag localhost/kaveri-web:check .` followed by `node scripts/container-smoke.mjs podman localhost/kaveri-web:check`.

No Mac or arm64 container run has been established yet. Live Exa research, Telegram delivery and reminder delivery were not exercised by these checks. See the [Next.js standalone deployment reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) and [Docker Compose project naming](https://docs.docker.com/compose/how-tos/project-name/) for the underlying behavior.
