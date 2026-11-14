// Run with Node 22.18+: node --test scripts/verify.test.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { after } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/text") {
      return { url: new URL("../src/lib/text.ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { judge, verifyEvidence } = await import("../src/lib/verify.ts");
after(() => hooks.deregister());

const first = "Applicants must submit the completed application to the authority.";
const second = "The payment is available only after the application is approved.";
const quote = `${first} ${second}`;
const page = (direct, exa, oxylabs = null) => ({
  direct, exa, oxylabs, text: [direct, oxylabs, exa].filter(Boolean).join("\n"),
});

test("publishing does not verify a quote assembled across two page readings", async () => {
  const url = "https://example.org/application";
  const evidence = { n: 1, url, title: "Application", quote, sourceType: "official" };
  const [result] = await verifyEvidence([evidence], new Map([[url, page(first, second)]]));
  assert.equal(result.verification, "not_found");
  assert.equal(result.checkedVia, undefined);
  assert.equal(result.match, 0.4);
});

test("Oxylabs fragments cannot complete another reader's unsupported quote", () => {
  assert.equal(judge(quote, page(first, null, second)).verification, "not_found");
  assert.equal(judge(quote, page(null, second, first)).verification, "not_found");
  assert.equal(judge(quote, page(first, second, first)).verification, "not_found");
});

test("verification reports the individual reading that supports the quote", () => {
  assert.deepEqual(judge(quote, page(quote, second)), {
    verification: "verified", match: 1, checkedVia: "live",
  });
  assert.deepEqual(judge(quote, page(first, quote)), {
    verification: "verified", match: 1, checkedVia: "exa",
  });
  assert.deepEqual(judge(quote, page(first, second, quote)), {
    verification: "verified", match: 1, checkedVia: "oxylabs",
  });
});

test("any individual reading can verify a complete quote", () => {
  assert.equal(judge(quote, page(quote, null)).checkedVia, "live");
  assert.equal(judge(quote, page(null, quote)).checkedVia, "exa");
  assert.equal(judge(quote, page(null, null, quote)).checkedVia, "oxylabs");
  assert.deepEqual(judge(quote, null), { verification: "unreachable", match: 0 });
});

test("change watch still prefers a current live reading over an older Exa copy", () => {
  assert.equal(judge(quote, page(first, quote), true).verification, "not_found");
  assert.equal(judge(quote, page(null, quote, first), true).verification, "not_found");
  assert.equal(judge(quote, page(first, quote, quote), true).checkedVia, "oxylabs");
});
