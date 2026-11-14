# UKK on the web

Saturday 14 November 2026. Agreed with Milan in conversation. Builds on `2026-11-14-ukk-identity-design.md`.

## Intent

UKK should be reachable in exactly two ways: Telegram (any group, already live) and a web page. On the web a person talks to the same UKK (persona, research, rules) without installing anything. The assumed audience, not contradicted by Milan: judges and newcomers on a phone, arriving from the QR code at the team's table, without an account, each in their own conversation.

## Goals, non-goals, anti-goals

- **Goals:** a page on the production site where a visitor chats with UKK and gets the same sourced plans and case links as on Telegram; replies stream; each visitor's conversation is their own; works on a phone.
- **Non-goals:** other chat platforms (Milan: Telegram only); accounts or login; letter-photo upload in the first version; reminders on the web (there is no way to deliver them); running the web chat on Vercel.
- **Anti-goals:** a web visitor reaching anything UKK remembers about a Telegram group or about another web visitor; the API key reaching the browser; strangers spending the NVIDIA or Exa quota without the demo code; a second persona that drifts from `hermes/SOUL.md`.

## Constraints

- Feature freeze today at 20:00 Helsinki; submission Sunday 10:00.
- Production is the Verda server running Docker Compose (`compose.yaml`, deployed by `scripts/deploy/server-deploy.sh`). The site is served by the `web` service behind Caddy.
- The NVIDIA key allows about 40 requests a minute and is shared with the Telegram bot.
- The Hermes image is pinned; its API server is OpenAI-compatible (`/v1/chat/completions`, streaming), keyed by `API_SERVER_KEY`, continues a session through the `X-Hermes-Session-Id` header (only when a key is set), and caps concurrent runs (`api_server.max_concurrent_runs`).
- The existing bot container requires Telegram credentials (`containers/hermes/state.py` `REQUIRED`) and installs the gate and Telegram group settings on start (`containers/hermes/start.sh`).
- `/try` already guards public use with the `x-demo-code` header (`mayResearch` in `src/lib/cases.ts`) and `allow()` in `src/lib/rate-limit.ts`.

## Approaches

| | What | Trade-off |
|---|---|---|
| **A (chosen)** | A second Hermes instance, same image, persona, skills and Engine, with its own volume, only the API server, no Telegram; the site proxies to it | One more container (about 1 GB memory); the web is fully separated from the Telegram groups' memory |
| B | The web page talks to the existing bot container's API server | Least setup; every anonymous visitor shares memory with the Telegram groups |
| C | A UKK chat built into the site without Hermes (revive the scaffold `/chat`) | No second runtime; persona, rules and skills written twice and drifting; not wired to NVIDIA |

Milan chose A.

## Design

### The web instance (`hermes-web`)

- A Compose service from the same Hermes image, in the `bot` profile, with its own named volume. It holds no Telegram token and never starts a Telegram adapter.
- Starts Hermes with only the API server: `API_SERVER_ENABLED=true`, `API_SERVER_KEY` (a long random secret in `.env.local`, generated on the server), `API_SERVER_HOST=0.0.0.0`, port 8642. The port is **not** published to the host; only the `web` service reaches it over the Compose network.
- Same model, persona, skills and Engine connection (`CASEFILE_URL` to the `web` service, `CASEFILE_SECRET`, `EXA_API_KEY`) as the Telegram bot. No gate: every web message is addressed to UKK.
- **Memory off.** The memory toolset is disabled in this instance, so one visitor's city, names or cases can never surface for another. UKK asks for country and city within the conversation when he needs them.
- `api_server.max_concurrent_runs` set to 4, so web traffic cannot take the whole NVIDIA quota from the Telegram bot.
- The container's start and checks gain a web mode: Telegram settings are not required, and the Telegram group, open-groups and gate steps are skipped. The Telegram bot's behaviour is unchanged.

### The page and its API route on the site

- **`/ukk`**: a phone-first chat page in the site's existing style, with UKK's avatar and name, one input, and streamed replies. Case links in replies open the usual `/c/<id>` pages. A line under the input: research with sources, not legal advice; UKK is a made-up character, not an official service. A link to add UKK on Telegram (`@junction_kaveri_bot`).
- It reads the demo code the same way `/try` does (from the QR link) and sends it as `x-demo-code`.
- **`POST /api/ukk`**: checks the demo code (`mayResearch`) and `allow()`; caps a message at 1,500 characters; forwards to `${UKK_API_URL}/v1/chat/completions` with `Authorization: Bearer ${UKK_API_KEY}` and `stream: true`; streams the reply back to the browser.
- **Sessions:** the first reply's `X-Hermes-Session-Id` is stored in an httpOnly, SameSite=Lax cookie; later messages send it back. A visitor's conversation continues while the cookie lives; a new browser is a new conversation.
- Settings: `UKK_API_URL` (on the server, `http://hermes-web:8642`) and `UKK_API_KEY`, both server-side only. When they are unset (Vercel), `/ukk` says the chat runs on the team's server and links there instead of failing.

### Persona

One addition to `hermes/SOUL.md`: on the web page every message is addressed to UKK, like a direct chat; he never replies `[SILENT]` there and does not offer reminders, pointing to Telegram for those instead.

### Settled after the builder check (the designer's calls, for Milan to check)

- **Entry point:** the QR code may already point at `/try?code=…`, so `/try` gets a prominent "Talk to UKK" link that carries the code to `/ukk`. `/ukk` also works on its own. `DEMO_ACCESS_CODE` is already set on the server.
- **Memory:** the server has 29 GB available; the Telegram bot uses about 400 MB. No fallback needed.
- **Secrets:** added by hand over SSH before the first deploy, not by the deploy script. `API_SERVER_KEY` is generated on the server and stored once, in `.env.local`, as `UKK_API_KEY` (the `web` service reads it there; Compose also passes it to `hermes-web` as `API_SERVER_KEY`). `hermes-web` reads its model key from its own `.env.web` (only `NVIDIA_API_KEY`), never `.env.bot`, so it never holds the Telegram token.
- **Deploys:** the deploy script also requires `hermes-web` to answer its health check; if it does not, the release rolls back like a failing bot.
- **Vercel fallback:** links to `NEXT_PUBLIC_UKK_CHAT_URL`, defaulting to `https://86.38.238.136.sslip.io/ukk`.
- **Also off on the web:** scheduled jobs (reminders), with memory.

## Verification

- `/ukk?code=<demo code>` on a phone: a newcomer question ("I just moved to Espoo, what do I register first?") produces UKK's acknowledgement, a sourced plan and a working case link.
- Two browsers hold separate conversations; a follow-up in one continues its own context.
- Without the code: 401. The API key does not appear in any page or script the browser loads.
- The Telegram bot works as before (one message in the home group).

## Left to the builder

How Hermes's memory toolset is disabled in the pinned version; the exact web-mode switches in `containers/hermes`; the page's layout within the existing design system; how streamed chunks are rendered.
