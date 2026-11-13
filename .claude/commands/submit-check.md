---
description: Verify every Junction submission requirement against the repo and deployment before the Sunday 10:00 deadline
---
Go through `docs/SUBMISSION_CHECKLIST.md` item by item and verify what you can from the repo and tools:

- `LICENSE` is MIT and present at root.
- `README.md` has: project name, punchline, screenshot or GIF, what it does, how to run locally, env vars listed (names only), team members, challenge name, demo URL, video URL.
- No secrets committed: grep for `sk-`, `key=`, `.env` in git history (`git log -p --all -S "sk-"` is fine).
- `pnpm lint && pnpm typecheck && pnpm build` pass.
- The production URL (ask or read from README) returns 200 and renders the first screen: run `node scripts/smoke.mjs <url>`.
- `docs/PITCH.md` exists and the video script is ≤ 2:00.
- Submission form fields: list what must be typed manually (video link, deck PDF, phone numbers, Discord usernames, FINAL status) as a checklist for the user.

Report PASS / FAIL per item with the fix for each FAIL. Do not silently fix anything that changes product behavior.
