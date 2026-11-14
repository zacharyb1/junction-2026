// Run with Node 22.18+: node --test scripts/cases.test.mjs
// Real case operations and quote matching; storage and page reads stay offline.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { after, beforeEach } from "node:test";

const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const storeUrl = moduleUrl(`
  const cases = new Map();
  export let pages = new Map();
  export const reset = () => { cases.clear(); pages = new Map(); };
  export const setPage = (url, page) => pages.set(url, page);
  export const loadCase = async id => structuredClone(cases.get(id) ?? null);
  export const saveCase = async value => cases.set(value.id, structuredClone(value));
`);
const verifierUrl = moduleUrl(`
  import { verifyEvidence as verify } from ${JSON.stringify(new URL("../src/lib/verify.ts", import.meta.url).href)};
  import { pages } from ${JSON.stringify(storeUrl)};
  export const verifyEvidence = (items, cached, options) => verify(items, new Map(items.map(item => [
    item.url, cached?.has(item.url) ? cached.get(item.url) : pages.get(item.url) ?? null,
  ])), options);
`);
const aliases = new Map([
  ["@/lib/store", storeUrl],
  ["@/lib/verify", verifierUrl],
  ["@/lib/text", new URL("../src/lib/text.ts", import.meta.url).href],
  // The real contract: cases.ts now takes several helpers from it, not only verifiedCount.
  ["@/lib/case", new URL("../src/lib/case.ts", import.meta.url).href],
  ["nanoid", moduleUrl('let n = 0; export const nanoid = () => `testcase${String(++n).padStart(8, "0")}`;')],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = aliases.get(specifier);
    return url ? { url, shortCircuit: true } : nextResolve(specifier, context);
  },
});
const { publishCase, updateCase, recheckCase } = await import("../src/lib/cases.ts");
const { loadCase, reset, setPage } = await import(storeUrl);
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error("These regressions must not use the network");
};
beforeEach(() => reset());
after(() => {
  globalThis.fetch = originalFetch;
  hooks.deregister();
  assert.equal(networkCalls, 0);
});

const origin = "https://case.test";
const quote = "The payment is 100 euros for applicants who meet the eligibility requirements.";
const evidence = (n = 1) => ({ n, url: `https://source.test/${n}`, title: `Source ${n}`, quote, sourceType: "official" });
const page = (text = quote) => ({ direct: text, exa: null, oxylabs: null, text });
const step = (title, refs = [1]) => ({ title, evidence: refs, status: "todo" });
const amount = (label, refs = [1]) => ({ label, amount: "100 euros", evidence: refs });
const input = (extra = {}) => ({
  title: "Application", event: "application", language: "en", jurisdiction: { country: "FI" },
  summary: "Application research", steps: [], money: [], evidence: [], drafts: [], unverified: [], openQuestions: [],
  ...extra,
});
async function publishVerified(extra = {}) {
  setPage(evidence().url, page());
  return publishCase(input({ evidence: [evidence()], steps: [step("Apply")], money: [amount("Payment")], ...extra }), origin);
}

test("publication withholds amounts without unambiguous verified citations and preserves steps", async () => {
  setPage(evidence(1).url, page());
  setPage(evidence(2).url, page("This source discusses an unrelated topic."));
  setPage(evidence(3).url, page());
  const result = await publishCase(input({
    evidence: [evidence(1), evidence(2), evidence(3), evidence(3)],
    steps: [step("No citation", [])],
    money: [amount("Valid"), amount("No citation", []), amount("Missing citation", [99]), amount("Failed citation", [1, 2]), amount("Ambiguous citation", [3])],
    unverified: ["An existing unanswered question."],
  }), origin);
  const saved = await loadCase(result.id);
  assert.deepEqual(saved.money.map(m => m.label), ["Valid"]);
  assert.deepEqual(saved.steps.map(s => s.title), ["No citation"]);
  assert.equal(saved.evidence.length, 4);
  assert.deepEqual(result.failed.map(e => e.n), [2]);
  assert.ok(saved.unverified.some(s => s.includes('Amount "No citation"')));
  assert.ok(saved.unverified.some(s => s.includes('Amount "Failed citation"')));
  assert.ok(saved.unverified.includes("An existing unanswered question."));
});

test("empty-evidence advice and unconfirmed step retention stay unchanged", async () => {
  const result = await publishCase(input({ steps: [step("Unconfirmed step", [])], money: [amount("Unconfirmed amount", [])] }), origin);
  const saved = await loadCase(result.id);
  assert.equal(saved.steps.length, 1);
  assert.equal(saved.money.length, 0);
  assert.match(result.advice, /This case has no evidence, so nothing in it is confirmed/);
});

test("updates withhold old and new unsupported amounts and allow corrected amounts later", async () => {
  const published = await publishVerified();
  const result = await updateCase(published.id, {
    evidence: [{ ...evidence(), quote: "This replacement quote is not on the cited page." }],
    money: [amount("New unsupported payment", [])],
    drafts: [{ title: "Notice", kind: "letter", body: "A draft for review." }],
  }, origin);
  const failed = await loadCase(published.id);
  assert.equal(failed.money.length, 0);
  assert.equal(failed.steps.length, 1);
  assert.equal(failed.drafts.length, 1);
  assert.deepEqual(result.failed.map(e => e.n), [1]);
  assert.ok(failed.unverified.some(s => s.includes('Amount "Payment"')));

  await updateCase(published.id, { evidence: [evidence()], money: [amount("Payment")] }, origin);
  const corrected = await loadCase(published.id);
  assert.deepEqual(corrected.money.map(m => m.label), ["Payment"]);
  assert.equal(corrected.unverified.some(s => s.includes('Amount "Payment"')), false);
  assert.ok(corrected.unverified.some(s => s.includes('Amount "New unsupported payment"')));
});

test("partial updates retain step IDs, omitted fields and supported money references", async () => {
  const published = await publishVerified({ steps: [{ ...step("Apply"), id: "stable-step", owner: "Anna", due: "2027-01-01" }] });
  await updateCase(published.id, {
    steps: [{ title: "Apply", status: "done" }, { title: "Ask a question" }],
    money: [{ label: "Payment", amount: "100 euros", note: "Updated note" }],
  }, origin);
  const updated = await loadCase(published.id);
  assert.deepEqual(updated.steps[0], { ...step("Apply"), id: "stable-step", status: "done", owner: "Anna", due: "2027-01-01" });
  assert.equal(updated.steps[1].status, "todo");
  assert.deepEqual(updated.steps[1].evidence, []);
  assert.deepEqual(updated.money[0].evidence, [1]);
  assert.equal(updated.money[0].note, "Updated note");
  assert.deepEqual(updated.unverified, []);
});

test("outages report unreachable separately and retain the last confirmed state", async () => {
  const published = await publishVerified();
  const initial = await loadCase(published.id);
  setPage(evidence().url, null);
  for (let i = 0; i < 2; i++) {
    const outage = await recheckCase(published.id);
    assert.deepEqual(outage.changed, []);
    assert.deepEqual(outage.unreachable, [1]);
    assert.deepEqual(outage.case.evidence, initial.evidence);
  }
  setPage(evidence().url, page("The cited statement has been removed from this page."));
  const changed = await recheckCase(published.id);
  assert.deepEqual(changed.changed, [1]);
  assert.deepEqual(changed.unreachable, []);
  assert.deepEqual((await recheckCase(published.id)).changed, []);
});

test("change watch uses live evidence even when Exa retains an older matching copy", async () => {
  const published = await publishVerified();
  const live = "The payment statement has been removed from this page.";
  setPage(evidence().url, { direct: live, exa: quote, oxylabs: null, text: `${live}\n${quote}` });
  assert.deepEqual((await recheckCase(published.id)).changed, [1]);
});
