# Kaveri — Junction 2026, Exa challenge

Hackathon: Junction 2026, Hype Arena, Espoo, 13–15 Nov 2026. Theme **European Tech Renaissance**.
Challenge: Exa, "The Internet Butler / Your Personal Assistant". Criteria, 20% each: use of Exa, usefulness to a specific group, clarity of sources, originality, working on live queries.
**Final submission Sun 10:00** (form closes automatically). Feature freeze Sat 20:00. All times Helsinki (EET, UTC+2).

## Product
A butler in a family's Telegram group. It stays silent until someone mentions a life event or shares an official letter, then researches official sources on the live web with Exa and posts a short plan where every line has a verified quote. A link opens the case file. First audience: international families in Finland. Read `docs/PLAN.md` before changing direction.

## Hard rules from the team
- **English is the main language** for product copy, code, comments and docs. Finnish is available as an answer language and for case-page labels.
- **Supported languages and countries are a team decision.** Answer languages are the ones in `LANGUAGE_NAMES` in `src/lib/engine/research.ts`, and `UNSUPPORTED_COUNTRIES` there lists country codes the engine rejects. Do not add a language, a country source list, examples or test data outside those lists without the team saying so.
- Research with sources, never "legal advice".
- Nothing reaches the user without a sentence on a fetched page to back it. Do not weaken the grounding in `src/lib/engine/ground.ts`, `src/lib/text.ts` or `src/lib/verify.ts` to make a test pass. Quotes are shown in the page's own words only, numbers match as whole numbers, and a fact is never borrowed from another page.
- The bot never sends, files, books or pays. Approval first.
- No secrets in the repo. `.env*` is git-ignored except `.env.example`.

## Architecture (see `docs/CONTRACTS.md`)
- **Engine** `src/lib/engine/research.ts`: country resolves to official domains (`jurisdiction.ts`, lists in `src/data/`), three Exa structured searches in parallel (`outputSchema`, `objective`, highlights), every cited page read twice (`src/lib/verify.ts`: our live request plus Exa Contents), quotes snapped and amounts and deadlines grounded (`ground.ts`), case published.
- **Scope**: `official` for rules and benefits, `open` for choices such as restaurants. `auto` picks from the wording.
- **Cases** `src/lib/case.ts` (contract), `cases.ts` (publish, update, recheck), `store.ts` (Vercel Blob, local folder in dev).
- **API** `POST /api/research`, `/api/cases`, MCP server at `/api/mcp` with `research_case`, `case_publish`, `case_update`, `case_get`, `case_recheck`.
- **Pages** `/c/[id]` case file, `/try` browser demo with live progress, `/` landing with QR and scorecard.
- **Bot** is a separate runtime that calls the engine: Hermes Agent (`hermes/`, Vlad) or a Hono server with a Mastra agent (Milan). Do not build a bot inside this app.
- **Scorecard** `eval/run.mjs` over `eval/scenarios.json`, writes `src/data/scorecard.json` for the landing page.

## Commands
- `pnpm dev`, `pnpm lint`, `pnpm typecheck` (runs `next typegen` first), `pnpm build`.
- Local engine needs `EXA_API_KEY`, `CASEFILE_SECRET`, `DEMO_ACCESS_CODE` in `.env.local`.
- In a Claude cloud session the Exa key is injected by a proxy: run the server with `NODE_USE_ENV_PROXY=1 EXA_API_KEY=proxy-injected`.
- Scorecard: `CASEFILE_SECRET=... node eval/run.mjs --base <url> --concurrency 2`. Exa allows 10 search requests per second per team, so keep concurrency at 2.
- Slash commands in `.claude/commands/`: `/plan`, `/ship`, `/demo-check`, `/pitch`, `/submit-check`, `/grill-plan`. Skills in `.claude/skills/`.

## Stack
Next.js 16 App Router (Cache Components off on purpose), React 19, TypeScript, Tailwind 4, shadcn/ui on Base UI (no `asChild`; for a link that looks like a button use `LinkButton` or `linkButtonClasses` from `src/components/landing/link-button.tsx`), pnpm, `exa-js`, `mcp-handler`, `@vercel/blob`, zod 4. Deployed on Vercel, region fra1.

## Conventions
- Small changes, one concern per commit. `pnpm lint && pnpm typecheck && pnpm build` before pushing.
- Demo path first. Error states on the demo path must be handled.
- Log non-obvious decisions in `docs/DECISIONS.md`, one line with a Helsinki timestamp.
- **Reason first.** When a request would change something logged in `docs/DECISIONS.md` or in the dated update sections of `docs/TECH_CHALLENGES.md`, show the person that decision and its logged reason in two or three lines, then make the change once they confirm. Log the change as a new line that says which decision it replaces and why.
- Commit messages: imperative, at most 72 characters. No secrets and no model names in commits.

## Event rules that disqualify
- All product code written during the event. Not related to an existing company of ours. Team of 1 to 4.
- Source link required and MIT licensed. Video at most 2:00. All members at peer review Sun 10:30–13:00.

## Logistics
Wi‑Fi `Junction2026` / `pushtheboundaries`. Exa workshop Sat 16:30, Loft, 4th floor. Exa engineers at their booth all weekend. Emergency 112, security hotline +358 50 5330021.
