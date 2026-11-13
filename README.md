# Kaveri

> The butler that lives in your family group chat. It overhears a life event, researches official sources on the live web with Exa, and comes back with a plan where every line is backed by a quote it has checked.

**Challenge:** Exa, "The Internet Butler / Your Personal Assistant" · **Demo:** https://junction-2026.vercel.app · **Video:** TBD · **Team:** TBD

Built at [Junction 2026](https://2026.hackjunction.com/) (theme: European Tech Renaissance), 13 to 15 November 2026, Espoo.

## What it does

Someone in the family chat writes "I'm pregnant", or drops a photo of a rent-increase letter. Nobody asks the bot anything. Kaveri:

1. Pins the question to the family's country and city, and searches that country's official sites with Exa.
2. Pulls out what to do, by when, and what they are entitled to, each with the sentence it came from.
3. Opens every cited page again, by its own request and through Exa, and keeps only claims it can point at.
4. Posts a short plan in the chat and a link to the case file with every quote.
5. Waits for a one-tap approval before drafting letters or setting reminders.

Anything it could not confirm is listed as such. It is research with sources, not legal advice.

## How it is built

```
Telegram bot (Hermes Agent, or a Hono server with a Mastra agent)
        |  one tool call: research_case
        v
Next.js on Vercel
  research engine   Exa structured search x3 in parallel, official domains first
  verifier          each cited page read twice: live request + Exa Contents
  case store        Vercel Blob
  pages             /c/[id] case file, /try browser demo, / landing page
```

A case takes about 8 seconds and three Exa searches.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # set EXA_API_KEY, CASEFILE_SECRET, DEMO_ACCESS_CODE
pnpm dev                     # http://localhost:3000
```

- Browser demo: `http://localhost:3000/try?code=<DEMO_ACCESS_CODE>`
- Sample case: `CASEFILE_SECRET=... node scripts/seed-sample.mjs`
- Scorecard: `CASEFILE_SECRET=... node eval/run.mjs --base http://localhost:3000 --concurrency 2`
- Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`

## Repo map

| Path | What |
|---|---|
| `src/lib/engine/` | Research engine: jurisdiction lock, Exa search, grounding |
| `src/lib/verify.ts` | Quote verifier |
| `src/lib/case.ts`, `src/lib/cases.ts`, `src/lib/store.ts` | Case contract, operations, storage |
| `src/app/api/research`, `src/app/api/cases`, `src/app/api/mcp` | REST API and MCP server |
| `src/app/c/[id]`, `src/app/try`, `src/app/page.tsx` | Case file, browser demo, landing page |
| `src/data/` | Official source lists per country, sample case, scorecard |
| `hermes/` | Bot setup for Hermes Agent: persona, config, skills, runbook |
| `eval/` | 21 scenarios and the scorecard runner |
| `docs/PLAN.md` | Implementation plan, milestones, what is blocked |
| `docs/CONTRACTS.md` | API and tool contracts, how any bot calls the engine |
| `docs/RESEARCH.md`, `docs/research/` | Feature research, competitors, Exa notes, data sources |
| `docs/CHALLENGE.md`, `docs/DECISIONS.md` | The challenge and the decision log |
| `docs/PLAYBOOK.md`, `docs/PITCH_TEMPLATE.md`, `docs/SUBMISSION_CHECKLIST.md` | Hackathon schedule, pitch kit, Sunday checklist |
| `.claude/` | Slash commands and skills for Claude Code |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Exa (`exa-js`) · MCP (`mcp-handler`) · Vercel Blob · Vercel

## License

MIT, see `LICENSE`. All Junction submissions are MIT licensed per event rules.
