# Starter repos: what to copy once the challenge is known

**Historical catalogue from before the product was chosen.** For the current architecture, tools and setup, start with [README.md](../README.md). The options below are references, not instructions to install or replace components in Kaveri.

Rule of thumb: **this repo is already the default starter** (Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Vercel AI SDK, deployed on Vercel). Only pull in another template when the challenge needs something this one lacks. Copy *patterns and files*, not whole repos, unless noted.

## Tier 1 — the defaults (already here)
| Need | Use | Why |
|---|---|---|
| Web app, landing, dashboard, forms | **this repo** | Zero setup, preview URL per PR. |
| UI components fast | [shadcn/ui](https://github.com/shadcn-ui/ui) — `pnpm dlx shadcn@latest add <component>` | Copy‑paste components, good by default. Also blocks: `pnpm dlx shadcn@latest add dashboard-01 login-01 sidebar-07`. |
| LLM calls, streaming, tool calling, structured output | [Vercel AI SDK](https://github.com/vercel/ai) — `examples/next-openai` in that repo has every pattern (streaming, tools, generative UI, files, images) | Provider-agnostic. Swap Anthropic/OpenAI/xAI/Gemini with one line in `src/lib/ai.ts`. |

## Tier 2 — clone when the product *is* this
| Product shape | Repo | Notes |
|---|---|---|
| Chat / agent UI (ChatGPT‑style, history, auth) | [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) | One‑click Vercel deploy. Strip auth/DB if not needed. Best "AI product" baseline. |
| Prebuilt chat UI parts (message list, reasoning, tool calls, sources) | [vercel/ai-elements](https://github.com/vercel/ai-elements) — `pnpm dlx ai-elements@latest` | shadcn‑style components for AI UIs. Drops into this repo. |
| Auth + Postgres + realtime in minutes | [Next.js with-supabase example](https://github.com/vercel/next.js/tree/canary/examples/with-supabase) — `pnpm create next-app -e with-supabase` | Free tier. RLS, realtime, storage. |
| Typed full‑stack (tRPC + Drizzle + auth) | [t3-oss/create-t3-app](https://github.com/t3-oss/create-t3-app) | Only if you already know T3. |
| SaaS with billing/teams | [nextjs/saas-starter](https://github.com/nextjs/saas-starter) | Only if "can it be a company" is the pitch. |
| Dashboard / analytics | [shadcn blocks](https://ui.shadcn.com/blocks) + Recharts via `pnpm dlx shadcn@latest add chart` | |
| Maps / geo | [visgl/react-map-gl](https://github.com/visgl/react-map-gl) + MapLibre, or [react-leaflet](https://github.com/PaulLeCam/react-leaflet) | MapLibre + OpenFreeMap tiles needs no API key. |
| Mobile app | [Expo](https://github.com/expo/expo) — `pnpm create expo-app` | Only if mobile is the point; a responsive web app on a phone usually suffices. |
| Browser extension | [wxt-dev/wxt](https://github.com/wxt-dev/wxt) or [PlasmoHQ/plasmo](https://github.com/PlasmoHQ/plasmo) | |
| Realtime multiplayer / collab | [partykit/partykit](https://github.com/partykit/partykit), [liveblocks/liveblocks](https://github.com/liveblocks/liveblocks) | Supabase Realtime also fine. |
| 3D / spatial wow | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | |

## Tier 3 — Python / ML / partner tech
| Need | Repo | Notes |
|---|---|---|
| Python API next to the Next.js app | [fastapi/full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template), or just `fastapi` + `uvicorn` in `api/` | Vercel hosts FastAPI as a serverless function (`api/index.py`); or run on Modal. |
| ML demo UI with zero frontend work | [gradio-app/gradio](https://github.com/gradio-app/gradio), [streamlit/streamlit](https://github.com/streamlit/streamlit) | Embed via iframe in this app for the demo. |
| GPU inference / fine‑tune / batch jobs | [modal-labs/modal-examples](https://github.com/modal-labs/modal-examples) | **Modal is a partner** (workshop Sat 13:30). Serve any HF model as an endpoint in ~30 lines. |
| Web search / retrieval for agents | [exa-labs/exa-js](https://github.com/exa-labs/exa-js), [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) | **Exa is a partner** (workshop Sat 16:30). |
| Company / investor / people data | Cala (partner, workshop Sat 11:00) | "Make Unicorns Real" challenge: build for founders/VCs on Cala data. |
| Gemini / DeepMind | [google-gemini/cookbook](https://github.com/google-gemini/cookbook), `@ai-sdk/google` | **DeepMind workshop Fri 20:00.** Generous free tier; native video/audio input. |
| Voice agents / TTS / STT | [elevenlabs/elevenlabs-examples](https://github.com/elevenlabs/elevenlabs-examples), [elevenlabs/elevenlabs-js](https://github.com/elevenlabs/elevenlabs-js) | A talking agent widget is an instant wow. |
| Arduino / hardware lab | [arduino/arduino-examples](https://github.com/arduino/arduino-examples) + Web Serial API | **Arduino is a partner** (hardware lab, 5th floor). Browser ↔ board over Web Serial, no backend. |
| Intel / on-device inference | [openvinotoolkit/openvino_notebooks](https://github.com/openvinotoolkit/openvino_notebooks) | **Intel workshop Sat 12:00.** |
| Local / sovereign LLM | [ollama/ollama](https://github.com/ollama/ollama) | "European sovereign AI" story fits the theme. |
| Browser agents | [browser-use/browser-use](https://github.com/browser-use/browser-use), [browserbase/stagehand](https://github.com/browserbase/stagehand) | |
| PDFs / documents | Send the PDF straight to Claude/Gemini as a file part | No parsing pipeline in 48 h. |

## Tier 4 — Claude Code tooling (installed in `.claude/`)
| Repo | What |
|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | Ten skills copied into `.claude/skills/` (MIT): `grill-me`, `grilling`, `grill-with-docs`, `prototype`, `tdd`, `diagnosing-bugs`, `research`, `domain-modeling`, `codebase-design`, `handoff`. |
| [obra/superpowers](https://github.com/obra/superpowers) | Brainstorming, TDD, systematic debugging, plan writing. `/plugin marketplace add obra/superpowers`. |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Index of commands, skills, hooks. |

## Anti-patterns for a 48‑hour hack
- Monorepos, microservices, custom auth, GraphQL, Kubernetes.
- Designing a DB schema before the demo path is clear. Start in-memory / JSON; add Supabase only when persistence is part of the demo.
- Native builds (mobile, desktop) unless they are the product.
- Training a model. Fine‑tune only on Modal with a notebook you have run before.
