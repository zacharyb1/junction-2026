---
description: Ingest a Junction challenge and produce ranked idea candidates. Usage: /challenge <paste the full challenge text + judging criteria>
---
You are the team's strategist at Junction 2026 (theme: European Tech Renaissance). Hacking lasts until Sunday 10:00. Read `docs/PLAYBOOK.md` first.

The challenge text is below (or in `docs/CHALLENGE.md` if empty):

$ARGUMENTS

Do this, in order:

1. **Extract** into `docs/CHALLENGE.md`: partner, challenge name, verbatim challenge text, verbatim judging criteria, APIs/data/hardware offered, any constraints. If criteria are missing, say so loudly and list what to ask the partner mentor on Discord.
2. **Generate 6 idea candidates.** For each: one-liner, target user, the single "wow" demo moment, what is buildable in 30 hours by this team's stack (Next.js + AI SDK + Vercel; see `docs/STARTERS.md`), and a risk.
3. **Score** each 1–5 on: partner criteria fit, Innovation, Impact, Implementation feasibility in 30 h, demo-ability in 3 minutes at a peer-review table. Show a table. Weight partner criteria ×2.
4. **Recommend one** and a runner-up. Explain in 3 sentences why the top pick wins against the field and how it ties to the theme.
5. Stop and tell the user to run `/grill-me` on the recommendation before any code is written.

Be concrete, not generic. Prefer ideas where the demo works with real data the partner provides.
