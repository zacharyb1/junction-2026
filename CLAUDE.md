# Claude entry point

Read [AGENTS.md](AGENTS.md) before working in this repository. It is the canonical project instruction file for all coding agents. [README.md](README.md) is the team overview and routes to the current handover, contracts and decisions.

Claude-specific helpers:

- Project commands are in `.claude/commands/`; coding skills are in `.claude/skills/`. Read the relevant file when using one. Commands follow the shared rules in `AGENTS.md` and the user's current scope.
- In a Claude cloud environment that provides an injected Exa proxy, the server can use `NODE_USE_ENV_PROXY=1 EXA_API_KEY=proxy-injected`. That placeholder is only for that environment; local and deployed engines use their own configured key. Never copy a proxy credential into the repository.
