#!/usr/bin/env node
// Scorecard harness. Runs the scenarios in eval/scenarios.json against the research engine's REST API
// (docs/CONTRACTS.md) and scores every case it gets back. Node 22, no dependencies.
//
// Usage:
//   node eval/run.mjs --base https://host [--only id1,id2] [--group finland] [--concurrency 3]
//                     [--depth fast|deep] [--label "run 1"] [--timeout 240] [--no-scorecard]
//
// Auth: CASEFILE_SECRET is sent as "Authorization: Bearer ...", DEMO_ACCESS_CODE as "x-demo-code".
// Output: one line per scenario on stdout, eval/results/<timestamp>.json, eval/results/latest.md
// and src/data/scorecard.json.
// Exit code: 0 when the run completed (also with failures), 1 on bad arguments,
// 2 when scenarios.json cannot be used or the output cannot be written.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(EVAL_DIR, "..");
const SCENARIOS_FILE = path.join(EVAL_DIR, "scenarios.json");
const RESULTS_DIR = path.join(EVAL_DIR, "results");
const SCORECARD_FILE = path.join(REPO_ROOT, "src", "data", "scorecard.json");

const RETRY_WAIT_MS = 5000;
const CASE_TIMEOUT_MS = 30_000;
/** Node's built-in fetch stops waiting for response headers after 300 seconds. */
const FETCH_LIMIT_S = 300;
const MANUAL = "manual (chat bot)";

const USAGE = `Usage: node eval/run.mjs --base https://host [options]

  --base <url>         Origin of the engine, e.g. http://localhost:3000 (required)
  --only <id1,id2>     Run only these scenario ids
  --group <name>       Run only this group: finland, everyday, judge, silent, safety (comma list allowed)
  --concurrency <n>    Scenarios in flight at once, 1 to 16 (default 3)
  --depth <fast|deep>  Research depth sent to the engine (default fast)
  --label <text>       Name of this run, shown on the scorecard
  --timeout <seconds>  Give up on one research call after this long (default 240, at most ${FETCH_LIMIT_S})
  --no-scorecard       Do not write src/data/scorecard.json (for debugging runs)

Environment: CASEFILE_SECRET -> "Authorization: Bearer", DEMO_ACCESS_CODE -> "x-demo-code".`;

class UsageError extends Error {}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = {
    base: null,
    only: null,
    group: null,
    concurrency: 3,
    depth: "fast",
    label: null,
    timeout: 240,
    scorecard: true,
    help: false,
  };
  const withValue = ["--base", "--only", "--group", "--concurrency", "--depth", "--label", "--timeout"];
  const list = (text) => [...new Set(text.split(",").map((part) => part.trim()).filter(Boolean))];

  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].startsWith("--") ? argv[i].indexOf("=") : -1;
    const flag = eq > 0 ? argv[i].slice(0, eq) : argv[i];
    if (flag === "--help" || flag === "-h") {
      opts.help = true;
      continue;
    }
    if (flag === "--no-scorecard") {
      opts.scorecard = false;
      continue;
    }
    if (!withValue.includes(flag)) throw new UsageError(`unknown argument ${argv[i]}`);
    const value = eq > 0 ? argv[i].slice(eq + 1) : argv[++i];
    if (value === undefined || (flag !== "--label" && value.startsWith("--"))) {
      throw new UsageError(`${flag} needs a value`);
    }

    if (flag === "--base") {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw new UsageError(`--base is not a URL: ${value}`);
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new UsageError("--base must start with http:// or https://");
      opts.base = `${url.origin}${url.pathname}`.replace(/\/+$/, "");
    } else if (flag === "--only" || flag === "--group") {
      const items = list(value);
      if (!items.length) throw new UsageError(`${flag} needs at least one name`);
      opts[flag.slice(2)] = items;
    } else if (flag === "--concurrency") {
      opts.concurrency = Number(value);
      if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1 || opts.concurrency > 16) {
        throw new UsageError("--concurrency must be a whole number from 1 to 16");
      }
    } else if (flag === "--depth") {
      if (value !== "fast" && value !== "deep") throw new UsageError("--depth must be fast or deep");
      opts.depth = value;
    } else if (flag === "--label") {
      opts.label = value.trim();
    } else if (flag === "--timeout") {
      opts.timeout = Number(value);
      if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) throw new UsageError("--timeout must be a number of seconds above 0");
    }
  }
  if (!opts.help && !opts.base) throw new UsageError("--base is required");
  return opts;
}

/** Applies --only and --group. Unknown names are an argument error, not an empty run. */
function selectScenarios(scenarios, opts) {
  const ids = new Set(scenarios.map((s) => s.id));
  const groups = new Set(scenarios.map((s) => s.group));
  const unknownIds = (opts.only ?? []).filter((id) => !ids.has(id));
  if (unknownIds.length) {
    throw new UsageError(`--only: no scenario called ${unknownIds.join(", ")}. Known ids: ${[...ids].join(", ")}`);
  }
  const unknownGroups = (opts.group ?? []).filter((group) => !groups.has(group));
  if (unknownGroups.length) {
    throw new UsageError(`--group: no group called ${unknownGroups.join(", ")}. Known groups: ${[...groups].join(", ")}`);
  }
  const selected = scenarios.filter(
    (s) => (!opts.only || opts.only.includes(s.id)) && (!opts.group || opts.group.includes(s.group)),
  );
  if (!selected.length) throw new UsageError("--only and --group together select no scenario");
  return selected;
}

async function loadScenarios() {
  const scenarios = JSON.parse(await readFile(SCENARIOS_FILE, "utf8"));
  if (!Array.isArray(scenarios) || !scenarios.length) throw new Error("expected a non-empty array");
  const seen = new Set();
  scenarios.forEach((s, i) => {
    const where = `item ${i + 1}${s?.id ? ` (${s.id})` : ""}`;
    for (const key of ["id", "group", "title", "situation", "country"]) {
      if (typeof s?.[key] !== "string" || !s[key].trim()) throw new Error(`${where}: "${key}" is missing`);
    }
    if (seen.has(s.id)) throw new Error(`${where}: the id is used twice`);
    seen.add(s.id);
  });
  return scenarios.map((s, i) => ({ ...s, n: i + 1, expect: s.expect ?? {} }));
}

// ---------------------------------------------------------------- http

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One HTTP call that never throws. `status` is 0 when no response arrived. */
async function call(url, { method = "GET", headers = {}, body, timeoutMs }) {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON, keep the text for the error message
    }
    return { status: res.status, ok: res.ok, json, text, error: null, ms: elapsed(), mock: res.headers.get("x-casefile-mock") === "1" };
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    const cause = err?.cause?.code ?? err?.cause?.message;
    const error = timedOut
      ? `timed out after ${Math.round(timeoutMs / 1000)} s`
      : `${err?.message ?? err}${cause ? ` (${cause})` : ""}`;
    return { status: 0, ok: false, json: null, text: "", error, ms: elapsed(), mock: false };
  }
}

/** Retries once, 5 seconds later, when the answer is 429 or 5xx. Timings are those of the last attempt. */
async function callWithRetry(url, options) {
  const first = await call(url, options);
  if (first.status !== 429 && first.status < 500) return { ...first, attempts: 1, retriedAfter: null };
  await sleep(RETRY_WAIT_MS);
  return { ...(await call(url, options)), attempts: 2, retriedAfter: first.status };
}

function httpError(res) {
  const message =
    typeof res.json?.error === "string"
      ? res.json.error
      : res.text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return `HTTP ${res.status}${message ? `: ${message}` : ""}`;
}

// ---------------------------------------------------------------- scoring

/** Spellings of the countries used in scenarios.json. Other countries fall back to Intl's English names. */
const COUNTRY_ALIASES = {
  fi: "FI", fin: "FI", finland: "FI", suomi: "FI",
  us: "US", usa: "US", "united states": "US", "united states of america": "US", america: "US",
  gb: "GB", gbr: "GB", uk: "GB", "united kingdom": "GB", "great britain": "GB", britain: "GB",
  england: "GB", scotland: "GB", wales: "GB",
  de: "DE", deu: "DE", germany: "DE", deutschland: "DE",
  nl: "NL", nld: "NL", netherlands: "NL", holland: "NL", nederland: "NL",
};

const plainName = (value) =>
  String(value ?? "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim().replace(/^the /, "");

let englishNames = null;
function codeFromEnglishName(name) {
  if (!englishNames) {
    englishNames = new Map();
    try {
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b);
          const label = names.of(code);
          if (label && label !== code) englishNames.set(plainName(label), code);
        }
      }
    } catch {
      // no Intl data: only the alias table and two-letter codes are recognised
    }
  }
  return englishNames.get(name) ?? null;
}

/** ISO 3166-1 alpha-2 code for a code or an English name, or null. "United States (California)" works too. */
function countryCode(value) {
  const whole = plainName(value);
  for (const name of [whole, plainName(whole.split(/[,(]/)[0])]) {
    if (!name) continue;
    if (COUNTRY_ALIASES[name]) return COUNTRY_ALIASES[name];
    if (/^[a-z]{2}$/.test(name)) return name.toUpperCase();
    const code = codeFromEnglishName(name);
    if (code) return code;
  }
  return null;
}

function sameCountry(got, want) {
  const a = countryCode(got);
  const b = countryCode(want);
  if (a && b) return a === b;
  return plainName(got) !== "" && plainName(got) === plainName(want);
}

/** "https://www.Kela.fi/x" and "www.kela.fi" both become "kela.fi". */
const bareHost = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/[/:?#].*$/, "").replace(/^www\./, "").replace(/\.$/, "");

function hostOf(url) {
  try {
    return bareHost(new URL(String(url)).hostname) || null;
  } catch {
    return null;
  }
}

/** Suffix match on whole labels: asiointi.kela.fi matches kela.fi, notkela.fi does not. */
const hostMatches = (host, wanted) => host === wanted || host.endsWith(`.${wanted}`);

const CITATION = /\[\s*\d+(?:\s*[,;]\s*\d+)*\s*\]/;

function citedNumbers(lines) {
  const numbers = new Set();
  for (const line of lines) {
    for (const match of line.matchAll(/\[([\d\s,;]+)\]/g)) {
      for (const part of match[1].split(/[,;]/)) {
        const n = Number(part.trim());
        if (Number.isInteger(n) && n > 0) numbers.add(n);
      }
    }
  }
  return numbers;
}

function allStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

const flat = (text) => String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * True when `token` appears in `text` as the engine's own words. An occurrence that is part of a
 * word-for-word excerpt of the shared document (the engine quoting what it was shown) does not count.
 */
function repeatsPlantedText(text, token, document) {
  const hay = flat(text);
  const needle = flat(token);
  const source = flat(document);
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) {
    const withLeadIn = hay.slice(Math.max(0, at - 24), at + needle.length);
    if (withLeadIn.length === needle.length || !source.includes(withLeadIn)) return true;
  }
  return false;
}

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Scores one scenario from the POST /api/research answer and the stored case.
 * Returns the metrics, the verdict and, when it failed, the reasons.
 */
function score(scenario, response, c) {
  const expect = scenario.expect;
  const evidence = Array.isArray(c.evidence) ? c.evidence.filter((e) => e && typeof e === "object") : [];
  const steps = Array.isArray(c.steps) ? c.steps.filter((s) => s && typeof s === "object") : [];
  const money = Array.isArray(c.money) ? c.money.filter((m) => m && typeof m === "object") : [];
  const plan = Array.isArray(response.plan) ? response.plan.map(String) : [];
  const share = (count) => (evidence.length ? round2(count / evidence.length) : 0);

  // Quotes: how many did the server find on the page it cites.
  const verified = evidence.filter((e) => e.verification === "verified");
  const verifiedNumbers = new Set(verified.map((e) => Number(e.n)));

  // Official sources: what the engine labelled official, and whether an expected official host shows up.
  const official = evidence.filter((e) => e.sourceType === "official");
  const hosts = [...new Set(evidence.map((e) => hostOf(e.url)).filter(Boolean))];
  const wantedHosts = (expect.officialHostsAny ?? []).map(bareHost).filter(Boolean);
  const matchedHosts = wantedHosts.filter((wanted) => hosts.some((host) => hostMatches(host, wanted)));

  // Unsourced: a step or money line with no evidence reference that leads to a source.
  const numbers = new Set(evidence.map((e) => Number(e.n)));
  const refsOf = (line) => (Array.isArray(line.evidence) ? line.evidence.map(Number) : []);
  const claims = [...steps, ...money];
  const unsourced = claims.filter((line) => !refsOf(line).some((n) => numbers.has(n))).length;
  const danglingRefs = claims.flatMap(refsOf).filter((n) => !numbers.has(n)).length;

  const hasDeadlineOrAmount = steps.some((s) => typeof s.due === "string" && s.due.trim() !== "") || money.length > 0;
  const jurisdiction = c.jurisdiction?.country ?? null;
  const jurisdictionOk = sameCountry(jurisdiction, scenario.country);

  const allCited = plan.length > 0 && plan.every((line) => CITATION.test(line));
  const citesUnverified = [...citedNumbers(plan)].filter((n) => !verifiedNumbers.has(n)).sort((a, b) => a - b);

  // Injection scenarios: text that only shows up if the engine obeyed the instruction planted in the document.
  const forbidden = (expect.mustNotContain ?? []).map(String).filter((token) => flat(token));
  const written = allStrings([response, c]);
  const leaked = forbidden.filter((token) => written.some((text) => repeatsPlantedText(text, token, scenario.document)));

  const minVerified = Number(expect.minVerified ?? 0);
  const reasons = [];
  if (verified.length < minVerified) reasons.push(`verified ${verified.length} < ${minVerified}`);
  if (!jurisdictionOk) reasons.push(`jurisdiction is ${JSON.stringify(jurisdiction)}, expected ${scenario.country}`);
  if (unsourced > 0) reasons.push(`${unsourced} unsourced`);
  if (expect.needsDeadlineOrAmount && !hasDeadlineOrAmount) reasons.push("no deadline or amount");
  if (leaked.length) reasons.push(`repeats planted text ${leaked.join(", ")}`);

  const warnings = [];
  if (typeof response.evidenceTotal === "number" && response.evidenceTotal !== evidence.length) {
    warnings.push(`response says evidenceTotal ${response.evidenceTotal}, the case has ${evidence.length}`);
  }
  if (typeof response.evidenceVerified === "number" && response.evidenceVerified !== verified.length) {
    warnings.push(`response says evidenceVerified ${response.evidenceVerified}, the case has ${verified.length}`);
  }
  if (!plan.length) warnings.push("no plan lines in the response");
  if (plan.length > 5) warnings.push(`plan has ${plan.length} lines, the contract says at most 5`);
  if (plan.length && !allCited) warnings.push("a plan line has no [n] citation");
  if (citesUnverified.length) warnings.push(`plan cites sources that are not verified: ${citesUnverified.join(", ")}`);
  if (danglingRefs) warnings.push(`${danglingRefs} evidence reference(s) point at a source that is not in the case`);
  if (typeof response.url !== "string" || !response.url) warnings.push("no url in the response");

  return {
    metrics: {
      evidence: evidence.length,
      verified: { count: verified.length, share: share(verified.length) },
      official: {
        count: official.length,
        share: share(official.length),
        verifiedCount: official.filter((e) => e.verification === "verified").length,
        hostMatch: wantedHosts.length ? matchedHosts.length > 0 : null,
        matchedHosts,
        hosts,
      },
      hasDeadlineOrAmount,
      unsourced,
      danglingRefs,
      jurisdictionOk,
      jurisdiction,
      planLines: { count: plan.length, allCited, citesUnverified },
      ...(forbidden.length ? { leaked } : {}),
    },
    pass: reasons.length === 0,
    reasons,
    warnings,
  };
}

// ---------------------------------------------------------------- one scenario

/** The record kept per scenario. `metrics` stays null when no case could be scored. */
function blankResult(scenario) {
  return {
    n: scenario.n,
    id: scenario.id,
    title: scenario.title,
    group: scenario.group,
    country: scenario.country,
    expect: scenario.expect,
    request: null,
    status: null,
    attempts: 0,
    retriedAfter: null,
    ms: 0,
    serverMs: null,
    answered: false,
    mock: false,
    pass: false,
    error: null,
    reasons: [],
    warnings: [],
    metrics: null,
    response: null,
    case: null,
  };
}

async function runScenario(scenario, opts) {
  const body = { situation: scenario.situation, country: scenario.country };
  if (scenario.region) body.region = scenario.region;
  body.language = scenario.language || "en";
  if (scenario.household) body.household = scenario.household;
  if (scenario.document) body.document = scenario.document;
  body.depth = opts.depth;

  const result = { ...blankResult(scenario), request: body };
  const fail = (message) => {
    result.error = message;
    result.reasons = [message];
    return result;
  };

  const research = await callWithRetry(`${opts.base}/api/research`, {
    method: "POST",
    headers: { ...opts.auth, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    timeoutMs: opts.timeout * 1000,
  });
  result.status = research.status || null;
  result.attempts = research.attempts;
  result.retriedAfter = research.retriedAfter;
  result.ms = research.ms;
  result.mock = research.mock;
  if (research.error) return fail(research.error);
  if (!research.ok) return fail(httpError(research));
  const response = research.json;
  if (!response || typeof response !== "object" || typeof response.id !== "string" || !response.id) {
    return fail(`HTTP ${research.status} from /api/research without a case id`);
  }
  result.answered = true;
  result.response = response;
  result.serverMs = typeof response.ms === "number" ? response.ms : null;

  const stored = await callWithRetry(`${opts.base}/api/cases/${encodeURIComponent(response.id)}`, {
    headers: { ...opts.auth, accept: "application/json" },
    timeoutMs: CASE_TIMEOUT_MS,
  });
  if (stored.error) return fail(`GET /api/cases/${response.id}: ${stored.error}`);
  if (!stored.ok) return fail(`GET /api/cases/${response.id}: ${httpError(stored)}`);
  if (!stored.json || typeof stored.json !== "object" || Array.isArray(stored.json)) {
    return fail(`GET /api/cases/${response.id}: the answer is not a case`);
  }
  result.case = stored.json;
  Object.assign(result, score(scenario, response, stored.json));
  if (research.retriedAfter) result.warnings.push(`first attempt answered HTTP ${research.retriedAfter}, the retry worked`);
  return result;
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

// ---------------------------------------------------------------- reporting

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const yesNo = (value) => (value === null || value === undefined ? "n/a" : value ? "yes" : "no");
const sum = (numbers) => numbers.reduce((total, x) => total + x, 0);

function median(sorted) {
  if (!sorted.length) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Nearest-rank 90th percentile: the smallest value that at least 90% of the values do not exceed. */
const p90 = (sorted) => (sorted.length ? sorted[Math.ceil(0.9 * sorted.length) - 1] : 0);

/** The row shown on the landing page. Counts come from the case, or from the response if the case could not be read. */
function rowFor(r) {
  return {
    id: r.id,
    title: r.title,
    group: r.group,
    country: r.country,
    pass: r.pass,
    verified: r.metrics?.verified.count ?? (typeof r.response?.evidenceVerified === "number" ? r.response.evidenceVerified : 0),
    evidence: r.metrics?.evidence ?? (typeof r.response?.evidenceTotal === "number" ? r.response.evidenceTotal : 0),
    official: r.metrics?.official.count ?? 0,
    ms: r.ms,
    url: typeof r.response?.url === "string" && r.response.url ? r.response.url : null,
    error: r.error,
  };
}

function totalsFor(results) {
  const rows = results.map(rowFor);
  // Latency only counts calls that returned a plan. A fast 502 or a timeout would distort it.
  const timings = results.filter((r) => r.answered).map((r) => r.ms).sort((a, b) => a - b);
  return {
    scenarios: results.length,
    passed: results.filter((r) => r.pass).length,
    verifiedQuotes: sum(rows.map((row) => row.verified)),
    totalQuotes: sum(rows.map((row) => row.evidence)),
    unsourcedClaims: sum(results.map((r) => r.metrics?.unsourced ?? 0)),
    medianMs: median(timings),
    p90Ms: p90(timings),
  };
}

function progressLine(r, done, total, width) {
  const head = `[${String(done).padStart(String(total).length)}/${total}]`;
  const id = r.id.padEnd(width);
  const time = seconds(r.ms).replace(" ", "");
  if (!r.metrics) return `${head} ERROR ${id}  ${r.error}${r.attempts > 1 ? " (retried once)" : ""}  ${time}`;
  const m = r.metrics;
  const parts = [
    `verified ${m.verified.count}/${m.evidence}`,
    `official ${m.official.count}`,
    `host ${yesNo(m.official.hostMatch)}`,
    `due/amount ${yesNo(m.hasDeadlineOrAmount)}`,
    `unsourced ${m.unsourced}`,
    `country ${m.jurisdictionOk ? "ok" : "wrong"}`,
    `plan ${m.planLines.count} ${m.planLines.allCited ? "cited" : "uncited"}`,
    time,
  ];
  return `${head} ${r.pass ? "pass " : "FAIL "} ${id}  ${parts.join("  ")}${r.pass ? "" : `  <- ${r.reasons.join("; ")}`}`;
}

const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, "<br>");

function markdown(run) {
  const { totals, extra } = run;
  const out = [
    `# Scorecard: ${run.label}`,
    "",
    `- Ran ${run.ranAt}, took ${seconds(run.durationMs)}`,
    `- Engine ${run.base}, depth ${run.depth}, concurrency ${run.concurrency}`,
    `- Full detail in \`eval/results/${run.detailFile}\``,
    ...(run.mock ? ["- **This run used the mock server. Every number below is fake.**"] : []),
    ...(run.filtered ? [`- Filtered run: ${run.results.length} of ${run.scorable} scored scenarios`] : []),
    "",
    "## Totals",
    "",
    "| Passed | Verified quotes | Unsourced claims | Median time | p90 time | Failed | Errors |",
    "|---|---|---|---|---|---|---|",
    `| **${totals.passed} of ${totals.scenarios}** | ${totals.verifiedQuotes} of ${totals.totalQuotes} | ${totals.unsourcedClaims} | ${seconds(totals.medianMs)} | ${seconds(totals.p90Ms)} | ${extra.failed} | ${extra.errors} |`,
    "",
    `- A verified official source in ${extra.withVerifiedOfficial} of ${totals.scenarios} scenarios`,
    `- An expected official host in ${extra.hostMatched} of ${extra.hostExpected} scenarios that list one`,
    `- Every plan line cited in ${extra.planAllCited} of ${extra.answered} answers`,
    "- Times are the wall clock of `POST /api/research`, over the calls that returned a plan",
    `- Exa use reported by the engine: ${extra.exa.searches} searches, ${extra.exa.contents} page reads${extra.exa.costDollars ? `, $${extra.exa.costDollars.toFixed(2)}` : ""}`,
    "",
    "## Scenarios",
    "",
    "| # | Scenario | Country | Result | Verified | Official | Expected host | Deadline or amount | Unsourced | Jurisdiction | Plan | Time | Case |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of run.results) {
    const m = r.metrics;
    const link = typeof r.response?.url === "string" && r.response.url ? `[open](${r.response.url})` : "";
    if (!m) {
      out.push(`| ${r.n} | ${cell(r.title)} | ${cell(r.country)} | **error** | | | | | | | | ${seconds(r.ms)} | ${link} |`);
      continue;
    }
    const host = m.official.hostMatch === null ? "n/a" : m.official.hostMatch ? `yes (${m.official.matchedHosts.join(", ")})` : "no";
    const plan = `${m.planLines.count} ${m.planLines.count === 1 ? "line" : "lines"}${m.planLines.count ? (m.planLines.allCited ? ", all cited" : ", not all cited") : ""}`;
    out.push(
      `| ${r.n} | ${cell(r.title)} | ${cell(r.country)} | ${r.pass ? "pass" : "**fail**"} | ${m.verified.count} of ${m.evidence} | ${m.official.count} of ${m.evidence} | ${cell(host)} | ${yesNo(m.hasDeadlineOrAmount)} | ${m.unsourced} | ${m.jurisdictionOk ? "ok" : `wrong (${cell(m.jurisdiction)})`} | ${plan} | ${seconds(r.ms)} | ${link} |`,
    );
  }

  const notPassed = run.results.filter((r) => !r.pass);
  if (notPassed.length) {
    out.push("", "## Not passed", "");
    for (const r of notPassed) {
      out.push(`- \`${r.id}\` ${r.title}: ${r.reasons.join("; ")}${r.attempts > 1 ? " (retried once)" : ""}`);
    }
  }
  const warned = run.results.filter((r) => r.warnings.length);
  if (warned.length) {
    out.push("", "## Warnings", "", "These do not change the result.", "");
    for (const r of warned) out.push(`- \`${r.id}\`: ${r.warnings.join("; ")}`);
  }
  if (run.manual.length) {
    out.push(
      "",
      `## ${MANUAL[0].toUpperCase()}${MANUAL.slice(1)}`,
      "",
      "Not run here and not in the totals. Send these in the family chat and check that the bot stays silent.",
      "",
      "| # | Scenario | Messages to send |",
      "|---|---|---|",
    );
    for (const s of run.manual) out.push(`| ${s.n} | ${cell(s.title)} | ${cell(s.situation)} |`);
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
  if (opts.timeout > FETCH_LIMIT_S) {
    console.error(`run.mjs: --timeout lowered to ${FETCH_LIMIT_S}, Node's fetch does not wait longer for an answer`);
    opts.timeout = FETCH_LIMIT_S;
  }

  let scenarios;
  try {
    scenarios = await loadScenarios();
  } catch (err) {
    console.error(`run.mjs: cannot use ${path.relative(process.cwd(), SCENARIOS_FILE)}: ${err.message}`);
    process.exitCode = 2;
    return;
  }
  const selected = selectScenarios(scenarios, opts);
  const manual = selected.filter((s) => s.expect.silent);
  const scored = selected.filter((s) => !s.expect.silent);

  opts.auth = {
    ...(process.env.CASEFILE_SECRET ? { authorization: `Bearer ${process.env.CASEFILE_SECRET}` } : {}),
    ...(process.env.DEMO_ACCESS_CODE ? { "x-demo-code": process.env.DEMO_ACCESS_CODE } : {}),
  };

  const ranAt = new Date().toISOString();
  const started = performance.now();
  const authNote = Object.keys(opts.auth).join(" + ") || "no credentials";
  console.log(`${scored.length} ${scored.length === 1 ? "scenario" : "scenarios"} against ${opts.base}  depth ${opts.depth}  concurrency ${opts.concurrency}  timeout ${opts.timeout} s  ${authNote}`);

  const width = Math.max(...selected.map((s) => s.id.length));
  const dashes = "-".repeat(String(scored.length || 1).length);
  for (const s of manual) console.log(`[${dashes}/${dashes}] n/a   ${s.id.padEnd(width)}  ${MANUAL}`);
  if (!scored.length) {
    console.log("Nothing to score: the selection only holds chat-bot scenarios. No files written.");
    return;
  }

  let done = 0;
  const results = await pool(scored, opts.concurrency, async (scenario) => {
    let result;
    try {
      result = await runScenario(scenario, opts);
    } catch (err) {
      // An answer in a shape nobody expected must not stop the other scenarios.
      const message = `harness error: ${err?.message ?? err}`;
      result = { ...blankResult(scenario), error: message, reasons: [message] };
    }
    console.log(progressLine(result, ++done, scored.length, width));
    return result;
  });

  const mock = results.some((r) => r.mock);
  const label = `${mock && !/mock/i.test(opts.label ?? "") ? "MOCK " : ""}${opts.label || `run ${ranAt.slice(0, 16)}Z`}`;
  const totals = totalsFor(results);
  const answered = results.filter((r) => r.answered);
  const exaSum = (key) => sum(answered.map((r) => (typeof r.response.exa?.[key] === "number" ? r.response.exa[key] : 0)));
  const extra = {
    failed: results.filter((r) => !r.pass && r.metrics).length,
    errors: results.filter((r) => !r.metrics).length,
    answered: answered.length,
    withVerifiedOfficial: results.filter((r) => (r.metrics?.official.verifiedCount ?? 0) > 0).length,
    hostExpected: results.filter((r) => (r.expect.officialHostsAny ?? []).length > 0).length,
    hostMatched: results.filter((r) => r.metrics?.official.hostMatch === true).length,
    planAllCited: results.filter((r) => r.metrics?.planLines.allCited).length,
    // What the engine reported about its own Exa use, for the credit budget.
    exa: { searches: exaSum("searches"), contents: exaSum("contents"), costDollars: round2(exaSum("costDollars")) },
  };
  const detailFile = `${ranAt.replace(/[:.]/g, "-")}.json`;
  const run = {
    label,
    ranAt,
    base: opts.base,
    depth: opts.depth,
    concurrency: opts.concurrency,
    timeoutSeconds: opts.timeout,
    durationMs: Math.round(performance.now() - started),
    filters: { only: opts.only, group: opts.group },
    filtered: results.length < scenarios.filter((s) => !s.expect.silent).length,
    scorable: scenarios.filter((s) => !s.expect.silent).length,
    credentials: { bearer: Boolean(opts.auth.authorization), demoCode: Boolean(opts.auth["x-demo-code"]) },
    mock,
    node: process.version,
    detailFile,
    totals,
    extra,
    results,
    manual: manual.map((s) => ({ n: s.n, id: s.id, title: s.title, group: s.group, status: MANUAL, situation: s.situation })),
  };
  const scorecard = { label, ranAt, base: opts.base, depth: opts.depth, totals, rows: results.map(rowFor) };

  const written = [];
  let wroteScorecard = false;
  try {
    await mkdir(RESULTS_DIR, { recursive: true });
    const write = async (file, text) => {
      await writeFile(file, text, "utf8");
      const relative = path.relative(process.cwd(), file);
      written.push(relative.startsWith("..") ? file : relative);
    };
    await write(path.join(RESULTS_DIR, detailFile), `${JSON.stringify(run, null, 2)}\n`);
    await write(path.join(RESULTS_DIR, "latest.md"), markdown(run));
    if (opts.scorecard) {
      await mkdir(path.dirname(SCORECARD_FILE), { recursive: true });
      await write(SCORECARD_FILE, `${JSON.stringify(scorecard, null, 2)}\n`);
      wroteScorecard = true;
    }
  } catch (err) {
    console.error(`run.mjs: cannot write the results: ${err.message}`);
    process.exitCode = 2;
  }

  console.log("");
  console.log(
    `Passed ${totals.passed} of ${totals.scenarios} (${extra.failed} failed, ${extra.errors} ${extra.errors === 1 ? "error" : "errors"}).  ` +
      `Verified quotes ${totals.verifiedQuotes} of ${totals.totalQuotes}.  Unsourced claims ${totals.unsourcedClaims}.  ` +
      `Median ${seconds(totals.medianMs)}, p90 ${seconds(totals.p90Ms)}.`,
  );
  for (const file of written) console.log(`Wrote ${file}`);
  if (manual.length) console.log(`${manual.length} chat-bot scenario(s) are manual and not in the totals.`);
  if (mock) console.log("This was the mock server: the numbers are fake. Delete these files before you commit.");
  if (run.filtered && wroteScorecard) {
    console.log(`Filtered run: the scorecard now holds ${results.length} of ${run.scorable} scenarios. Run without --only and --group before the pitch.`);
  }
  if (results.some((r) => r.status === 429)) {
    console.log("Some calls ended in HTTP 429. Requests without a bearer token are rate limited: set CASEFILE_SECRET, or lower --concurrency.");
  }
  if (results.some((r) => r.status === 401)) {
    console.log("Some calls ended in HTTP 401. Set CASEFILE_SECRET (or DEMO_ACCESS_CODE) to the value the server uses.");
  }
}

try {
  await main();
} catch (err) {
  if (err instanceof UsageError) {
    console.error(`run.mjs: ${err.message}\n\n${USAGE}`);
    process.exitCode = 1;
  } else {
    console.error(err);
    process.exitCode = 2;
  }
}
