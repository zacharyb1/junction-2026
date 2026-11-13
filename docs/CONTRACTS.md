# Contracts between the pieces

One page so the bot, the web app, the eval harness and the UI can be built in parallel.
If you change something here, change it in `src/lib/case.ts` or `src/lib/engine/` in the same commit.

## Pieces

| Piece | Lives in | Talks to |
|---|---|---|
| Research engine | `src/lib/engine/`, Next.js on Vercel | Exa API |
| Case store and verifier | `src/lib/cases.ts`, `src/lib/verify.ts`, `src/lib/store.ts` | Vercel Blob, Exa Contents |
| MCP server | `src/app/api/mcp/route.ts` | called by Hermes |
| REST API | `src/app/api/research`, `src/app/api/cases` | called by the eval harness, the `/try` page, scripts |
| Bot, track A | Hermes Agent with `hermes/` config and skills (Vlad) | Telegram, MCP server |
| Bot, track B | Hono server with a Mastra agent (Milan) | Telegram, REST API or MCP server |
| Pages | `/` landing, `/try` web demo, `/c/[id]` case file | REST API, store |

Design decision (Fri 21:00): the research runs **in the web app**, not inside the chat model.
The bot calls one tool, `research_case`, and gets back a finished, verified case.
Reasons: Exa calls run in parallel on the server so the plan arrives in about 8 seconds, the flow is the same every time,
judges without Telegram can use the same engine at `/try`, and the bot runtime can be Hermes or Mastra without changing anything here.

## Auth

- Bot and scripts: `Authorization: Bearer <CASEFILE_SECRET>`.
- Public web demo: header `x-demo-code: <DEMO_ACCESS_CODE>`, rate limited. The code is in the QR link on our table.
- Reading a case needs nothing. The id is 16 random characters.

## `POST /api/research` and MCP tool `research_case`

Request body, same fields for both:

```json
{
  "situation": "We are expecting a baby, due in May. Both of us work full time.",
  "country": "FI",
  "region": "Espoo",
  "language": "en",
  "household": "Anna (employee at a software company), Mikko (employee). Both residents of Finland.",
  "document": "optional: text of a letter the family shared, as read by the vision model",
  "depth": "fast"
}
```

- `situation` required, 10 to 1500 characters, in the user's own words.
- `country` required: ISO 3166-1 alpha-2 code or a country name in English, Finnish or Swedish. An unknown country returns 400, it is never guessed.
- `region`, `language` (default `en`), `household`, `document` optional.
- `depth`: `fast` (default, about 6 to 12 seconds) or `deep` (a fourth question and Exa deep search, slower). `deep` needs the bot secret. With the public demo code the request runs as `fast`.
- A step in the stored case can carry `conflict`: a sentence naming two different figures and their citation numbers.
- Write `situation` in English when you can. Finnish and other languages work too.

Response `200`:

```json
{
  "id": "3C5sH6YwQzT-lhBd",
  "url": "https://junction-2026.vercel.app/c/3C5sH6YwQzT-lhBd",
  "title": "Expecting a baby: what to do and when",
  "plan": [
    "Book the maternity clinic check-up before the end of month 4 [1]",
    "Apply for the maternity grant 2 months before the due date [3]"
  ],
  "evidenceTotal": 6,
  "evidenceVerified": 6,
  "unverified": ["…"],
  "openQuestions": ["…"],
  "ms": 8122,
  "timings": { "searchMs": 5866, "readMs": 1620, "verifyMs": 149 },
  "exa": { "searches": 3, "contents": 5, "costDollars": 0.021 },
  "readers": { "live": 4, "exa": 5, "oxylabs": 0 },
  "jurisdiction": { "country": "Finland", "region": "Espoo", "officialDomains": 29 }
}
```

- `plan`: at most 5 short lines, ready to paste into a chat message. Numbers in brackets are citation numbers on the case page.
- Lines whose quote failed verification are not in `plan`. They appear under `unverified`.
- Errors: `400` invalid input, `401` missing or wrong credentials, `429` rate limited, `502` Exa failed, each with `{ "error": "…" }`.

Streaming for the `/try` page: send `Accept: text/event-stream`. Events, each with a JSON `data` line:
`stage` `{ "name": "plan" | "search" | "read" | "verify" | "publish", "detail": "…" }`,
`source` `{ "url": "…", "title": "…" }`, then `done` with the response object above, or `error`.

## Calling the engine from any bot (Hono, Mastra, anything)

The engine is one HTTP call. No Exa SDK or key is needed in the bot for case research.

```bash
curl -sS -X POST "$CASEFILE_URL_BASE/api/research" \
  -H "Authorization: Bearer $CASEFILE_SECRET" -H "content-type: application/json" \
  -d '{"situation":"We are expecting a baby, due in May.","country":"FI","region":"Espoo","language":"en"}'
```

```ts
// One function to wrap as the agent's tool. Allow up to 60 seconds.
export async function researchCase(input: {
  situation: string;
  country: string;
  region?: string;
  language?: string;
  household?: string;
  document?: string;
}) {
  const res = await fetch(`${process.env.CASEFILE_URL_BASE}/api/research`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CASEFILE_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `research failed (${res.status})`);
  return body as {
    url: string;
    title: string;
    plan: string[];
    evidenceVerified: number;
    evidenceTotal: number;
    unverified: string[];
    openQuestions: string[];
  };
}
```

What the bot posts after the call: the `plan` lines unchanged, one line "`evidenceVerified` of `evidenceTotal` quotes checked on their pages", then `url`.
If the agent framework speaks MCP, point it at `$CASEFILE_URL_BASE/api/mcp` with the same Authorization header instead. The tools are listed below.

`CASEFILE_URL_BASE` is the site origin, for example `https://junction-2026.vercel.app`. The values are in `.env.bot` (not committed).

## Case tools

MCP tools on the same server, REST equivalents in brackets:

| Tool | Input | Returns |
|---|---|---|
| `case_publish` (`POST /api/cases`) | a full case, see `CaseInput` in `src/lib/case.ts` | id, url, verified counts, failed citation numbers |
| `case_update` (`PATCH /api/cases/:id`) | `{ id, patch }`, see `CasePatch` | same as publish |
| `case_get` (`GET /api/cases/:id`) | `{ id }` | the stored case with a verification mark per source |
| `case_recheck` (`POST /api/cases/:id`) | `{ id }` | `{ id, changed: number[], unreachable: number[], url }`. `changed`: the sentence is gone from a page that still opens. `unreachable`: the page did not open this time, the last confirmed state is kept. Stay silent when `changed` is empty |

`case_update` changes only the fields you send. A step is matched by its title, a money line by its label, evidence by `n`.
A quote last confirmed on a live reading must still be on a live reading at re-check, whatever Exa's older copy says.

Verification marks on each evidence item: `verified`, `not_found`, `unreachable`, plus `match` from 0 to 1
and `checkedVia`: `live` (our own request to the page), `oxylabs` (a live read through the Oxylabs Web API,
for pages that refuse our request) or `exa` (Exa's reading of the page).

## Page readers

Finding is always Exa. Reading a cited page to check a quote can go three ways:

| Reader | When | Call |
|---|---|---|
| Our own request | always | plain HTTPS GET from the server |
| Exa Contents | always, in one batch | `POST https://api.exa.ai/contents` |
| Oxylabs Web API | only when our own request was refused, and only if `OXYLABS_API_KEY` is set | `POST https://webapi.oxylabs.io/v1/scrape` with `{ "url": "...", "output": ["markdown"] }` |

In fast research the Oxylabs read is spent only on pages nothing else could open. In deep research and in `case_recheck`
every refused page gets a live Oxylabs read. The research trail on the case page records it.
Not yet run against the real Oxylabs API: it was tested against a local stand-in shaped like their documented response.

## What the bot does and does not do

The bot (Hermes) owns: reading the chat, staying silent, the acknowledgement, calling `research_case`,
posting the plan and link, approval buttons, writing drafts, `case_update`, reminders, the daily `case_recheck`.

The bot does not do the research itself unless `research_case` fails. Fallback: Exa MCP tools plus `case_publish`.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `EXA_API_KEY` | Vercel, Hermes `.env` | engine and verifier, Hermes web search |
| `CASEFILE_SECRET` | Vercel, Hermes `.env` | bot and script writes |
| `DEMO_ACCESS_CODE` | Vercel | public `/try` access |
| `DEMO_RATE_PER_MINUTE` | Vercel, optional | public requests per client address per minute, default 20 (a venue shares one address) |
| `DEMO_RATE_TOTAL_PER_MINUTE` | Vercel, optional | all public requests per minute, default 40 |
| `OXYLABS_API_KEY` | Vercel, optional | third page reader for sites that refuse our request |
| `BLOB_READ_WRITE_TOKEN` | Vercel, set by the Blob store | case storage |
| `PUBLIC_BASE_URL` | Vercel, optional | overrides the origin used in case links |
| `NEXT_PUBLIC_BOT_USERNAME` | Vercel | QR code and links to the Telegram bot |
| `NEXT_PUBLIC_SAMPLE_CASE_ID` | Vercel | sample case linked from the landing page |
| `NEXT_PUBLIC_REPO_URL` | Vercel, optional | source link in the landing page footer |
