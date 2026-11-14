# Scorecard harness

Runs `scenarios.json` against the research engine, scores each case and writes the scorecard. Node 22, no dependencies.

## Run

```bash
# Mock: fake numbers, delete its eval/results files afterwards
node eval/mock-server.mjs --port 4010 &
node eval/run.mjs --base http://localhost:4010 --label mock --no-scorecard

# Local dev
CASEFILE_SECRET=... node eval/run.mjs --base http://localhost:3000 --label local --concurrency 2 --no-scorecard

# Production
CASEFILE_SECRET=... node eval/run.mjs --base https://junction-2026.vercel.app --label "run 1" --concurrency 2
```

Options: `--only id1,id2`, `--group finland`, `--concurrency 2`, `--depth fast|deep`, `--timeout 240`, `--no-scorecard`.

Live runs use shared API credit; coordinate them around demos and keep concurrency at 2. Use `--no-scorecard` for experiments. That prevents replacement of `src/data/scorecard.json`; timestamped result files and `eval/results/latest.md` are still written. Link a timestamped result when citing a historical run.

Set `CASEFILE_SECRET`: calls without a bearer token are rate limited (HTTP 429). `DEMO_ACCESS_CODE` goes out as `x-demo-code`.

Writes `eval/results/<timestamp>.json` (full detail), `eval/results/latest.md` and `src/data/scorecard.json`. Filtered runs overwrite the scorecard with only their rows.

## Columns

- **Verified**: quotes the server found on the cited page.
- **Official**: evidence the engine marked `official`.
- **Expected host**: a source on a host in `officialHostsAny`.
- **Deadline or amount**: a step with a due date, or a money line.
- **Unsourced**: steps and money lines with no evidence.
- **Jurisdiction**: case country equals scenario country.
- **Plan**: plan lines, and whether each carries a `[n]`.
- **Time**: wall clock of `POST /api/research`.

## Pass rule

Verified is at least `expect.minVerified`, jurisdiction is right, nothing is unsourced, and there is a deadline or amount unless `needsDeadlineOrAmount` is false. Text in `expect.mustNotContain` must not appear in the plan or case. HTTP errors fail, after one retry on 429 or 5xx. Silent scenarios are manual chat-bot checks, outside the totals.

## Refusals

Scenarios with `"expect": { "refuse": true, "status": 422 }` (group `refusals`) are messages the engine must not answer with a plan: keyboard mash, placeholder text, a greeting, an unknown country. Each passes when `POST /api/research` answers with a 4xx status, no case id and a message a person can act on. They run after the plan scenarios, are printed as `[refuse]` lines, get their own section in `latest.md`, and are written to `scorecard.json` as `refusals: { passed, total }`. They are not part of the plan totals.

Known limit: a message that repeats one real word ("test test test test") still gets a plan, because the check only asks whether a word of the message comes back in what the search wrote.

## Add a scenario

Append an object to `scenarios.json`: unique `id`, `group`, `title`, the message as `situation`, `country`, `region`, `language`, `expect`. Optional: `household`, `document`. Leave `officialHostsAny` empty when unsure.
