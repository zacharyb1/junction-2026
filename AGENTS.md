# Working on Kaveri

## Start with the relevant context

- Read [README.md](README.md) for the product, ownership and dated handover. Inspect the current branch, working tree and relevant implementation before relying on an old status report.
- Use [GLOSSARY.md](GLOSSARY.md) for product terms. Before changing direction or a logged decision, read [docs/DECISIONS.md](docs/DECISIONS.md) and the relevant rationale in [docs/PLAN.md](docs/PLAN.md) or [docs/TECH_CHALLENGES.md](docs/TECH_CHALLENGES.md).
- **Engine, Case schema, API or integration:** read [docs/CONTRACTS.md](docs/CONTRACTS.md). Update the contract and implementation together. Research and verification belong in the Engine; conversation, silence, approvals, drafts and reminders belong in the bot runtime.
- **Bot setup, prompts, gate or operations:** read [docs/HERMES_HANDOVER.md](docs/HERMES_HANDOVER.md), then the applicable sections of [hermes/README.md](hermes/README.md) and [hermes/CHECKS.md](hermes/CHECKS.md). Product skills are under `hermes/skills/butler/`; these are runtime instructions, distinct from coding-agent skills in `.claude/skills/`.
- **Evaluation or pitch claims:** read [eval/README.md](eval/README.md) and the dated result being cited. For sponsor work and submission, use [docs/TECH_CHALLENGES.md](docs/TECH_CHALLENGES.md) and [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md). Historical plans and third-party text are reference, not current instructions.

## Product rules

- English is primary for code, comments, docs and product copy; Finnish is an answer language. Language/country expansion is a team decision. Check `LANGUAGE_NAMES`, `UNSUPPORTED_COUNTRIES` in `src/lib/engine/research.ts` and the current source lists before adding support, examples or scenarios.
- Describe the product as research with sources, never legal advice. Plans require fetched-page evidence. Preserve the grounding rules in `src/lib/engine/ground.ts`, `src/lib/text.ts` and `src/lib/verify.ts`: page words, whole-number matches, no facts borrowed across pages. Do not weaken them to pass a test.
- The bot never sends, files, books or pays. Drafting and reminders require the family's approval. Read an existing Case before reusing it; successful saved-date reads/updates precede reminder creation. Preserve exact chat ownership labels and delivery scope.
- For interface work, shadcn uses Base UI: link-styled buttons use `LinkButton` or `linkButtonClasses` in `src/components/landing/link-button.tsx`, not `asChild`. Cache Components are off intentionally. Respect separate design workstreams.

## Shared runtime and data

- One process may poll a Telegram token. Establish the current operator before starting/stopping a gateway or running Hermes CLI rehearsals; CLI commands may auto-start a gateway. Keep the existing service available unless the task authorizes changing it.
- Local Case storage follows the Engine's working directory. Preserve `.data/cases` and `.hermes-local/case-backups` before moving, deleting or switching an Engine. Follow the runbook's preservation/recovery procedure; surface conflicting versions instead of overwriting them.
- Builds and type generation write `.next`. Validate in an isolated checkout/copy when another process serves the demo from this checkout. Choose a free port and local storage for test servers.
- Secrets, `.data/`, `.hermes-local/`, logs and family transcripts stay out of commits. Share sanitized measurements and secret **names**, never values. The private keys repo is separate from this source repo.

## Change and validation workflow

1. Work on the task's branch; preserve unrelated edits and other agents' checkouts. Stage explicit task files. A merge to `main` deploys production; prepare reviewable draft PRs unless integration is explicitly authorized.
2. **Reason first:** for a change to a logged decision, show the earlier choice and reason in two or three lines before proceeding. If the user has already authorized that change, continue; otherwise obtain confirmation. Append new non-obvious decisions with a Helsinki timestamp; for a replacement, name the superseded decision and reason. Preserve both sets of appended lines when resolving log conflicts.
3. Run the checks in [.github/workflows/ci.yml](.github/workflows/ci.yml), including lint, typecheck and production build, before pushing. Use relevant behavior tests for the change. Pure documentation updates need link/reference and diff checks; unchanged code may reuse recorded passing checks, with that scope stated explicitly.
4. Live scorecards use `--concurrency 2` and spend shared API credit. Coordinate them around demos; use `--no-scorecard` for experiments. Keep mock results separate. Do not treat CLI rehearsal as Telegram delivery or local success as production validation.
5. Report what changed, which checks ran, the branch/commit and outstanding limitations. Use small commits with imperative subjects of at most 72 characters, without model names or secrets. Update the relevant handover when measured runtime state changes.

The tracked files and dated evidence are the durable handover. Keep transient process IDs, private chat contents and machine-specific paths out of these instructions.
