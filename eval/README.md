# Scorecard harness

Runs `scenarios.json` against the research engine, scores each case and writes the scorecard. Node 22, no dependencies.

## Run

```bash
# Mock: fake numbers, delete its eval/results files afterwards
node eval/mock-server.mjs --port 4010 &
node eval/run.mjs --base http://localhost:4010 --label mock --no-scorecard

# Local dev
CASEFILE_SECRET=... node eval/run.mjs --base http://localhost:3000 --label local

# Production
CASEFILE_SECRET=... node eval/run.mjs --base https://junction-2026.vercel.app --label "run 1"
```

Options: `--only id1,id2`, `--group finland`, `--concurrency 3`, `--depth fast|deep`, `--timeout 240`, `--no-scorecard`.

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

## Add a scenario

Append an object to `scenarios.json`: unique `id`, `group`, `title`, the message as `situation`, `country`, `region`, `language`, `expect`. Optional: `household`, `document`. Leave `officialHostsAny` empty when unsure.

## Gate check: should the bot speak

The bot stays silent on small talk and wakes on a life event. The plan for the bot runtime is a small local model (Gemma on Ollama) as a privacy gate: it labels every group message, and only the triggers leave the laptop. The gate is not built in this repo. This kit scores any gate.

- `gate-messages.json`: 80 chat messages, 53 English and 27 Finnish. 30 are triggers (`life_event`, `official_document`, `addressed_to_bot`) and 50 need silence (`none`). Many are hard on purpose, and `note` says why.
- `gate-prompt.md`: the system prompt for the model. One message in, one label out.
- `gate.mjs`: runs a gate over the set and writes `results/gate-latest.md`. Node 22, no dependencies.

A wake is any label other than `none`. The two numbers that matter are plain counts: **missed triggers** (the bot sleeps through a life event) and **false wakes** (small talk leaves the laptop). The report lists the messages behind both, and precision and recall per label.

```bash
# The number to beat: the Mode B wake patterns in hermes/config.snippet.yaml. No model, no network.
node eval/gate.mjs --gate keywords

# Gemma on Ollama. Use the tag that "ollama list" shows.
ollama pull gemma3:4b
node eval/gate.mjs --gate chat --base http://localhost:11434/v1 --model gemma3:4b --label "gemma3:4b on the demo laptop"
```

`--gate chat` works with any OpenAI-compatible server. It posts to `<base>/chat/completions` with the prompt as the system message, `Message: <text>` as the user message and temperature 0, one message per call. `GATE_API_KEY`, when set, is sent as a bearer token; Ollama needs none. Options: `--concurrency 1` (up to 8), `--timeout 60`, `--out <file>` to keep a run without replacing `gate-latest.md`.

How a run is read:

- A chat run carries the keywords line next to its own, so the comparison is always in the report.
- A reply with more in it than the label counts when it names exactly one label, and the report says how many replies were like that. A reply that names no label or several counts as silence, the safe side for a privacy gate.
- If the first message gets no answer, the run stops and writes nothing. If later messages get none, the report says so in bold and is not a fair result.
- The set is dense with hard cases, so the counts are counts on this set, not rates for a real chat.

Status: the committed `results/gate-latest.md` is the keywords baseline. No Gemma run exists yet, and the chat gate has only been run against a local stub.

The prompt and the set were written together, so a score is a development check, not a held-out result. Keep the examples in `gate-prompt.md` out of the set: `gate.mjs` refuses a prompt that quotes one of its messages. To add a message, append `{ id, language: "en" | "fi", text, label, note? }` with a new `id`.
