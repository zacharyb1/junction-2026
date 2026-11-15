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
| Daily source re-check | `src/app/api/cron/recheck`, scheduled in `vercel.json` | called by Vercel Cron, reads the store and the cited pages |
| Bot, track A | Hermes Agent with `hermes/` config and skills (Vlad) | Telegram, MCP server |
| Bot, track B | Hono server with a Mastra agent (Milan) | Telegram, REST API or MCP server |
| Pages | `/` landing, `/try` web demo, `/c/[id]` case file | REST API, store |

Design decision (Fri 21:00): the research runs **in the web app**, not inside the chat model.
The bot calls one tool, `research_case`, and gets back a finished, verified case.
Reasons: Exa calls run in parallel on the server so the plan arrives in about 8 seconds, the flow is the same every time,
judges without Telegram can use the same engine at `/try`, and the bot runtime can be Hermes or Mastra without changing anything here.

## Auth

- Bot and scripts: `Authorization: Bearer <CASEFILE_SECRET>`.
- Public web demo: header `x-demo-code: <DEMO_ACCESS_CODE>`, rate limited. The code is in the QR link on our table. A deployment that sets `DEMO_OPEN=1`, as the server does, answers every visitor without the code and ignores one that is sent; the rate limit, with its cap for a whole day, then protects the Exa credit.
- Reading a case needs nothing. The id is 16 random characters.
- Asking for a source re-check from the case page (`POST /api/cases/:id/check`) needs nothing either. It is rate limited and reads a case at most once in 10 minutes.
- The daily job: `Authorization: Bearer <CRON_SECRET>`, which Vercel sends to cron routes. The bot secret works too.

Limits on public requests (`src/lib/rate-limit.ts`): 20 a minute per client address and 40 a minute in total, counted per
server instance, shared by the demo, the source re-check and new audio. Requests with the bot secret are not counted.
The client address comes from a header the caller cannot write: on Vercel `x-vercel-forwarded-for` (set by the platform),
elsewhere the last entry of `x-forwarded-for`, which the nearest reverse proxy appends. With no proxy in front, as in
local development, that header is the caller's own, and only the total limit holds.

A JSON body larger than 1 MB is not read and is answered `400` like any other invalid input.

Every response carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` (a case link is a secret, so
other sites never see it), `X-Frame-Options: DENY` with `Content-Security-Policy: frame-ancestors 'none'`, and a
`Permissions-Policy` that turns off camera, location, payment and USB and allows the microphone to the site's own
pages only, because `/chat` records voice notes (`next.config.ts`).

## Telegram context and work notices

The `kaveri-gate` plugin runs before Hermes dispatch. It uses the pinned gateway's authorization check before collecting Telegram group text. Pending context is separate for each platform, profile, chat and topic. It holds at most eight messages, 4,000 text characters total, 1,000 per message, for 30 minutes, across at most 128 scopes. Bot messages, internal events and commands are excluded.

When a message wakes the bot, earlier pending text enters Hermes through its native `channel_context` field as quoted background. The triggering text, sender and approval routing stay unchanged. Current corrections take precedence; quoted background never grants approval. The pending buffer is in process memory only; once forwarded, its contents become part of normal Hermes conversation history. `/new` and `/reset` clear pending context for that topic. “Forget everything” clears pending context across that chat's topics and reaches the bot to remove labelled household memory and reminders. These operations leave other chats alone.

On the first `research_case`, `find_products` or `case_recheck` call in a Telegram turn, the plugin attempts one short start notice through Hermes' session-bound `post_message` API. It never selects a different recipient. Delivery is best effort: a failed or slow Telegram send does not prevent research, and an uncertain send is not retried. Web/CLI calls do not get this notice.

The notice uses Finnish when the tool supplies `language: fi`, otherwise English. Product searches and source rechecks currently use that English fallback because their tool schemas carry no language field; the model's result still follows the conversation language.

The sourced plan or product results are the completion message, posted before `clarify` offers next actions. Telegram interim messages stay enabled so the result appears before a button prompt waits for an answer. A failed tool result produces an explicit failure, not a success notice. Drafts can be prepared autonomously; sending, filing, booking and payment still require the existing approval boundary. The bot's submission-route check in `life-event-butler` governs notices, applications and claims: a letter/email requires evidence that written correspondence is accepted. A required official form or portal is linked instead. Optional preparation notes use explicit `kind: checklist`, which creates no send proposal; an unknown route is reported as a gap. This is a model instruction, not an Engine guarantee about a document's legal validity.

The live acceptance procedure is [Telegram demo](TELEGRAM_DEMO.md). Isolated model or container checks do not establish Telegram delivery.

After a successful `research_case`, a Telegram-only guard holds the returned plan lines and Case URL for that session/turn. It rejects `clarify` until those lines and that exact URL appear in visible assistant text before an accepted tool call. For the configured NVIDIA model, the synchronous response hook and matching API-request ID establish that the text reached Hermes' interim-message path; reasoning text, tool arguments, discarded responses and other turns do not count. Hermes attempts to flush its queued interim text before showing clarification buttons. This enforces emitted-message ordering with interim messages enabled, not network delivery. Providers with separate structured commentary need their own validation before this guarantee is extended to them. The guard sends no duplicate result. Its process-local cache is bounded to 1,024 turns for one hour; unrelated clarification remains unaffected, and failed research creates no new guard.

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
  "evidence": [
    {
      "n": 1,
      "url": "https://www.espoo.fi/en/hello-espoo-welcome-espoo/pregnancy-and-life-baby",
      "title": "Pregnancy and life with a baby | City of Espoo",
      "quote": "When the pregnancy is confirmed, please book an appointment at a maternity clinic.",
      "sourceType": "official",
      "verification": "verified",
      "checkedVia": "live"
    }
  ],
  "evidenceTotal": 6,
  "evidenceVerified": 6,
  "unverified": ["…"],
  "openQuestions": ["…"],
  "ms": 8122,
  "timings": { "searchMs": 5866, "readMs": 1620, "verifyMs": 149 },
  "exa": { "searches": 4, "contents": 5, "costDollars": 0.028 },
  "readers": { "live": 4, "exa": 5, "oxylabs": 0 },
  "jurisdiction": { "country": "Finland", "region": "Espoo", "officialDomains": 29 },
  "news": [
    { "url": "https://www.kela.fi/news/...", "title": "Government proposes an increase to the maternity grant", "date": "2026-08-21", "publisher": "Kela" }
  ]
}
```

- `news`: up to three pages the official sites published or updated in the last four months on the case topic, found by one more Exa search. They are pointers for the family to read, stored on the case and shown on the case page under "New on official sites". They are not checked sentence by sentence and never feed the plan. Empty for choice questions and when nothing matched.
- A message with nothing to research (small talk, gibberish) answers `422` with a sentence a person can act on. An unknown country answers `400`. Neither creates a case.

- `plan`: at most 5 short lines, ready to paste into a chat message. Numbers in brackets are citation numbers on the case page.
- Lines whose quote failed verification are not in `plan`. They appear under `unverified`.
- `evidence`: the sentence behind every citation number of the case, so a client can show the quote under the plan line
  it supports without loading the case. `quote` is the stored sentence, in the page's own words. `sourceType` is `official`
  or `secondary`. `verification` and `checkedVia` are the marks described under "Case tools"; `checkedVia` is absent
  unless the quote was verified.
- Errors: `400` invalid input, `401` missing or wrong credentials, `429` rate limited, `502` Exa failed, each with `{ "error": "…" }`.
  A fault that is not the engine's own (storage, an unexpected exception) is `500` with `{ "error": "research failed" }`;
  the detail goes to the server log, not to the caller.

Streaming for the `/try` page: send `Accept: text/event-stream`. Each event has a JSON `data` line that repeats the event
name as `type`. `ms` is the time since the research started.

| Event | Data | Sent |
|---|---|---|
| `stage` | `{ "name": "plan" \| "search" \| "read" \| "verify" \| "publish", "detail": "…", "ms": 2 }` | when a stage starts; the same lines are stored as the research trail |
| `search` | `{ "focus": "money and entitlements", "web": "official" \| "open", "status": "running" \| "done" \| "failed", "steps": 5, "pages": 4, "tookMs": 6118, "ms": 6130 }` | when one Exa search starts, and again when it returns or fails: `steps` it proposed, distinct `pages` those steps cite, and how long it took. The counts are 0 unless the status is `done`. The first search of every run is the **first look** (`focus` "first look"): Exa's lite search, back in well under a second, with `steps` 0 and `hosts`, the sites it found. It shows where the answer is being looked for and feeds nothing into the plan; `exa.searches` counts it |
| `page` | `{ "url": "…", "title": "…", "official": true, "via": "live" \| "oxylabs" \| "exa" \| "none", "ms": 7185 }` | once per cited page, as soon as it has been read. `via` is the most direct reader that opened it: our own request, a live read through Oxylabs, Exa's copy, or `none` when nothing could open it |
| `source` | `{ "url": "…", "title": "…", "official": true }` | once per cited page after all pages are read (kept for older clients; `page` says more) |
| `verified` | `{ "verified": 6, "total": 6, "ms": 8884 }` | once the case is stored: how many quotes were confirmed on their pages |
| `done` | the response object above | last event of a successful run |
| `error` | `{ "error": "…" }` | last event of a failed run |

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

`CASEFILE_URL_BASE` in the REST examples is the site origin, for example `https://junction-2026.vercel.app`. Hermes instead uses `CASEFILE_URL` with the full `/api/mcp` path. Team values live in the separate private `junction-2026-keys` repo (`bot.env`, `app.env`); `hermes/secrets.sh` writes the ignored `.hermes-local/home/.env` and, for a local Engine, `.env.local`. See [the runbook](../hermes/README.md#quick-start-the-repo-local-install).

## `POST /api/gifts`: gifts with prices from shop pages

Finds products someone can buy online for a person the family knows (issue 30). Same auth and rate limit as `/api/research`.

```json
{
  "recipient": "Mikko",
  "clues": ["his chalk bag ripped last week", "goes bouldering twice a week", "follows four climbing gyms"],
  "occasion": "2026-11-20",
  "country": "FI",
  "budget": 150
}
```

- Send either `prompt` or `clues`. `prompt` is a plain search, for example `{"prompt": "climbing chalk bag under 40 euros"}`; `recipient` is then optional and absent from the response.
- `clues`: 1 to 8, one fact each about the person; `recipient` names them.
- `occasion` optional, `YYYY-MM-DD`. With it, each product with a stated delivery time gets `late`.
- `country` default `FI`; `budget` optional, the highest price.

Response `200`:

```json
{
  "recipient": "Mikko",
  "ideas": [
    {
      "name": "Mojo Chalk Bag",
      "why": "his chalk bag ripped",
      "price": "24,90 €",
      "priceQuote": "Mojo Chalk Bag hinta 24,90 € sis. alv.",
      "url": "https://shop.example/mojo-chalk-bag",
      "shop": "shop.example",
      "delivery": "Toimitus 1-3 arkipäivässä.",
      "arrivesBy": "2026-11-18",
      "late": false,
      "image": "https://shop.example/images/mojo.jpg"
    }
  ],
  "dropped": 2,
  "attempts": 1,
  "costDollars": 0.012,
  "ms": 9400
}
```

- Each Exa search has a structured output that proposes products. A product is kept only when its URL is one product's page (not a guide, blog, category, search or front page), its price's figures are on that page and `priceQuote` is the page's own sentence; `dropped` counts the rest. At most 8 are returned.
- Any product, not only gifts: the MCP tool `find_products` (used by AIDaddy's `product-finder` skill) runs the same search.
- Fewer than 5 kept products after a search: it searches again with a different query (a prompt as written, then as a shop search, then for product pages with a price; clues all together, then one at a time) and skips pages it already returned, at most 3 searches. `attempts` says how many it took.
- `delivery` is the page's own sentence. `arrivesBy` is worked out from it (working days skip weekends) and is absent when the sentence gives no number of days. `late` is absent when either date is unknown.
- `image` is the product page's own preview image from the same Exa result (https only), absent when the page has none. `GET /api/gifts/image?url=<product url>` returns it for a product the search found (no access code: it only reads what the search stored, in memory until a restart); the `/chat` page shows it above that product link.
- Products that arrive in time come first. The bot never orders or pays: `url` is for the person to open.

## Demo call tools

AIDaddy makes a confirmed call for the person through an ElevenLabs agent. The call goes to one operator-configured test phone (Twilio), or, where no phone number is set up, rings at a web address and is answered in a browser. It does not place real orders or move money. [Setup and rehearsal](DEMO_CALLS.md).

Authenticated MCP tools:

| Tool | Input | Returns |
|---|---|---|
| `prepare_demo_call` | `{ task, preferences? }`; task max 1,200 characters, preferences max 800 | A persisted `proposed` call with id, `line` (`phone` or `browser`), exact task/preferences, recipient label, phone ending (phone line) and demo notice; or `unavailable` with missing configuration. Does not dial. |
| `start_demo_call` | `{ id, confirmed }` | Starts only a confirmed proposal for the currently configured line. Phone line: `in_progress`, `failed` or `unknown`. Browser line: `ringing` with `answerUrl`, the address where the call is answered. May return `needs_confirmation`, `needs_new_proposal`, `not_found`, `already_started`, `busy` (the hour's calls are used up; the proposal stays valid) or `unavailable`. |
| `get_demo_call` | `{ id, wait_seconds? }`; 0–60, default 0 | Stored status, optionally waiting for the provider's summary. Terminal states are `finished` or `failed`, with provider `outcome` (`success`, `failure`, `unknown`) and summary when available. A finished call is not proof of a real purchase. |

The `/call` page uses REST equivalents. They are open to the demo's visitors (`x-demo-code`, or everyone where `DEMO_OPEN=1`) on the browser line, and on the phone line only with `DEMO_CALLS_WEB=1`; otherwise they answer `503`.

| Route | Does |
|---|---|
| `POST /api/calls` `{ task, preferences? }` | `prepare_demo_call`. |
| `POST /api/calls/<id>/start` `{ "confirmed": true }` | `start_demo_call`. The visitor's button press is the confirmation. |
| `GET /api/calls/<id>` | `get_demo_call`, plus `transcript` (`[{ speaker: "aidaddy" \| "recipient", text }]`) once the call has ended. The id is the key. |
| `GET /api/calls/line/<answerId>` | For the answering page: `{ status, recipient, notice, maxSeconds }`. Never the task, preferences or result. |
| `POST /api/calls/line/<answerId>` | Answers a ringing call once: adds `signedUrl` (a one-time ElevenLabs conversation link) and `dynamicVariables` for the agent. Later calls return the state without a link. |

Confirmation in the chat is conversational: the runtime must show the exact proposal and wait for a new Yes before passing `confirmed: true`. It is not an independently authenticated human approval endpoint. The full phone number and provider conversation ID stay in private `.data/demo-calls`. An exclusive persisted claim prevents starting the same proposal twice, and a second one prevents answering it twice; an uncertain provider response is never automatically redialed. Setup remains opt-in, and web chat tools require the additional `KAVERI_DEMO_CALLS=1` setting.

## Case tools

MCP tools on the same server, REST equivalents in brackets:

| Tool | Input | Returns |
|---|---|---|
| `case_publish` (`POST /api/cases`) | a full case, see `CaseInput` in `src/lib/case.ts` | id, url, verified counts, failed citation numbers |
| `case_update` (`PATCH /api/cases/:id`) | `{ id, patch }`, see `CasePatch` | same as publish |
| `case_get` (`GET /api/cases/:id`) | `{ id }` | the stored case with a verification mark per source |
| `case_recheck` (`POST /api/cases/:id`) | `{ id }` | `{ id, changed: number[], unreachable: number[], url }`. `changed`: the sentence is gone from a page that still opens, and the bot has not been told yet. A change is reported once, also when the daily job or the page button found it first. `unreachable`: the page did not open this time, the last confirmed state is kept. Stay silent when `changed` is empty |

`case_update` changes only the fields you send. A step is matched by its title, a money line by its label, evidence by `n`.
A quote last confirmed on a live reading must still be on a live reading at re-check, whatever Exa's older copy says.

Verification marks on each evidence item: `verified`, `not_found`, `unreachable`, plus `match` from 0 to 1
and `checkedVia`: `live` (our own request to the page), `oxylabs` (a live read through the Oxylabs Web API,
for pages that refuse our request) or `exa` (Exa's reading of the page).

## Source re-checks

A re-check opens every cited page of a stored case again (`recheckSources` in `src/lib/cases.ts`). Three callers:
the bot (`case_recheck`), the daily job, and the button on the case page. Each one appends to `checks` on the stored case,
which keeps the last 10:

```json
{ "at": "2026-11-14T03:17:42.000Z", "by": "cron", "changed": [3], "unreachable": [] }
```

- `by`: `bot`, `cron` or `page`.
- `changed`: citation numbers whose sentence was confirmed on its page earlier and is not there now. A number stays listed
  from check to check until the quote is found again or `case_update` replaces it. Its evidence item is marked `not_found`.
- `unreachable`: citation numbers whose page did not open this time. That is not a change: a quote that was confirmed keeps its mark.
- A re-check does not move `updatedAt`. That field is the last publish or `case_update`.
- If the case was updated while its pages were being read, the update wins and that check is not stored.

The case page shows the newest entry above the sources: when the pages were last read, an amber notice for `changed`,
a neutral line for `unreachable`, and the button. A case that was never re-checked shows the reading at publish.

### `GET /api/cron/recheck`

The daily job. `vercel.json` schedules it at 03:17 UTC (the Hobby plan allows one run a day and may start it later in that hour).
It needs `CRON_SECRET` on the Vercel project: without it Vercel sends no Authorization header and the route answers `401`.

It re-checks cases that were published or updated in the last 14 days, at most 15 per run, one after another,
and starts no new case after 240 seconds. Cases whose file has gone longest without a write come first, and a re-check
writes the file, so with more than 15 cases in the watch they take turns over several days.
A case whose pages were read in the last hour is left alone, so a cron event delivered twice costs nothing.

```json
{
  "checked": 3,
  "withChanges": 1,
  "failed": 0,
  "skipped": 2,
  "waiting": 0,
  "ms": 9120,
  "cases": [{ "id": "3C5sH6YwQzT-lhBd", "changed": [3], "unreachable": [] }]
}
```

`changed` here lists what this run found gone that the previous run still saw. `skipped`: looked at and left alone
(content older than 14 days, nothing cited, or read within the last hour). `waiting`: cases in the watch this run did not reach.
The job only records. It posts nothing to a chat: the bot's own `case_recheck` does that.

### `POST /api/cases/:id/check`

The public route behind "Check the sources again". No body, no credentials.

```json
{
  "id": "3C5sH6YwQzT-lhBd",
  "fresh": true,
  "checkedAt": "2026-11-14T09:02:11.000Z",
  "changed": [3],
  "unreachable": [],
  "evidenceTotal": 6,
  "evidenceVerified": 5
}
```

- `changed`: every quote that is gone as of this check, not only the new ones. `fresh: false`: the pages were read less than
  10 minutes ago (a new case counts as read when it was published), so the stored result came back and nothing was fetched.
- Readings that do fetch count against the public rate limit shared with the demo. Two requests for the same case
  at the same moment share one reading (per server instance). Errors: `404` unknown id, `429` rate limited, `502` the check failed.

## `GET /api/cases/:id/audio`: the plan read aloud

Returns `audio/mpeg`, the case spoken with ElevenLabs. Like reading a case it needs no secret, so a bot can pass the
address straight to Telegram as a voice message, and the case page plays it behind the "Listen to the plan" button.

- What is said (`spokenText` in `src/lib/speech.ts`), from the stored case only: the title; each step that has a quote
  found on its page, as its title and its deadline exactly as stored; each money line that has such a quote, as label
  and amount; then "N of M quotes were found on their pages. The sources are in the case file."
  No summary, no advice, nothing rephrased. A step with a `conflict` gets the fixed sentence
  "Two different figures were found for this step. See the case file." The connecting words are Finnish for a Finnish case.
- At most 1,500 characters. A longer plan loses whole steps from the end, never part of a sentence.
- The voice fits the case (`spokenLanguage`, `spokenDelivery` in `src/lib/speech.ts`), chosen from the stored case,
  never by a model:
  - **Language.** A case in Finnish, Swedish, German, Spanish, French, Ukrainian or Estonian is sent with its
    `language_code`, so the voice does not change language on its own for an English phrase quoted inside the plan.
    English cases are sent without a language. Model `eleven_flash_v2_5`; Estonian uses `eleven_v4_turbo`, because
    the fast model answers 400 for it.
  - **Delivery.** `gentle` (stability 0.7, speed 0.92) when the event or title names bad news: a dismissal, a fine,
    an eviction, an illness, a cancellation. `bright` (stability 0.4, speed 1.02) for good news: a baby, a wedding,
    a new job. `plain`, the voice as designed, for everything else. Bad news wins when a case holds both. The case
    page says "Read slowly and calmly." or "Read in a lighter voice." under the button.
  - **The name.** "AIDaddy" is sent to the voice as "AI Daddy": as one word it was heard as "Hey, Daddy" in English
    and "iDaddy" in Finnish.
  - The answer carries `x-spoken-language` (a code, or `as written`) and `x-spoken-delivery`.
- Each version of the spoken text is rendered once and stored next to the case (`audio/<id>-<hash>.mp3`), so a second
  request costs nothing. An updated case gets new audio on the next request, and so does a case whose language,
  model or delivery is now different.
- Supports `Range` requests. Sends `cache-control: private, max-age=3600`.
- Errors: `404` unknown case, or `ELEVENLABS_API_KEY` is not set (the button is then not shown), `429` rate limited
  (only requests that would render new audio count), `502` ElevenLabs failed or took longer than 20 seconds.

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

Our own request only goes to public web addresses (`isPublicUrl` in `src/lib/verify.ts`), because a cited address comes
from a language model or from a caller. Refused: any scheme but http and https, a port, a user name, a host name without
a dot or with a local suffix, every IPv6 literal, and the private, loopback, link-local, carrier, documentation,
benchmark, multicast and reserved IPv4 ranges, in whatever notation the address is written. A name is refused when any
address it resolves to is one of those. Redirects are followed by hand, at most five, and each hop is checked the same way.
Known gap: the name is resolved once for the check and again by the request, so a name that changes its answer in between
is not caught.

## What the bot does and does not do

The bot (Hermes) owns: reading the chat, staying silent, the acknowledgement, calling `research_case`,
posting the plan and link, approval buttons, writing drafts, `case_update`, reminders, and any scheduled `case_recheck`. This defines ownership, not enabled features: no daily watch is enabled in the current [Hermes handover](HERMES_HANDOVER.md).
The app's own daily job re-checks recent cases as well when `CRON_SECRET` is set on the deployment, but it only updates the case page. Telling the family in the chat stays with the bot.

The bot does not do the research itself unless `research_case` fails. Fallback: Exa MCP tools plus `case_publish`.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `EXA_API_KEY` | Vercel, Hermes `.env` | engine and verifier, Hermes web search |
| `CASEFILE_SECRET` | Vercel, Hermes `.env` | bot and script writes |
| `DEMO_ACCESS_CODE` | Vercel | public `/try` access; not asked for where `DEMO_OPEN=1` is set |
| `CRON_SECRET` | Vercel | lets Vercel Cron call the daily source re-check. Any long random string |
| `DEMO_RATE_PER_MINUTE` | Vercel, optional | public requests per client address per minute, default 20 (a venue shares one address) |
| `DEMO_RATE_TOTAL_PER_MINUTE` | Vercel, optional | all public requests per minute, default 40 |
| `OXYLABS_API_KEY` | Vercel, optional | third page reader for sites that refuse our request |
| `ELEVENLABS_API_KEY` | Vercel, optional | turns on the spoken plan: `GET /api/cases/:id/audio` and the button on the case page |
| `ELEVENLABS_VOICE_ID` | Vercel, optional | voice for everything the app speaks: the spoken plan and AIDaddy's replies on `/chat`. Default `UWUOFJTWwuSmZFHzbMpM`, AIDaddy's own designed voice, which lives in the team's ElevenLabs account: set it when the key belongs to another account |
| `BLOB_READ_WRITE_TOKEN` | Vercel, set by the Blob store | case storage |
| `PUBLIC_BASE_URL` | Vercel, optional | overrides the origin used in case links |
| `NEXT_PUBLIC_BOT_USERNAME` | Vercel | QR code and links to the Telegram bot |
| `NEXT_PUBLIC_SAMPLE_CASE_ID` | Vercel | sample case linked from the landing page |
| `NEXT_PUBLIC_REPO_URL` | Vercel, optional | source link in the landing page footer |
