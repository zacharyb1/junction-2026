---
description: Lint, typecheck, build, commit, push, and report the Vercel preview/production URL
---
1. `pnpm lint && pnpm typecheck && pnpm build`. If anything fails, fix it first (only the failing thing).
2. `git add -A && git commit -m "<concise message>"` on the current branch. Never commit `.env*` files.
3. `git push -u origin HEAD`.
4. If on a feature branch, open a PR (`gh pr create --fill`) and report the URL; Vercel will post a preview.
5. If on `main`, Vercel deploys production automatically; report the production URL.
6. One-line summary of what shipped.

$ARGUMENTS
