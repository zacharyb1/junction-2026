---
description: Turn the grilled idea in docs/CHALLENGE.md + docs/DECISIONS.md into an hour-by-hour build plan with MVP cut lines
---
Read `docs/PLAYBOOK.md`, `docs/CHALLENGE.md`, `docs/DECISIONS.md`, and `docs/STARTERS.md`. Current time: ask the user if not obvious.

Write `docs/PLAN.md` containing:

1. **Demo script** (the exact 90-second click path a reviewer will see). Everything in the plan serves this path.
2. **Architecture** in ≤ 10 lines: pages, API routes, external services, data (start in-memory/JSON; DB only if the demo needs persistence).
3. **Vertical slice** (first 3 hours): the thinnest end-to-end version of the demo path, ugly, deployed.
4. **Milestones** with Helsinki-time deadlines, each a shippable state: M1 slice deployed, M2 core feature with real data, M3 polish + second feature, M4 freeze (Sat 20:00), M5 submission (Sun 09:15).
5. **Cut lines**: what gets dropped first if behind at each milestone.
6. **Work split** per team member, in parallel-safe units (separate routes/components) to avoid merge conflicts.
7. **Risks** with mitigations (API key limits, Wi‑Fi, partner API down → cached fixtures).
8. **Seed data** needed for a non-empty first screen.

Keep it under 150 lines. Then list the first 3 concrete tasks and start the first one when the user says go.
