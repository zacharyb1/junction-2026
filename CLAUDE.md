# Junction 2026 — team brain

Hackathon: Junction 2026, Hype Arena, Espoo, 13–15 Nov 2026. Theme **European Tech Renaissance**.
Hacking: Fri 19:30 → **Sun 10:00 final submission** (form closes automatically). Pre-submission (challenge pick) Fri 23:59.
All times Helsinki (EET, UTC+2).

## How we win (read `docs/PLAYBOOK.md` for the full plan)
- Challenge winners: picked by the partner on **their** criteria (in `docs/CHALLENGE.md`). Build to them literally.
- Top 5 overall: **peer review** at tables Sun 10:30–13:00 on Innovation / Impact / Implementation, then 7 judges after a 3‑min pitch.
- So: one sharp problem, one wow moment, live demo from a deployed URL, no setup. Working beats ambitious. Pitch/video/deck get real hours.

## Workflow (slash commands in `.claude/commands/`, skills in `.claude/skills/`)
1. `/challenge <paste challenge + criteria>` → `docs/CHALLENGE.md` + ranked idea candidates.
2. `/grill-me` (Matt Pocock's skill) or `/grill-plan` (same, with hackathon context) → stress-test the idea; answers logged to `docs/DECISIONS.md`.
3. `/plan` → `docs/PLAN.md` with demo script, milestones, cut lines, work split.
4. Build on branches → PR → Vercel preview → merge to `main` (auto-deploys production). `/ship` does lint/typecheck/build/commit/push.
5. Skills on demand: `prototype` (throwaway spike to answer a design question), `diagnosing-bugs`, `tdd`, `research`, `grill-with-docs` (grill + write ADRs/glossary), `handoff` (pass context to a teammate's session).
6. `/demo-check [url]` → Playwright walk of the demo path. `/pitch` → video script, stage pitch, slides, submission copy. `/submit-check` Sunday morning.

## Stack (do not add infra without a reason on the demo path)
- Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui (`pnpm dlx shadcn@latest add <component>`), pnpm.
- LLM: Vercel AI SDK v7. Model selection only in `src/lib/ai.ts` (`getModel("smart"|"fast")`); provider by env var. Default Anthropic `claude-opus-5-5`.
- `src/app/api/chat/route.ts` = streaming chat; `src/app/chat` = chat UI; `src/app/api/health` = deploy check.
- Deploy: Vercel (region fra1). Env vars in Vercel project settings. Never commit `.env*`.
- Data: start in-memory / JSON fixtures in `src/data/`. Add Supabase only when persistence is part of the demo.
- More starters per need: `docs/STARTERS.md`.

## Conventions
- Small PRs, one feature per branch, parallel-safe splits (separate routes/components) to avoid conflicts.
- `pnpm lint && pnpm typecheck && pnpm build` must pass before push. CI runs the same.
- Demo path first. Ugly-but-real before pretty. Error states on the demo path must be handled; everything else can throw.
- Seed data so the first screen is never empty.
- Partner API down → cached fixture fallback, so the demo never depends on third-party uptime.
- Log every non-obvious decision in `docs/DECISIONS.md` (one line, timestamp).
- Commit messages: imperative, ≤ 72 chars. No secrets, no model IDs in commits.

## Rules that disqualify (from the organizers)
- No code written before the event; this scaffold is generic boilerplate and tooling, product code starts after Fri 19:30.
- Not related to an existing company of ours. Team 1–4. Source link required, MIT licensed. Video ≤ 2:00. All members at peer review.

## Logistics (details in the participant guide)
- Wi‑Fi `Junction2026` / `pushtheboundaries`. Hacker lounges: 6th floor and Loft (4th). Sauna 7th floor. First aid 3rd floor. Emergency 112; security hotline +358 50 5330021.
- Workshops in Loft (4th) and Hardware Lab (5th). First come first served.
