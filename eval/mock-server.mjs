#!/usr/bin/env node
// Mock research engine, only for testing eval/run.mjs. Fake data, no network calls, nothing written to disk.
// Usage: node eval/mock-server.mjs [--port 4010]
//
// Implements POST /api/research and GET /api/cases/:id as described in docs/CONTRACTS.md.
// A request is matched to a scenario by its exact `situation` text from eval/scenarios.json.
// Every scenario returns a clean, passing case, except the four listed in SPECIAL.
//
// If CASEFILE_SECRET or DEMO_ACCESS_CODE is set in the mock's own environment, POST /api/research
// needs the matching header and answers 401 otherwise, like the real API.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

/** The scenarios that do not simply pass. */
const SPECIAL = {
  "fi-parking-fine": "unverified", // one of its two quotes fails verification, so 1 verified, below minVerified
  "subscription-price-rise": "unsourced", // one step has an empty evidence array
  "flight-cancelled": "http502", // every call answers 502
  "gb-train-delay": "slow", // answers after 3 seconds, then passes
};
const SLOW_MS = 3000;
/** Normal answers take 60 ms plus 20 ms per position in scenarios.json, so latency stats are predictable. */
const delayFor = (index) => 60 + 20 * index;
const FIXED_TIME = "2026-11-14T10:00:00.000Z";
/** How the fake engine names the country in the stored case. DE is echoed as sent. */
const COUNTRY_NAMES = { FI: "Finland", US: "United States", GB: "UK", NL: "The Netherlands" };

function usage(message) {
  if (message) console.error(`mock-server: ${message}`);
  console.error("Usage: node eval/mock-server.mjs [--port 4010]");
  process.exit(1);
}

let port = 4010;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const [flag, inline] = argv[i].split(/=(.*)/s);
  if (flag !== "--port") usage(`unknown argument ${argv[i]}`);
  port = Number(inline ?? argv[++i]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) usage("--port needs a number from 1 to 65535");
}

const scenarios = JSON.parse(readFileSync(new URL("./scenarios.json", import.meta.url), "utf8"));
const bySituation = new Map(scenarios.map((scenario, index) => [scenario.situation.trim(), { scenario, index }]));
const cases = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "x-casefile-mock": "1",
  });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function authorised(req) {
  const secret = process.env.CASEFILE_SECRET;
  const code = process.env.DEMO_ACCESS_CODE;
  if (!secret && !code) return true;
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  return Boolean((secret && bearer === secret) || (code && req.headers["x-demo-code"] === code));
}

/** Same input rules as the contract. Returns an error message, or null when the body is fine. */
function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "body must be a JSON object";
  const { situation, country, depth } = body;
  if (typeof situation !== "string" || situation.length < 10 || situation.length > 1500) {
    return "situation is required, 10 to 1500 characters";
  }
  if (typeof country !== "string" || country.trim().length < 2) return "country is required";
  if (depth !== undefined && depth !== "fast" && depth !== "deep") return "depth must be fast or deep";
  for (const key of ["region", "language", "household", "document"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") return `${key} must be a string`;
  }
  return null;
}

/** A stored case in the shape of `Case` in src/lib/case.ts. Everything in it is made up. */
function buildCase(scenario, index, kind, body) {
  const hosts = scenario.expect?.officialHostsAny ?? [];
  const needsDeadline = scenario.expect?.needsDeadlineOrAmount !== false;
  const total = kind === "unverified" ? 2 : 3 + (index % 3);

  const evidence = Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    // Official hosts when the scenario lists some. Odd positions in the file end on one secondary source.
    const official = hosts.length > 0 && !(index % 2 === 1 && n === total);
    const host = hosts[i % Math.max(hosts.length, 1)];
    const failed = kind === "unverified" && n === total;
    return {
      n,
      url: official ? `https://${n % 2 ? "www" : "mock"}.${host}/mock/${scenario.id}/${n}` : `https://example.org/mock/${scenario.id}/${n}`,
      title: `Mock source ${n} for ${scenario.id}`,
      publisher: official ? host : "Example blog",
      quote: `Mock quote ${n} for ${scenario.id}: the sentence this claim rests on.`,
      sourceType: official ? "official" : "secondary",
      fetchedAt: FIXED_TIME,
      verification: failed ? "not_found" : "verified",
      match: failed ? 0.35 : 1,
    };
  });

  const steps = [1, 2, 3].map((k) => ({
    id: `mock-step-${k}`,
    title: `Mock step ${k} for ${scenario.id}`,
    detail: "Fake detail from the mock server.",
    owner: k === 1 ? "Anna" : "Mikko",
    ...(needsDeadline && k < 3 ? { due: k === 1 ? "2026-12-01" : "Within 2 weeks" } : {}),
    status: "todo",
    evidence: kind === "unsourced" && k === 3 ? [] : [Math.min(k, total)],
  }));

  const money = needsDeadline
    ? [{ label: `Mock amount for ${scenario.id}`, amount: "123.45 € per month", note: "Fake.", evidence: [1] }]
    : [];

  const failedNumbers = new Set(evidence.filter((e) => e.verification !== "verified").map((e) => e.n));
  const country = String(body.country).trim();

  return {
    title: `Mock case: ${scenario.title}`,
    event: scenario.id.replace(/-/g, "_"),
    language: body.language ?? "en",
    jurisdiction: {
      country: COUNTRY_NAMES[country.toUpperCase()] ?? country,
      ...(body.region ? { region: body.region } : {}),
    },
    summary: "Fake case from eval/mock-server.mjs. Not real research.",
    steps,
    money,
    evidence,
    drafts: [],
    unverified: steps.filter((s) => s.evidence.some((n) => failedNumbers.has(n))).map((s) => s.title),
    openQuestions: ["Mock open question: what is the exact date?"],
    id: createHash("sha256")
      .update(`${scenario.id}|${body.situation}|${body.depth ?? "fast"}`)
      .digest("base64url")
      .slice(0, 16),
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  };
}

/** The POST /api/research answer for a case. Lines that rest on a failed quote stay out of the plan. */
function researchResponse(c, origin, ms, index) {
  const verified = new Set(c.evidence.filter((e) => e.verification === "verified").map((e) => e.n));
  const lines = [
    ...c.steps.map((s) => ({ text: s.due ? `${s.title}, due ${s.due}` : s.title, refs: s.evidence })),
    ...c.money.map((m) => ({ text: `${m.label}: ${m.amount}`, refs: m.evidence })),
  ];
  return {
    id: c.id,
    url: `${origin}/c/${c.id}`,
    title: c.title,
    plan: lines
      .filter((line) => line.refs.every((n) => verified.has(n)))
      .slice(0, 5)
      .map((line) => [line.text, ...line.refs.map((n) => `[${n}]`)].join(" ")),
    evidenceTotal: c.evidence.length,
    evidenceVerified: verified.size,
    unverified: c.unverified,
    openQuestions: c.openQuestions,
    ms,
    // costDollars is not in the contract, but the engine reports it and the harness adds it up.
    exa: { searches: 3 + (index % 3), contents: c.evidence.length, costDollars: 0.01 * (3 + (index % 3)) },
  };
}

async function research(req, res, origin) {
  if (!authorised(req)) return send(res, 401, { error: "missing or wrong credentials" });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return send(res, 400, { error: "body must be JSON" });
  }
  const problem = validate(body);
  if (problem) return send(res, 400, { error: problem });

  const known = bySituation.get(body.situation.trim());
  const scenario = known?.scenario ?? { id: "unknown", title: "Unknown situation", expect: {} };
  const index = known?.index ?? 0;
  const kind = SPECIAL[scenario.id] ?? "pass";
  if (kind === "http502") {
    console.log(`POST /api/research  ${scenario.id}  502`);
    return send(res, 502, { error: "Exa failed (mock)" });
  }

  const ms = kind === "slow" ? SLOW_MS : delayFor(index);
  await sleep(ms);
  const c = buildCase(scenario, index, kind, body);
  cases.set(c.id, c);
  console.log(`POST /api/research  ${scenario.id}  200  ${kind}  ${ms} ms`);
  send(res, 200, researchResponse(c, origin, ms, index));
}

const server = createServer((req, res) => {
  const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
  const { pathname } = new URL(req.url ?? "/", origin);
  const caseId = pathname.match(/^\/api\/cases\/([^/]+)\/?$/)?.[1];

  if (pathname === "/api/research") {
    if (req.method !== "POST") return send(res, 405, { error: "use POST" });
    research(req, res, origin).catch((err) => send(res, 500, { error: String(err?.message ?? err) }));
    return;
  }
  if (caseId) {
    if (req.method !== "GET") return send(res, 405, { error: "the mock only reads cases" });
    const found = cases.get(caseId);
    return found ? send(res, 200, found) : send(res, 404, { error: "not found" });
  }
  send(res, 404, { error: "not found" });
});

server.on("error", (err) => {
  console.error(`mock-server: ${err.message}`);
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Mock research engine on http://localhost:${port} (fake data, ${scenarios.length} scenarios known)`);
  console.log(`Special cases: ${Object.entries(SPECIAL).map(([id, kind]) => `${id}=${kind}`).join(", ")}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  });
}
