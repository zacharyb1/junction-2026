# Junction 2026: Mastra feasibility spike (run, not read)

Run Fri 2026-11-13 21:37:41 to 21:50:10 EET (12.5 minutes including writing these notes; the last command finished at 21:48:47; limit was 30). Everything below marked "observed" was produced by running a command on this machine (Fedora, Node v24.18.0, npm 11.16.0). No API keys were used or looked for; no real LLM call was made; the model was Mastra's own scripted mock. No browser was used (curl only).

Spike code (left in place): a throwaway folder outside this repo (not kept)

## Verdict

| Criterion | Status | Evidence |
| - | - | - |
| (a) Scaffold to booted server with chat UI under 15 minutes | observed, with one gap | Install start 21:37:46, `mastra dev` answering on :4111 at about 21:43:25 (5.7 min, of which 3.7 min was a failed npm download). `GET http://localhost:4111/` returned 200 with `<title>Mastra Studio</title>`. Gap: the Studio chat screen was not opened in a browser, so "chat works in the UI" is not observed; the REST routes behind it were. |
| (b) Exa MCP tool call works, keyless | observed | `MCPClient` to `https://mcp.exa.ai/mcp` with no key listed 2 tools in 1.6 s; one `web_search_exa` call returned results in 612 ms. |
| (c) Approval round trip | observed | `tool-call-approval` chunk emitted; `approveToolCall` ran the tool and finished; `declineToolCall` did not run it; both also worked from a different OS process and over REST. |
| (d) Per-user memory isolation | observed | Two resources saw only their own thread history; using another resource's thread id threw in code and returned HTTP 403 over REST. |
| (e) Nothing needed install scripts or unpinned latest | observed, with one caveat | `--before=2026-11-06 --ignore-scripts` install worked with no exception. Caveat: `mastra build` runs its own `npm install` without those flags (see Gotcha 4); its result matched the pinned tree 200/200 in three builds. |

## Resolved versions (pin these)

Installed with `--before=2026-11-06T00:00:00Z`, read from `node_modules/*/package.json`:

| Package | Version |
| - | - |
| `@mastra/core` | 1.82.0 |
| `mastra` (CLI) | 1.38.0 |
| `@mastra/mcp` | 2.8.0 |
| `@mastra/libsql` | 1.29.0 |
| `@mastra/memory` | 1.41.0 |
| `@mastra/deployer` (transitive) | 1.82.0 |
| `@mastra/server` (transitive) | 1.82.0 |
| `@mastra/schema-compat` (transitive) | 1.3.17 |
| `@mastra/loggers` (transitive) | 1.3.10 |
| `zod` | 4.6.7 |
| `ai` | 7.0.163 (installed, ended up unused; can be dropped) |
| `typescript` | 7.0.2 |
| `@types/node` | 26.6.6 |
| `@libsql/client` / `libsql` (transitive) | 0.18.0 / 0.5.29 |
| `hono` / `esbuild` / `rollup` (transitive) | 4.13.16 / 0.28.2 / 4.67.5 |

Version gap: the docs describe `@mastra/core` 1.83.0 (published today); the pin gives 1.82.0 (one minor behind, dated 2026-11-04 in the earlier notes). No API I used differed from the docs. `package.json` was written by npm with caret ranges (`^1.82.0`); the lockfile is what pins. For the real repo use exact versions or commit `package-lock.json` and install with `npm ci`.

Install scripts: the root lock (489 entries) flags two packages with install scripts, `esbuild@0.28.2` (`node install.js`) and `fsevents@2.3.3` (macOS only). Both were skipped; `mastra dev`, `mastra build`, tsx and LibSQL all worked without them (esbuild and libsql load prebuilt binaries from `@esbuild/linux-x64` and `@libsql/linux-x64-gnu`). No exception was needed.

## Commands run and timings

```bash
cd <spike dir>            # package.json with { "type": "module" } written by hand, no `npm create mastra`
npm install --before=2026-11-06T00:00:00Z --ignore-scripts \
  @mastra/core mastra zod typescript @types/node @mastra/mcp @mastra/libsql @mastra/memory ai
npx tsc --noEmit
MASTRA_TELEMETRY_DISABLED=1 npx mastra dev
MASTRA_TELEMETRY_DISABLED=1 npx mastra build            # and: npx mastra build --studio
node .mastra/output/index.mjs
npx tsx scripts/exa.ts https://mcp.exa.ai/mcp search '{"query":"...","numResults":3,"objective":"..."}'
SPIKE_DB_URL="file:$PWD/spike.db" npx tsx scripts/approval.ts inproc|start <tag>|approve <tag>|decline <tag>|list
SPIKE_DB_URL="file:$PWD/spike.db" npx tsx scripts/memory.ts
env -i PATH="$PATH" HOME="$HOME" npx tsx scripts/models.ts
```

`tsx` is not a direct dependency; it is present in `node_modules/.bin` transitively. Add it explicitly if scripts depend on it.

| Step | Wall clock | Observed |
| - | - | - |
| npm install, attempt 1 | 223.6 s, failed | `npm error code ETIMEDOUT`, `network read ETIMEDOUT`; the log shows single tarballs taking 150 to 178 s (`@mastra/core-1.82.0.tgz` 153 s). 871 fetches had completed. |
| npm install, attempt 2 (warm cache, `--fetch-retries=5 --fetch-timeout=120000 --maxsockets=8` added) | 4.8 s | "added 412 packages"; "9 vulnerabilities (2 low, 7 moderate)" from npm audit. A clean cold install time was therefore not measured. |
| node_modules size | | 431 MB |
| Writing the 4 source files + tsconfig | about 1 min | |
| `tsc --noEmit` (TypeScript 7.0.2) | 0.48 s | |
| `mastra dev` cold start, to first 200 on `/api/agents` | 7.6 s | CLI printed "mastra 1.38.0 ready in 1035 ms", "Studio: http://localhost:4111", "API: http://localhost:4111/api" |
| Hot reload | 4.7 s | Edited the agent's `instructions`; `GET /api/agents` showed the new text 4.7 s after the save, no restart |
| `mastra build` | 12.3 s | `.mastra/output/index.mjs`, output directory 232 MB (it has its own `node_modules`) |
| `mastra build --studio` | 9.8 s | |
| `node .mastra/output/index.mjs` start | 1.07 s | "Mastra API running { url: 'http://localhost:4111/api' }" |

Port 4111 was free before each start and after each stop. Processes started: `mastra dev` (one process group) and `node .mastra/output/index.mjs` three times; all were killed by PID/PGID, none left running.

## 1. Scaffold and boot (observed)

Layout:

```
package.json  tsconfig.json  .npmrc
src/mastra/index.ts
src/mastra/agents/proposal-agent.ts
src/mastra/tools/submit-proposal.ts
src/mastra/mock-model.ts
scripts/{exa,approval,memory,models}.ts
```

`tsconfig.json` compiler options that worked: `target ES2022`, `module ES2022`, `moduleResolution bundler`, `strict`, `skipLibCheck`, `noEmit`, `types: ["node"]`, `allowImportingTsExtensions`.

```ts
// src/mastra/index.ts
export const mastra = new Mastra({
  agents: { proposalAgent },
  storage: new LibSQLStore({ id: 'spike-storage', url: process.env.SPIKE_DB_URL ?? 'file:./mastra.db' }),
});
// src/mastra/agents/proposal-agent.ts
export const proposalAgent = new Agent({
  id: 'proposal-agent', name: 'Proposal Agent', instructions: '...',
  model: mockModel,                       // real: 'google/<gemini-model-id>'
  tools: { submit_proposal: submitProposal },
  memory: new Memory({ options: { lastMessages: 20 } }),
});
```

Dev server on port 4111:
- `GET /` 200 `text/html`, `<title>Mastra Studio</title>` (Studio is at `http://localhost:4111`, agent pages under `/agents`).
- `GET /api/agents` 200, lists `proposal-agent` with the tool's JSON schema.
- `GET /swagger-ui` 200, `GET /api/openapi.json` 200 (3.2 MB, 367 paths), `GET /health` 200.

Built server (`mastra build`, then `node .mastra/output/index.mjs`), also port 4111:
- `GET /api/agents` 200; generate worked and read a thread written earlier by another process.
- `GET /` 200 but the page is `<title>Mastra Server</title>`, not Studio; `/swagger-ui` and `/api/openapi.json` return 404.
- With `mastra build --studio` the built server logs "Studio available { url: 'http://localhost:4111' }" and `GET /` returns `<title>Mastra Studio</title>`.

## 2. Exa over MCP, keyless (observed)

```ts
const mcp = new MCPClient({ id: 'exa', servers: { exa: { url: new URL('https://mcp.exa.ai/mcp') } }, timeout: 30000 });
const tools = await mcp.listTools();          // keys are prefixed: exa_web_search_exa, exa_web_fetch_exa
const res = await tools.exa_web_search_exa.execute({ query, numResults: 3, objective }, {});
await mcp.disconnect();
```

Calls made: 4 MCP sessions (connect + list tools), 1 remote search. No 403 or 429 was seen.

- Default URL, no key: `exa_web_search_exa`, `exa_web_fetch_exa`.
- `?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`, no key: `exa_web_search_advanced_exa` is listed as well. It was not executed, so whether it runs keyless is not observed.
- Input schemas (from `tool.inputSchema['~standard'].jsonSchema.input({ target: 'draft-07' })`; `z.toJSONSchema(tool.inputSchema)` fails because it is not a zod object):
  - `web_search_exa`: `query` string (required), `objective` string 1 to 4096 chars (required), `numResults` number (default 10). `additionalProperties: false`.
  - `web_fetch_exa`: `urls` string[] (required), `maxCharacters` number (default 3000).
  - `web_search_advanced_exa`: `query`, `numResults` (1 to 100), `type` (`auto|lite|fast|instant`), `category` (`company|publication|news|pdf|github|personal site|people|financial report`), `includeDomains`, `excludeDomains`, `startPublishedDate`, `endPublishedDate`, `startCrawlDate`, `endCrawlDate`, `includeText`, `excludeText`, `userLocation`, `moderation`, `additionalQueries`, `textMaxCharacters`, and more (output was cut).
- Result shape of the search: `{ content: [ { type: 'text', text: '...' } ] }`. The only top-level key is `content`; there is no structured JSON. The text is one blob of blocks separated by `---`, each with lines `Title:`, `URL:`, `Published:`, `Author:`, `Highlights:` followed by excerpt paragraphs joined with `...`. So URL, title, published date and highlights are present, but as text that we must parse ourselves if `sources[]` needs to be structured.
- The `Published:` value was `2010-02-01T00:00:00.000Z` on both results I read, one of which is a Kela news page about a change on 1 April 2026. Do not trust that field as the publication date.
- I printed the first 3,500 characters, which covered two results; I did not confirm the third.

## 3. Approval round trip with a mock model (observed)

Mock: `MastraLanguageModelV2Mock` from `@mastra/core/test-utils/llm-mock` (shipped in the package), with `doGenerate`/`doStream` functions that read `options.prompt`: a user message containing "propose" yields a `tool-call` for `submit_proposal`; a trailing `tool` message yields text; anything else echoes the user messages it can see. Wiring it took a few minutes; nothing blocked.

```ts
export const submitProposal = createTool({
  id: 'submit_proposal',
  description: '...',
  inputSchema: z.object({
    summary: z.string(),
    sources: z.array(z.object({ url: z.string().url(), title: z.string() })),
    nextStep: z.string(),
  }),
  outputSchema: z.object({ submitted: z.boolean(), at: z.string() }),
  requireApproval: true,
  execute: async input => { /* appends a line to tool-exec.log */ return { submitted: true, at }; },
});

const stream = await agent.stream('Please propose something', { memory: { resource, thread } });
for await (const chunk of stream.fullStream) { if (chunk.type === 'tool-call-approval') approval = chunk.payload; }
const next = await agent.approveToolCall({ runId: stream.runId, toolCallId: approval.toolCallId });
// or: agent.declineToolCall({ runId, toolCallId, reason: 'User said no' })
```

Observed chunk sequences:
- First stream: `start, step-start, tool-call, tool-call-approval`, then the stream ends. Approval payload: `{ toolCallId, toolName: 'submit_proposal', args: {summary, sources, nextStep}, resumeSchema }`.
- After `approveToolCall`: `tool-call-resumed, tool-result, step-finish, step-start, text-start, text-delta, text-end, step-finish, finish`. `tool-exec.log` gained one line, and the model's next prompt contained the tool output `{submitted: true, at}`.
- After `declineToolCall`: `tool-call-resumed, tool-output-denied, step-finish, step-start, text-start, text-delta, text-end, step-finish, finish`. The tool did not run; the model received the reason text ("User said no") as the tool result.

State in the LibSQL file (observed): process 1 started two runs and exited; a new process listed both with `agent.listSuspendedRuns()` (`status: 'suspended'`, `threadId`, `resourceId`, `toolCalls[].args`); a third process approved one (tool ran once), a fourth declined the other (tool did not run); the list was then empty. Approving the finished run again threw `MastraError` id `AGENT_RESUME_NO_SNAPSHOT_FOUND` ("could not find a suspended run for runId ... The run has already finished") and the tool did not run a second time.

Over REST on `mastra dev` (observed):

```bash
B=http://localhost:4111/api/agents/proposal-agent
curl -N -X POST $B/stream -H 'content-type: application/json' \
  -d '{"messages":"please propose","memory":{"resource":"rest-u1","thread":"rest-t2"}}'
# content-type: text/event-stream; lines "data: {json}", last line "data: [DONE]"
# data: {"type":"tool-call-approval","runId":"a6c6...","from":"AGENT","payload":{"toolCallId":"call-1","toolName":"submit_proposal","args":{...},"resumeSchema":"..."}}
curl $B/suspended-runs                      # {"runs":[{"runId":...,"status":"suspended","threadId":"rest-t2","resourceId":"rest-u1",...}]}
curl -N -X POST $B/approve-tool-call -H 'content-type: application/json' -d '{"runId":"<id>","toolCallId":"call-1"}'
curl -N -X POST $B/decline-tool-call -H 'content-type: application/json' -d '{"runId":"<id>","toolCallId":"<id>","reason":"no thanks"}'
```

Approve streamed `tool-call-resumed, tool-result, ..., finish` and the tool log gained exactly one line; decline streamed `tool-call-resumed, tool-output-denied, ..., finish` with "no thanks" in the model's input and no new log line; `suspended-runs` was empty afterwards. This settles an open point from the earlier notes: `/stream` is SSE.

Routes present in 1.82.0's OpenAPI (not all tested): `approve-tool-call`, `decline-tool-call`, `approve-tool-call-generate`, `decline-tool-call-generate`, `send-tool-approval`, `resume-stream`, `suspended-runs`, `threads/subscribe`. Not tested: `send-tool-approval`, `suspend()`/`resumeStream()` inside a tool, per-request `requireToolApproval`, and the non-streaming `approveToolCallGenerate`.

## 4. Per-user memory (observed)

Type, `node_modules/@mastra/core/dist/agent/types.d.ts:996`:

```ts
export type AgentMemoryOption = {
    thread: string | (Partial<StorageThreadType> & { id: string });
    resource?: string;
    options?: MemoryConfigInternal;
    onTitleGenerated?: (title: string) => void | Promise<void>;
};
```

Call shape in code: `agent.generate(msg, { memory: { resource: 'user-a', thread: 'a-1' } })`, same option on `agent.stream`. Over REST: body `{"messages": "...", "memory": {"resource": "...", "thread": "..."}}` on `/generate` and `/stream`.

Mock model output (it echoes every user message present in its prompt):

```
[user-a/a-1] "My secret is ALPHA"      -> SEEN_USER_MESSAGES=["My secret is ALPHA"]
[user-a/a-1] "Second message from A"   -> SEEN_USER_MESSAGES=["My secret is ALPHA","Second message from A"]
[user-b/b-1] "Hello from B"            -> SEEN_USER_MESSAGES=["Hello from B"]
[user-b/b-1] "Second message from B"   -> SEEN_USER_MESSAGES=["Hello from B","Second message from B"]
[user-b/a-1] "B tries to read thread of A" -> Error: Thread "a-..." belongs to resource "user-a" but resource "user-b" was provided.
[user-a/a-2] "A in a new thread"       -> SEEN_USER_MESSAGES=["A in a new thread"]
```

REST: same thread, other resource returned HTTP 403 `{"error":"Access denied: thread belongs to a different resource"}`. The built server later read thread `a-1` from the same LibSQL file and saw all earlier messages.

Limits of this test: only message history was tested (`lastMessages: 20`). A new thread of the same user starts empty; cross-thread memory for one user needs working memory or semantic recall, which were not tested. No auth was configured, so the server accepted whatever `resource` the caller sent; isolation between real users still depends on our backend setting the resource id.

## 5. Gemini wiring (no calls made)

File: `node_modules/@mastra/core/dist/provider-registry.json` (222 providers).

- Model string: `google/<model-id>`. Entry `google`: `apiKeyEnvVar: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]`, `gateway: "models.dev"`, 37 models.
- Model ids listed: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-pro-preview-customtools`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-4-argon`, `gemini-4-carbon`, `gemini-4-hydrogen`, `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-pro-latest`, `gemma-4-26b-a4b-it`, `gemma-4-31b-it`, plus image, TTS, live, embedding, deep-research and lyria ids.
- Other entries read: `openai` `OPENAI_API_KEY`; `anthropic` `ANTHROPIC_API_KEY`; `openrouter` `OPENROUTER_API_KEY`, `https://openrouter.ai/api/v1`; `nvidia` `NVIDIA_API_KEY`, `https://integrate.api.nvidia.com/v1`.
- OpenAI-compatible endpoint, type `OpenAICompatibleConfig` in `node_modules/@mastra/core/dist/llm/model/shared.types.d.ts:24`: `{ id: 'provider/model', url?, apiKey?, headers?, api?: 'chat' | 'responses' }` or `{ providerId, modelId, url?, apiKey?, headers?, api? }`. So `apiKey` together with `url` is allowed by the type (open point in the earlier notes).
- Observed with a clean environment (`env -i`, no keys): `new Agent({ model })` then `agent.getModel()` succeeded for `'google/gemini-3.8-flash'`, `'google/not-a-real-model'`, `{ id: 'custom/my-model', url: 'http://127.0.0.1:9/v1', apiKey: 'dummy', headers }` and `{ id: 'openai/whatever', url, apiKey }`; each returned a `ModelRouterLanguageModel` with the expected `provider` and `modelId`. Resolution is lazy: a missing key or a wrong model id is not reported until the first call. No request was sent, so a real Gemini call remains untested.

## 6. Errors hit and fixes

| Error | Fix |
| - | - |
| `npm error code ETIMEDOUT ... network read ETIMEDOUT` after 223.6 s on the first install | Re-ran the same command with `--fetch-retries=5 --fetch-timeout=120000 --maxsockets=8`; finished in 4.8 s from the warm cache |
| `error TS2591: Cannot find name 'process'` / `Cannot find name 'node:fs'` with TypeScript 7.0.2 although `@types/node` was installed | Added `"types": ["node"]` to `tsconfig.json` |
| `z.toJSONSchema(tool.inputSchema)` on an MCP tool: "Cannot read properties of undefined (reading 'def')" | The schema is a Standard Schema wrapper; use `tool.inputSchema['~standard'].jsonSchema.input({ target: 'draft-07' })` |
| Exa search rejected locally in 16 ms: "Tool input validation failed for exa_web_search_exa ... must have required property 'objective'" | Pass `objective` as well as `query` |
| `MastraError AGENT_RESUME_NO_SNAPSHOT_FOUND` when approving a run a second time | Expected; catch it in the approval endpoint and treat it as "already handled" |

## Gotchas for a team starting now

1. Pin by lockfile and add a project `.npmrc` with `before=2026-11-06T00:00:00Z` and `ignore-scripts=true`. `typescript@latest` under that date is 7.0.2 and needs `"types": ["node"]`.
2. A relative LibSQL URL is resolved against the dev server's working directory: `file:./mastra.db` created `src/mastra/public/mastra.db`, and `mastra build` then copied that database into `.mastra/output/` ("Copying public files"). Use an absolute path from an env var, and keep the db out of `src/`.
3. Exa's MCP search needs `objective`, returns one text blob rather than structured fields, and its `Published:` line was wrong on the results seen. Parse `Title:` / `URL:` lines ourselves and do not show the date as fact.
4. `mastra build` runs `npm install --audit false --fund false --loglevel error --progress false --update-notifier false` inside `.mastra/output` (argv read from the npm log): no `--before`, no `--ignore-scripts`. It copies the project `.npmrc` into the output directory (verified: the two lines above arrived there), and in all three builds its lockfile had 200 entries all identical to the pinned tree, with no install-script packages.
5. A plain `mastra build` has no Studio and no Swagger; use `mastra build --studio` if the demo should show Studio from the built server. For the demo, `mastra dev` is enough and reloads in about 5 s.
6. Model strings are not checked when the agent is created; a typo in `google/<id>` or a missing `GOOGLE_API_KEY` appears only on the first request.
7. Over REST the caller chooses `memory.resource`; with no `server.auth` anyone can pass any user id.

## Not done

- Studio's chat and tool-call inspection were not exercised in a browser (only the HTML title and the REST API were checked).
- `npm create mastra` was not tried; the project was scaffolded by hand.
- No real model call; Gemini and custom-endpoint wiring checked from the registry file, the type definition and lazy resolution only.
- Exa: the advanced tool and `web_fetch_exa` were not executed; rate limits were not probed; MCP tools were called directly, not through an agent (`tools: await mcp.listTools()` untested).
- Not tested: `send-tool-approval`, `suspend()`/`resumeStream()`, `requireToolApproval`, generate-mode approval, working memory, semantic recall, auth, podman/container, a clean cold `npm install` time.
- `MASTRA_TELEMETRY_DISABLED=1` was set for every `mastra` command as a precaution; whether telemetry is sent without it was not checked.
