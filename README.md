# Junction 2026

> _Punchline goes here once the challenge is known._

**Challenge:** TBD · **Demo:** TBD · **Video:** TBD · **Team:** TBD

Built at [Junction 2026](https://2026.hackjunction.com/) (theme: European Tech Renaissance), 13–15 November 2026, Espoo.

## What it does
_TBD after `/challenge` and `/grill-me`._

## Run locally
```bash
pnpm install
cp .env.example .env.local   # add at least one LLM provider key
pnpm dev                     # http://localhost:3000
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm smoke [url]`.

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Vercel AI SDK · Vercel

## Repo map
| Path | What |
|---|---|
| `docs/PLAYBOOK.md` | Hour-by-hour plan, deadlines, how judging works |
| `docs/CHALLENGE.md` | The challenge, criteria, our idea |
| `docs/DECISIONS.md` | Decision log |
| `docs/STARTERS.md` | Which starter repo / library to grab per need |
| `docs/PITCH_TEMPLATE.md`, `docs/SUBMISSION_CHECKLIST.md` | Pitch kit and Sunday checklist |
| `.claude/commands/` | `/challenge`, `/grill-plan`, `/plan`, `/ship`, `/demo-check`, `/pitch`, `/submit-check` |
| `.claude/skills/` | `grill-me`, `grilling`, `handoff` (from mattpocock/skills, MIT) |
| `src/lib/ai.ts` | Single place for model/provider selection |
| `src/app/api/chat` + `src/app/chat` | Streaming chat smoke test |
| `scripts/smoke.mjs` | Playwright smoke test of a deployed URL |

## License
MIT, see `LICENSE`. All Junction submissions are MIT licensed per event rules.
