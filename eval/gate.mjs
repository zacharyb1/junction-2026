#!/usr/bin/env node
// Gate scorer. Runs a "should the bot speak" gate over the labelled chat messages in
// eval/gate-messages.json and counts what it gets wrong. Node 22, no dependencies.
//
// Usage:
//   node eval/gate.mjs --gate keywords
//   node eval/gate.mjs --gate chat --base http://localhost:11434/v1 --model <name>
//                      [--label "run 1"] [--concurrency 1] [--timeout 60] [--out file.md]
//
// Gates:
//   keywords  The Mode B wake patterns in hermes/config.snippet.yaml, plus an @kaveri mention.
//             Says wake or silent, names no label.
//   chat      An OpenAI-compatible chat endpoint, such as Ollama's /v1. It gets eval/gate-prompt.md as the
//             system prompt and one message per call. GATE_API_KEY, when set, is sent as a bearer token.
// Output: the report on stdout and in eval/results/gate-latest.md.
// Exit code: 0 when the run completed (also with wrong answers), 1 on bad arguments, 2 when the set,
// the prompt or the patterns cannot be used, the gate does not answer, or the report cannot be written.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(EVAL_DIR, "..");
const MESSAGES_FILE = path.join(EVAL_DIR, "gate-messages.json");
const PROMPT_FILE = path.join(EVAL_DIR, "gate-prompt.md");
const PATTERNS_FILE = path.join(REPO_ROOT, "hermes", "config.snippet.yaml");
const REPORT_FILE = path.join(EVAL_DIR, "results", "gate-latest.md");

const LABELS = ["life_event", "official_document", "addressed_to_bot", "none"];
const LANGUAGES = { en: "English", fi: "Finnish" };
const RETRY_WAIT_MS = 5000;

const USAGE = `Usage: node eval/gate.mjs --gate keywords|chat [options]

  --gate <name>        keywords: the wake patterns of Mode B, no model and no network
                       chat: an OpenAI-compatible chat endpoint, needs --base and --model
  --base <url>         Base URL of the endpoint, e.g. http://localhost:11434/v1 for Ollama
  --model <name>       Model name the endpoint knows, e.g. the tag shown by "ollama list"
  --label <text>       Name of this run, shown in the report
  --concurrency <n>    Messages in flight at once, 1 to 8 (default 1)
  --timeout <seconds>  Give up on one message after this long (default 60)
  --out <file>         Write the report here instead of eval/results/gate-latest.md

Environment: GATE_API_KEY -> "Authorization: Bearer" for the chat gate.`;

class UsageError extends Error {}
/** The run cannot produce numbers worth writing down. */
class RunError extends Error {}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = { gate: null, base: null, model: null, label: null, concurrency: 1, timeout: 60, out: REPORT_FILE, help: false };
  const withValue = ["--gate", "--base", "--model", "--label", "--concurrency", "--timeout", "--out"];

  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].startsWith("--") ? argv[i].indexOf("=") : -1;
    const flag = eq > 0 ? argv[i].slice(0, eq) : argv[i];
    if (flag === "--help" || flag === "-h") {
      opts.help = true;
      continue;
    }
    if (!withValue.includes(flag)) throw new UsageError(`unknown argument ${argv[i]}`);
    const value = eq > 0 ? argv[i].slice(eq + 1) : argv[++i];
    if (value === undefined || (flag !== "--label" && value.startsWith("--"))) {
      throw new UsageError(`${flag} needs a value`);
    }

    if (flag === "--gate") {
      if (value !== "keywords" && value !== "chat") throw new UsageError("--gate must be keywords or chat");
      opts.gate = value;
    } else if (flag === "--base") {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw new UsageError(`--base is not a URL: ${value}`);
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new UsageError("--base must start with http:// or https://");
      opts.base = `${url.origin}${url.pathname}`.replace(/\/+$/, "");
    } else if (flag === "--concurrency") {
      opts.concurrency = Number(value);
      if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1 || opts.concurrency > 8) {
        throw new UsageError("--concurrency must be a whole number from 1 to 8");
      }
    } else if (flag === "--timeout") {
      opts.timeout = Number(value);
      if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) throw new UsageError("--timeout must be a number of seconds above 0");
    } else if (flag === "--out") {
      opts.out = path.resolve(value);
    } else {
      opts[flag.slice(2)] = value.trim();
    }
  }
  if (opts.help) return opts;
  if (!opts.gate) throw new UsageError("--gate is required");
  if (opts.gate === "chat" && (!opts.base || !opts.model)) throw new UsageError("--gate chat needs --base and --model");
  return opts;
}

async function loadMessages() {
  const messages = JSON.parse(await readFile(MESSAGES_FILE, "utf8"));
  if (!Array.isArray(messages) || !messages.length) throw new Error("expected a non-empty array");
  const seen = new Set();
  messages.forEach((m, i) => {
    const where = `item ${i + 1}${m?.id ? ` (${m.id})` : ""}`;
    for (const key of ["id", "text"]) {
      if (typeof m?.[key] !== "string" || !m[key].trim()) throw new Error(`${where}: "${key}" is missing`);
    }
    if (!Object.hasOwn(LANGUAGES, m.language)) throw new Error(`${where}: "language" must be one of ${Object.keys(LANGUAGES).join(", ")}`);
    if (!LABELS.includes(m.label)) throw new Error(`${where}: "label" must be one of ${LABELS.join(", ")}`);
    if (seen.has(m.id)) throw new Error(`${where}: the id is used twice`);
    seen.add(m.id);
  });
  return messages;
}

// ---------------------------------------------------------------- keywords gate

const WORD = "[\\p{L}\\p{N}_]";

/**
 * Hermes matches the patterns with Python, where \w, \W and \b know letters such as ä and ö.
 * JavaScript's only know ASCII, so the three are spelled out. The patterns use them outside [...] only.
 */
function fromPython(source) {
  const js = source
    .replace(/\\w/g, WORD)
    .replace(/\\W/g, "[^\\p{L}\\p{N}_]")
    .replace(/\\b/g, `(?:(?<=${WORD})(?!${WORD})|(?<!${WORD})(?=${WORD}))`);
  try {
    return new RegExp(js, "iu");
  } catch (err) {
    throw new Error(`cannot read the pattern ${source}: ${err.message}`);
  }
}

/** The wake patterns of Mode B, read from the bot's own config so the baseline is what the bot would run. */
async function loadWakePatterns() {
  // Every line of the list sits behind a "#B " prefix while Mode B is switched off.
  const lines = (await readFile(PATTERNS_FILE, "utf8")).split("\n").map((line) => line.replace(/^\s*#B\s/, "").trim());
  const start = lines.indexOf("mention_patterns:");
  const patterns = [];
  for (const line of start < 0 ? [] : lines.slice(start + 1)) {
    const item = /^- "(.+)"$/.exec(line);
    // YAML doubles the backslashes inside double quotes.
    if (item) patterns.push(fromPython(item[1].replace(/\\([\\"])/g, "$1")));
    else if (line && !line.startsWith("#")) break; // the list is over
  }
  if (!patterns.length) throw new Error("no mention_patterns in it");
  return patterns;
}

/** In Mode B the bot also wakes on its @username, with no pattern needed. The set writes that as @kaveri. */
const MENTION = /@kaveri/i;

function keywordsAnswer(patterns, text) {
  for (const pattern of [MENTION, ...patterns]) {
    const hit = pattern.exec(text);
    if (hit) return { said: "wake", how: `matched "${hit[0]}"` };
  }
  return { said: "none" };
}

// ---------------------------------------------------------------- chat gate

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One HTTP call that never throws. `status` is 0 when no response arrived. */
async function call(url, { headers, body, timeoutMs }) {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON, keep the text for the error message
    }
    return { status: res.status, ok: res.ok, json, text, error: null, ms: elapsed() };
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    const cause = err?.cause?.code ?? err?.cause?.message;
    const error = timedOut
      ? `timed out after ${Math.round(timeoutMs / 1000)} s`
      : `${err?.message ?? err}${cause ? ` (${cause})` : ""}`;
    return { status: 0, ok: false, json: null, text: "", error, ms: elapsed() };
  }
}

/** Retries once, 5 seconds later, when the answer is 429 or 5xx. */
async function callWithRetry(url, options) {
  const first = await call(url, options);
  if (first.status !== 429 && first.status < 500) return first;
  await sleep(RETRY_WAIT_MS);
  return call(url, options);
}

function httpError(res) {
  const error = res.json?.error;
  const message =
    typeof error === "string"
      ? error
      : typeof error?.message === "string"
        ? error.message
        : res.text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const hint = res.status === 404 && !/model/i.test(message) ? " (does --base end in /v1?)" : "";
  return `HTTP ${res.status}${message ? `: ${message.slice(0, 160)}` : ""}${hint}`;
}

/**
 * Reads the label out of a reply. A reply with more in it than the label still counts when it names
 * exactly one label, with `exact` false. Anything else is no answer.
 */
function readLabel(reply) {
  const text = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim().toLowerCase();
  if (LABELS.includes(text)) return { said: text, exact: true };
  // Small models like to answer in Markdown, where the label can come out as life\_event.
  const plain = text.replace(/\\/g, "");
  const named = LABELS.filter((label) => new RegExp(`\\b${label.replace(/_/g, "[_ -]")}\\b`).test(plain));
  return { said: named.length === 1 ? named[0] : null, exact: false };
}

async function chatAnswer(message, opts) {
  const res = await callWithRetry(`${opts.base}/chat/completions`, {
    headers: { ...opts.auth, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0,
      messages: [
        { role: "system", content: opts.prompt },
        { role: "user", content: `Message: ${message.text}` },
      ],
    }),
    timeoutMs: opts.timeout * 1000,
  });
  if (res.error) return { said: null, error: res.error, ms: res.ms };
  if (!res.ok) return { said: null, error: httpError(res), ms: res.ms };
  const reply = res.json?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") return { said: null, error: "the answer has no choices[0].message.content", ms: res.ms };
  const read = readLabel(reply);
  return { ...read, how: read.exact ? undefined : `replied "${oneLine(reply).slice(0, 80)}"`, ms: res.ms };
}

/** Runs `worker` over `items`, at most `limit` at a time. Results keep the order of `items`. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

// ---------------------------------------------------------------- scoring

/**
 * One row per message: what the set expects and what the gate said. A wake is any label other than
 * "none". No usable answer counts as silence, because the bot would not wake on it.
 */
const judge = (messages, answers) =>
  messages.map((m, i) => ({ ...m, ...answers[i], woke: answers[i].said !== null && answers[i].said !== "none" }));

/** The two numbers that matter: triggers the gate slept through, and silence it broke. */
function tally(rows) {
  const triggers = rows.filter((r) => r.label !== "none");
  const quiet = rows.filter((r) => r.label === "none");
  return {
    triggers: triggers.length,
    quiet: quiet.length,
    missed: triggers.filter((r) => !r.woke),
    falseWakes: quiet.filter((r) => r.woke),
  };
}

// ---------------------------------------------------------------- reporting

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const cell = (value) => oneLine(value).replace(/\|/g, "\\|");
const share = (hit, total) => (total ? `${hit} of ${total} (${Math.round((100 * hit) / total)}%)` : "n/a");

function median(sorted) {
  if (!sorted.length) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Nearest-rank 90th percentile: the smallest value that at least 90% of the values do not exceed. */
const p90 = (sorted) => (sorted.length ? sorted[Math.ceil(0.9 * sorted.length) - 1] : 0);

/** What the gate did with a message, for the lists and the progress lines. */
const saidText = (r) => r.error ?? r.how ?? (r.said === null ? "no label" : r.said);

function progressLine(r, done, total, width) {
  const head = `[${String(done).padStart(String(total).length)}/${total}]`;
  const verdict = r.error
    ? "ERROR"
    : r.label !== "none" && !r.woke
      ? "MISS "
      : r.label === "none" && r.woke
        ? "WAKE "
        : r.said === r.label
          ? "ok   "
          : r.said === null
            ? "?    " // silence was right, but the reply named no label
            : "label";
  return `${head} ${verdict} ${r.id.padEnd(width)}  ${r.label} -> ${r.error ?? r.said ?? "no label"}  ${seconds(r.ms).replace(" ", "")}`;
}

function markdown(run) {
  const { rows, totals } = run;
  const languages = Object.keys(LANGUAGES).filter((code) => rows.some((r) => r.language === code));
  const out = [
    `# Gate check: ${run.label}`,
    "",
    `- Ran ${run.ranAt}, took ${seconds(run.durationMs)}`,
    `- Gate: ${run.gate}`,
    `- Set: ${rows.length} messages in \`eval/gate-messages.json\` (${languages.map((code) => `${rows.filter((r) => r.language === code).length} ${LANGUAGES[code]}`).join(", ")}), ${totals.triggers} triggers and ${totals.quiet} that need silence`,
    "- A wake is any label other than `none`. No usable answer counts as silence",
    "- The set is dense with hard cases on purpose. A real family chat is mostly plain small talk, so read these as counts on this set, not as rates",
    ...(run.timings.length ? [`- Time per message: median ${seconds(median(run.timings))}, p90 ${seconds(p90(run.timings))}`] : []),
    ...(run.inexact ? [`- ${run.inexact} ${run.inexact === 1 ? "reply" : "replies"} held more than the label and ${run.inexact === 1 ? "was" : "were"} read by the one label named in ${run.inexact === 1 ? "it" : "them"}`] : []),
    ...(run.failed ? [`- **${run.failed} ${run.failed === 1 ? "message" : "messages"} got no answer from the endpoint. The numbers below are not a fair result.**`] : []),
    "",
    "## The two numbers",
    "",
    "| Gate | Missed triggers | False wakes |",
    "|---|---|---|",
    `| **${cell(run.name)}** | **${totals.missed.length} of ${totals.triggers}** | **${totals.falseWakes.length} of ${totals.quiet}** |`,
    ...(run.baseline ? [`| keywords baseline | ${run.baseline.missed.length} of ${run.baseline.triggers} | ${run.baseline.falseWakes.length} of ${run.baseline.quiet} |`] : []),
    "",
    "| Language | Messages | Missed triggers | False wakes |",
    "|---|---|---|---|",
  ];
  for (const code of languages) {
    const part = tally(rows.filter((r) => r.language === code));
    out.push(`| ${LANGUAGES[code]} | ${part.triggers + part.quiet} | ${part.missed.length} of ${part.triggers} | ${part.falseWakes.length} of ${part.quiet} |`);
  }

  // Precision: of the messages the gate gave this label, how many carry it. Recall: of the messages that carry it, how many got it.
  const line = (name, isLabel, isSaid, named = true) => {
    const labelled = rows.filter(isLabel);
    const hit = labelled.filter(isSaid).length;
    const woke = labelled.filter((r) => r.woke).length;
    return `| ${name} | ${labelled.length} | ${named ? share(hit, rows.filter(isSaid).length) : "n/a"} | ${named ? share(hit, labelled.length) : "n/a"} | ${woke} of ${labelled.length} |`;
  };
  out.push(
    "",
    "## Per label",
    "",
    "| Label | Messages | Precision | Recall | Woke |",
    "|---|---|---|---|---|",
    ...LABELS.filter((label) => label !== "none").map((label) => line(`\`${label}\``, (r) => r.label === label, (r) => r.said === label, run.namesLabels)),
    line("any trigger", (r) => r.label !== "none", (r) => r.woke),
    line("`none`", (r) => r.label === "none", (r) => r.said === "none"),
    "",
    `Precision and recall count the exact label. "Woke" counts any label other than \`none\`.${run.namesLabels ? "" : " This gate only says wake or silent, so it has neither for the three trigger labels."}`,
  );

  const list = (title, lead, items, columns) => {
    out.push("", `## ${title} (${items.length})`, "");
    if (!items.length) return out.push("None.");
    out.push(lead, "", `| ${columns.map((c) => c[0]).join(" | ")} |`, `|${"---|".repeat(columns.length)}`);
    for (const r of items) out.push(`| ${columns.map((c) => cell(c[1](r))).join(" | ")} |`);
  };
  const message = ["Message", (r) => `\`${r.id}\``];
  const language = ["Language", (r) => r.language];
  const expected = ["Expected", (r) => r.label];
  const said = ["Gate", saidText];
  const text = ["Text", (r) => r.text];
  list("Missed triggers", "The bot would stay silent on these.", totals.missed, [message, language, expected, said, text]);
  list("False wakes", "The bot would wake on these, and with a local gate they would leave the laptop.", totals.falseWakes, [message, language, said, text]);

  const wrongLabel = rows.filter((r) => r.label !== "none" && r.woke && r.said !== "wake" && r.said !== r.label);
  if (wrongLabel.length) {
    list("Woke with another label", "Not missed: the bot wakes. Only the name of the trigger is off.", wrongLabel, [message, language, expected, said, text]);
  }
  const unusable = rows.filter((r) => r.said === null);
  if (unusable.length) {
    list("No usable answer", "No answer from the endpoint, or a reply that names no label or several. Counted as silence.", unusable, [message, language, expected, said]);
  }
  return `${out.join("\n")}\n`;
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return;
  }

  const load = async (file, read) => {
    try {
      return await read();
    } catch (err) {
      throw new RunError(`cannot use ${path.relative(process.cwd(), file)}: ${err.message}`);
    }
  };
  const messages = await load(MESSAGES_FILE, loadMessages);
  const chat = opts.gate === "chat";

  // The keywords gate costs nothing, so a chat run carries it along as the number to beat.
  let patterns = null;
  try {
    patterns = await load(PATTERNS_FILE, loadWakePatterns);
  } catch (err) {
    if (!chat) throw err;
    console.error(`gate.mjs: no keywords baseline in this report: ${err.message}`);
  }
  const keywordRows = patterns && judge(messages, messages.map((m) => keywordsAnswer(patterns, m.text)));

  const ranAt = new Date().toISOString();
  const started = performance.now();
  let rows = keywordRows;
  if (chat) {
    opts.prompt = (await load(PROMPT_FILE, () => readFile(PROMPT_FILE, "utf8"))).trim();
    // A prompt that quotes the set has seen the answers, and its score would say nothing about new messages.
    // A message as short as "ok 👍" can turn up in any text, so only longer ones are looked for.
    const promptText = oneLine(opts.prompt).toLowerCase();
    const quoted = messages.find((m) => m.text.length >= 10 && promptText.includes(oneLine(m.text).toLowerCase()));
    if (quoted) throw new RunError(`eval/gate-prompt.md quotes the message ${quoted.id} of the set. Use examples that are not in the set`);
    opts.auth = process.env.GATE_API_KEY ? { authorization: `Bearer ${process.env.GATE_API_KEY}` } : {};
    console.log(`${messages.length} messages to ${opts.model} at ${opts.base}  concurrency ${opts.concurrency}  timeout ${opts.timeout} s  ${opts.auth.authorization ? "GATE_API_KEY" : "no key"}`);

    const width = Math.max(...messages.map((m) => m.id.length));
    let done = 0;
    const ask = async (m) => {
      const [row] = judge([m], [await chatAnswer(m, opts)]);
      console.log(progressLine(row, ++done, messages.length, width));
      return row;
    };
    // The first message goes alone: a wrong address, key or model name should fail once, not for every message.
    const first = await ask(messages[0]);
    if (first.error) throw new RunError(`the gate did not answer the first message: ${first.error}`);
    rows = [first, ...(await pool(messages.slice(1), opts.concurrency, ask))];
    console.log("");
  }

  const run = {
    label: opts.label || (chat ? `chat gate, ${opts.model}` : "keywords baseline"),
    name: chat ? opts.model : "keywords",
    gate: chat
      ? `chat, model \`${opts.model}\` at ${opts.base}, system prompt \`eval/gate-prompt.md\`, concurrency ${opts.concurrency}`
      : `keywords, the ${patterns.length} wake patterns of Mode B in \`hermes/config.snippet.yaml\` plus an @kaveri mention. No model, no network`,
    namesLabels: chat,
    ranAt,
    durationMs: Math.round(performance.now() - started),
    rows,
    totals: tally(rows),
    baseline: chat && keywordRows ? tally(keywordRows) : null,
    timings: chat ? rows.filter((r) => !r.error).map((r) => r.ms).sort((a, b) => a - b) : [],
    inexact: rows.filter((r) => r.said !== null && r.exact === false).length,
    failed: rows.filter((r) => r.error).length,
  };

  const report = markdown(run);
  console.log(report);
  try {
    await mkdir(path.dirname(opts.out), { recursive: true });
    await writeFile(opts.out, report, "utf8");
  } catch (err) {
    throw new RunError(`cannot write the report: ${err.message}`);
  }
  const relative = path.relative(process.cwd(), opts.out);
  console.log(`Wrote ${relative.startsWith("..") ? opts.out : relative}`);
}

try {
  await main();
} catch (err) {
  if (err instanceof UsageError) {
    console.error(`gate.mjs: ${err.message}\n\n${USAGE}`);
    process.exitCode = 1;
  } else if (err instanceof RunError) {
    console.error(`gate.mjs: ${err.message}`);
    process.exitCode = 2;
  } else {
    console.error(err);
    process.exitCode = 2;
  }
}
