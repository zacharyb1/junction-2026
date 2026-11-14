---
description: Smoke-test the demo path on the deployed URL (or local dev) with Playwright, screenshot each step, report breakages
---
Argument (optional): a URL. Default: production URL from README, else `http://localhost:3000`. Read `AGENTS.md` before starting a server; use an isolated checkout and free port if the shared runtime is active.

1. Read the current scope and evidence in `docs/HERMES_HANDOVER.md`. Use the team's selected scenario; if none is selected, the script in `docs/PLAN.md` is a proposal, not a requirement to rerun cancelled live checks. Web checks do not establish Telegram delivery.
2. Run `node scripts/smoke.mjs <url>` for a basic render + console-error check.
3. Then, using Playwright (pre-installed), walk the demo path step by step; screenshot each step into `/tmp/demo-check/`; collect console errors and failed network requests.
4. Report: step → OK/FAIL, time to first render, errors. Fix only things on the demo path, then re-run.

$ARGUMENTS
