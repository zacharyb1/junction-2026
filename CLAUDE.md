# AIDaddy project context

The team uses Claude Code with its own workflows and tools. This repository does not require Orca, a specific agent layout, or any globally installed skill, plugin or MCP server. `.claude/commands/` and `.claude/skills/` are optional helpers. The product's Hermes runtime and its `hermes/skills/butler/` instructions are separate from the coding environment.

## Context by task

- [docs/NEXT.md](docs/NEXT.md): open team decisions and suggested work after the Saturday morning handover. Show it to your person before starting other work on 14 or 15 November. It contains suggestions, not assignments.
- [README.md](README.md): product concepts, architecture, current branch state and evidence. Inspect the actual branch and files before relying on a dated status report.
- [GLOSSARY.md](GLOSSARY.md) and [docs/DECISIONS.md](docs/DECISIONS.md): terminology, choices and their reasons. `docs/PLAN.md` and archived research preserve history, not a current roadmap or work allocation.
- [docs/CONTRACTS.md](docs/CONTRACTS.md): Engine, Case schema, REST/MCP tools and auth. Contract changes belong with their implementation.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): web deployment, credentials/storage boundaries, separate test bots and shared-token handover. Read before starting a gateway, changing its Engine or moving private state.
- [docs/HERMES_HANDOVER.md](docs/HERMES_HANDOVER.md), [hermes/README.md](hermes/README.md), [hermes/CHECKS.md](hermes/CHECKS.md): measured bot behavior, setup reference and unverified assumptions.
- [eval/README.md](eval/README.md): live scorecards, cost and result-file behavior. [docs/TECH_CHALLENGES.md](docs/TECH_CHALLENGES.md) records demonstrated versus proposed sponsor roles; [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) records submission requirements.

- Design system: DESIGN.md (product context: PRODUCT.md).

## Project invariants and operational limits

- Research and verification live in the shared Engine. Conversation, silence, approvals, drafts and reminders live in the bot runtime.
- Plans require fetched-page evidence. Preserve page-word quotes, whole-number matching and same-page support in `ground.ts`, `text.ts` and `verify.ts`; do not weaken grounding to pass a test. This is research with sources, not legal advice.
- The bot never sends, files, books or pays in the real world. A confirmed demo call may contact only the operator-configured test phone, or ring the browser test line; purchases/payments are simulated (docs/DEMO_CALLS.md). Drafts/reminders need family approval. Existing Cases and saved dates must be read successfully before reuse/scheduling; chat labels and delivery scope must match.
- English is primary; Finnish is a product/demo language. Support expansion is a team decision: check `LANGUAGE_NAMES`, `UNSUPPORTED_COUNTRIES` in `src/lib/engine/research.ts` and existing source lists before changing it.
- One active gateway per Telegram token, including alternate runtimes. The scripts cannot detect another machine. Hermes CLI calls can auto-start a gateway; separate profiles may still share credentials and a gateway. Private memories/jobs are not synchronized by Git.
- Local Cases follow the Engine's working directory. Preserve `.data/cases` and backups before moving/removing an Engine; Case backups do not include Hermes memories or reminders. Builds/type generation write `.next`, so they can disrupt a running server using that directory.
- Secrets, private Case data, Hermes homes and family logs stay out of commits. A shared Blob token means shared Case storage; changing a bot token alone does not isolate copied reminder state.
- For UI work, shadcn uses Base UI: link-styled buttons use `LinkButton`/`linkButtonClasses`, not `asChild`. Cache Components are intentionally off.
- Every page except `/reading` renders inside `SiteShell` (`src/components/site/`), which supplies the shared header, footer and dark palette; a new page uses it, and links to `/try`, `/chat` or `/autopilot` use `SiteLink` so the demo's access code travels along. AIDaddy is the one name for the product and its butler.

## Checks and decision history

The branch's checks are defined in [.github/workflows/ci.yml](.github/workflows/ci.yml): storage/rehearsal regressions, lint, typecheck and build. Live scorecards use `--concurrency 2` and shared API credit; `--no-scorecard` preserves the landing scorecard but still writes results. CLI checks do not establish Telegram delivery, and local results do not establish production integration.

Keep non-obvious decisions in the append-only log with a Helsinki timestamp. When changing a logged choice, surface its earlier reason and record what supersedes it; follow the user's current authorization rather than reopening an already settled approval. Commit conventions: imperative subject, at most 72 characters, no model names or secrets. Git/review practices and coding tools remain the team's choice.

In a Claude cloud environment that explicitly provides an injected Exa proxy, `NODE_USE_ENV_PROXY=1 EXA_API_KEY=proxy-injected` is the existing setup convention. It is not a credential or setup requirement for local Claude Code or Vercel.
