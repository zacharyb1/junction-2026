# Exa notes

Checked 13 Nov 2026 against exa-js 2.28.0 types and exa.ai/docs; snippets type-check under `tsc --strict`. No API call was made (no key): prices and latencies are Exa's published figures. (unverified): in neither docs nor SDK types.

## Recommended request shapes

```ts
import Exa from "exa-js";
const exa = new Exa(process.env.EXA_API_KEY, undefined, { timeout: 30_000 }); // no default timeout

// (a) Official pages with verbatim excerpts
const found = await exa.search(question, {
  type: "auto",
  includeDomains: officialDomains, // also "kela.fi/en" or "*.gov.uk"
  startPublishedDate: sinceIso, // drops undated pages: retry without it if empty
  userLocation: "FI",
  objective: "Rank official government pages first; pull amounts, deadlines, eligibility.",
  contents: { highlights: true },
});
// found.results[i].highlights; found.notices go to the model

// (b) Structured answer for one question ("deep" for multi-search questions)
const res = await exa.search(question, {
  type: "auto",
  includeDomains: officialDomains,
  systemPrompt:
    "Official sources only. quote: one sentence copied verbatim, untranslated. Omit unverifiable fields; never guess.",
  outputSchema: {
    type: "object",
    properties: {
      amount: { type: "string" },
      deadline: { type: "string" },
      quote: { type: "string" },
      sourceUrl: { type: "string" },
    },
  },
  contents: { highlights: true },
});
// res.output?.content; res.output?.grounding: [{ field, citations: [{ url, title }], confidence }]

// (c) Fresh full text for the quote check
const pages = await exa.getContents(urls, {
  text: { verbosity: "full" },
  maxAgeHours: 0, // live fetch
  livecrawlTimeout: 15000,
});
// pages.results[i].text; pages.statuses[i].source is "crawled" or "cached"

// (d) Daily change check, up to 100 URLs per call
const today = await exa.getContents(urls, { text: true, maxAgeHours: 12 });
// re-run the quote check on today.results[i].text
```

- `highlights` and `text` come from the page; `summary`, `output.content`, `answer` and (b)'s `quote` and `sourceUrl` are model-written. Keep a claim only if its `sourceUrl` is a grounding citation and (c) finds the quote.
- `exa.answer(query, { systemPrompt, outputSchema, text })` ($0.005) returns `answer` and one `citations` list for the whole answer, with no domain, date or freshness filter. Exa advises it only for apps without their own LLM.
- Deeper pass: `exa.agent.runs.create({ query, effort: "medium", outputSchema })`, then `pollUntilFinished(run.id)`. Full JSON Schema, per-field `output.grounding`.
- Also valid: `excludeDomains`, `endPublishedDate`, `category` (`company`, `publication`, `news`, `personal site`, `financial report`, `people`), `numResults` (1 to 100, default 10), `moderation`; in contents `text.maxCharacters`, `text.includeHtmlTags`, `highlights.query`, `highlights.maxCharacters`, `summary.query`, `summary.schema`, `extras.links`, `extras.imageLinks`; on `getContents` `subpages`, `subpageTarget`.

## Cost and latency

| Call | Price per call | Latency |
| --- | --- | --- |
| search `auto` (default) | $0.007 | about 1 s |
| search `lite` (cached pages only, no `outputSchema`) | $0.004 | about 300 ms |
| search `deep-lite`, `deep` | $0.012 | about 4 s, 4 to 15 s |
| `getContents` | $0.001 per page per content type | instant from cache; live up to `livecrawlTimeout` (default 10 s) |
| Agent `minimal`, `low`, `medium`, `high`, `xhigh` | $0.012, $0.025, $0.10, $0.50, $1.00 | "seconds to minutes" |

Search includes text and highlights for 10 results; each further result costs $0.001, `summary` $0.001 per page. `outputSchema` adds about 2 s; no surcharge is listed (unverified). Legacy but accepted: `fast`, `instant`, `deep-reasoning` ($0.015).

Typical case (5 `auto` searches, 6 pages of text): $0.041, so $50 buys about 1,200 cases; with `deep` $0.066, about 750; plus an Agent `medium` pass $0.141, about 350. Daily re-check of 6 pages: $0.006.

Team rate limits per second: search and answer 10, deep types 5, contents 100, Agent 5 (50 concurrent runs); then 429. Without credits: 402.

## Pitfalls

1. exa-js sends `contents: { text: { maxCharacters: 10000 } }` when you omit `contents`. With `outputSchema`, pass `contents: { highlights: true }` so fields are filled "from page content rather than from titles and metadata alone" (Exa's skill).
2. Keep `query` a short retrieval phrase and put the situation in `objective` (up to 4,096 characters): Exa lists "Pasting the whole task description into `query`" under avoid.
3. Content options nest under `contents` on `search` but sit top-level on `getContents`; misplaced ones only raise an `IGNORED_FIELD` warning.
4. Ignored: `startCrawlDate`, `endCrawlDate`, `useAutoprompt`, `highlightsPerUrl`. Deprecated: `numSentences`, `includeText`, `excludeText`, `livecrawl`, search-side `subpages`.
5. `startPublishedDate` is a hard filter on an estimated date and drops undated pages, risky for evergreen government pages. `maxAgeHours` is page freshness, not recency.
6. `maxAgeHours: 0` may serve a 60-second-old copy; positive values fall back to cache on a failed fetch. Always read `statuses`: failures arrive inside a 200.
7. Search `outputSchema`: at most 10 properties in total, 2 nesting levels, `items` on every array, else 400. `streamSearch` drops its grounding events, so use `search()`.
8. `site:` and quoted phrases in queries are silently dropped when nothing matches (`RESTRICTIONS_RELAXED` notice). `includeDomains` never is.
9. Docs samples of highlights carry markdown markers and `...` joins, so normalise and match fragments against Exa `text`, not raw HTML.
10. Past versions: `snapshotAsOf` on `getContents` or in search `contents` returns the newest copy stored by that date, up to 5 months back. Free tier: 403 "whatever its credit balance"; pay-as-you-go: 100 requests, one URL per contents call. Hackathon credits qualifying: (unverified), ask Exa.
11. Agent: default effort `auto` is metered up to $5 a run (`budget.maxCostDollars` starts at $1), so pick a fixed effort. `createAndWait` times out after 2 minutes by default; read output only when `status === "completed"`.
12. Beta options need their header: `betas: [DYNAMIC_HIGHLIGHTS_BETA]` for `highlights: { dynamic: true }`, `betas: [AGENT_MONITORS_BETA_HEADER]` on every Agent Monitors call.
13. Search Monitors (`exa.monitors`, $0.002 per request, hourly at most) need a public HTTPS webhook, return `webhookSecret` once, and report new results, not page diffs: doable this weekend. Skip Agent Monitors (`exa.beta.agent.monitors`: beta, 6 h minimum cadence, no public docs or price (unverified)) and Websets (paid plan, separate credits).
14. Results are limited to the query's language (changelog, Nov 2025): query in the quoted page's language.

## What impresses Exa judges

1. Proof the answer postdates model training: show `publishedDate`, fetch time and `source: "crawled"` (criterion 1, `docs/CHALLENGE.md`).
2. Per-field sources on screen. Exa's build-with-exa skill: "expose `output.grounding` when relevant in a product".
3. Claim checking. Agent docs: "Verify important claims against their sources".
4. Lean requests. The skill: "Do not decorate the recommended request without reason".
5. Fast pass, then depth. Candidate Sourcing demo: "a fast verified first pass, then Deep Search and independent Agent verification". Adverse Media demo: "One Exa deep search per topic, grounded in named sources."

## Sources

- `node_modules/exa-js/dist/index.d.ts` and `index.mjs` (2.28.0); exa-js and exa-mcp-server repositories
- https://exa.ai/docs/search/quickstart, `/search/deep-search`, `/search/highlights`, `/search/best-practices`, `/search/snapshot`
- https://exa.ai/docs/reference/search, `/reference/get-contents`, `/reference/answer`, `/contents/quickstart`
- https://exa.ai/docs/agent/quickstart, `/agent/best-practices`, `/monitors/quickstart`, `/websets/quickstart`
- https://exa.ai/docs/admin/pricing, `/admin/billing`, `/admin/error-codes`, `/changelog`
- https://github.com/exa-labs/agent-skills (`skills/build-with-exa`)
- https://demos.exa.ai
