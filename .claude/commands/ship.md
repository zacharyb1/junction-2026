---
description: Check and publish the current change using the team's chosen Git workflow
---
This is an optional helper. Read `CLAUDE.md` and follow the user's current scope and Git/review workflow.

1. Inspect the branch and diff; identify the task's files and any unrelated edits. The existing Vercel integration deploys `main`, so distinguish source publication from production deployment.
2. Run the applicable repository checks from `.github/workflows/ci.yml`. Documentation-only changes need link/reference and diff checks; state when unchanged-code validation is reused. A build writes `.next` and can disrupt a server using that directory.
3. If publication is requested, stage the task's files and inspect the staged diff before committing/pushing. Keep private state and credentials out. Use the team's existing PR/review process rather than creating a duplicate or assuming a required draft state.
4. Report the commit/PR, checks and limitations. Include a deployment URL only if it exists; CI success alone does not establish a working preview or production release.

$ARGUMENTS
