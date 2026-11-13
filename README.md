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
5. Never sends, files, books or pays. What needs a decision waits for the family.

Anything it could not confirm is listed as such. It is research with sources, not legal advice.

## Why you can check it

- **The page's own words.** A quote is shown only as it stands on the page. A model quote that merely resembles the page is replaced by the real sentence, or the step is dropped.
- **No number without a sentence.** A deadline or amount needs one sentence on the page it came from, with every number matched as a whole number. A figure in a title, detail or summary that is on no cited page is removed.
- **Disagreement is shown.** When two sources give different figures for one step, both appear with their sources.
- **Each source says how it was checked:** found on the live page by our own request, on a live read through Oxylabs, or in Exa's copy of the page.
- **One tap to the sentence.** Every verified source links to the official page with the quoted sentence highlighted.
- **Sources are read again.** A daily job re-reads the cited pages of recent cases, and a button on the case page does it on demand. A quote that is no longer on its page is flagged there.
- **Gaps are listed.** What could not be confirmed is on the case page, not hidden.
- **Nothing to research, nothing invented.** Small talk or gibberish gets a plain answer instead of a made-up plan.

## Scorecard

`eval/run.mjs` runs 19 everyday scenarios through the live engine and scores each case. The latest run is on the landing page and in `eval/results/latest.md`. Friday night, after the review fixes: 19 of 19 scenarios passed, 123 of 123 quotes found on their pages, median 6.0 seconds, about 2 cents of search per case. A pass means every line shown has a real sentence behind it. It does not mean the plan is complete.

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

A case takes about 6 seconds and three Exa searches.

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
| `src/app/api/cron/recheck` | Daily source re-check, scheduled in `vercel.json` |
| `src/app/c/[id]`, `src/app/try`, `src/app/page.tsx` | Case file, browser demo, landing page |
| `src/data/` | Official source lists per country, sample case, scorecard |
| `hermes/` | Bot setup for Hermes Agent: persona, config, skills, runbook |
| `eval/` | 21 scenarios and the scorecard runner |
| `docs/PLAN.md` | Implementation plan, milestones, what is blocked |
| `docs/CONTRACTS.md` | API and tool contracts, how any bot calls the engine |
| `docs/RESEARCH.md`, `docs/research/` | Feature research, competitors, Exa notes, data sources |
| `docs/CHALLENGE.md`, `docs/DECISIONS.md` | The challenge and the decision log |
| `docs/PITCH.md`, `docs/pitch/` | Pitch kit: story, numbers, video script, demo script, rendered voiceover |
| `docs/OXYLABS_NOTE.md` | Which Oxylabs endpoint we use and why |
| `docs/PLAYBOOK.md`, `docs/PITCH_TEMPLATE.md`, `docs/SUBMISSION_CHECKLIST.md` | Hackathon schedule, pitch template, Sunday checklist |
| `.claude/` | Slash commands and skills for Claude Code |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Exa (`exa-js`) · MCP (`mcp-handler`) · Vercel Blob · Vercel

## License

MIT, see `LICENSE`. All Junction submissions are MIT licensed per event rules.
