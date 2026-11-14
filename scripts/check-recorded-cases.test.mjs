import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { checkCaseLinks, recordedCaseIds } from "./check-recorded-cases.mjs";

test("recorded inventory covers the landing, examples, scorecard, and four video demos", async () => {
  const ids = await recordedCaseIds();
  assert.ok(ids.includes("IRZUhuWnAtPEZVHw"));
  for (const id of ["8bfhhPMjACQTVb3z", "VmOaZsrU6ej6MtdN", "awE0ewNWNgPE_nmE", "zPi7P2DsH3CBC7ua"]) assert.ok(ids.includes(id));
  assert.ok(ids.length >= 24);
});

test("the link check fails on missing or wrong cases and passes after exact restoration", async (t) => {
  let mode = "missing";
  const server = http.createServer((req, res) => {
    const api = req.url.startsWith("/api/");
    res.setHeader("Content-Type", api ? "application/json" : "text/html");
    if (mode === "missing") res.writeHead(404).end(api ? '{"error":"not found"}' : "Missing");
    else if (api) res.end(JSON.stringify({ id: mode === "wrong" ? "another_123" : "archived_123", steps: [], evidence: [] }));
    else res.end("<h1>Restored case</h1>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await checkCaseLinks(origin, ["archived_123"]))[0].ok, false);
  mode = "wrong";
  assert.equal((await checkCaseLinks(origin, ["archived_123"]))[0].ok, false);
  mode = "restored";
  assert.equal((await checkCaseLinks(origin, ["archived_123"]))[0].ok, true);
});
