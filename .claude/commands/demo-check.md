---
description: Check a chosen demo path with the team's available browser/testing tools
---
This is an optional helper. Read `CLAUDE.md`. The argument is the target URL; identify the intended environment before starting a server or running live research.

1. Read `docs/HERMES_HANDOVER.md` for existing evidence and limits. Use the scenario requested for this check; historical demo scripts are reference, not an assigned test plan. Web checks do not establish Telegram delivery.
2. `node scripts/smoke.mjs <url>` is the repository's basic render/console check if its Playwright browser dependency is available. It is optional; use the team's existing browser/testing setup for the requested path. No Orca or globally installed browser tool is required by this command.
3. Record each observed step, errors and timing. Separate a live result from a mock, CLI rehearsal or prior report. Change behavior only within the requested scope.

$ARGUMENTS
