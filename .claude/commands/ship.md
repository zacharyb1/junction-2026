---
description: Validate task changes, commit, push a branch, and report its draft PR
---
1. Read `AGENTS.md`, inspect the branch and diff, and identify this task's files. Work on a feature branch unless the user has explicitly authorized production integration; pushing `main` deploys.
2. Run the required checks from `.github/workflows/ci.yml`, following the isolated-build and documentation-only rules in `AGENTS.md`. Resolve failures caused by this change and report unrelated blockers.
3. Stage only this task's files, inspect the staged diff, and commit with a concise imperative message. Keep secrets, private runtime data and unrelated edits out.
4. Push the feature branch. Update its existing PR, or create a draft with a description of the resulting behavior, evidence and material risks. Do not create a duplicate PR.
5. Report the commit, PR, checks and outstanding limitations. Include a Vercel preview only if it actually exists and say if access is restricted. A passing CI run is not evidence of a working preview or production deployment.

$ARGUMENTS
