// Run against a built image. Uses fresh disposable state and no provider credentials.
// node scripts/container-smoke.mjs [docker|podman] [image]
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const engine = process.argv[2] ?? "docker";
assert.ok(["docker", "podman"].includes(engine), "Choose docker or podman");
const image = process.argv[3] ?? "kaveri-web:check";
const name = `kaveri-smoke-${randomUUID()}`;
const volume = `${name}-cases`;
const secret = randomUUID();
let volumeCreated = false;

function cli(...args) {
  const result = spawnSync(engine, args, { encoding: "utf8", timeout: 120_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${engine} ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function start() {
  cli("run", "--detach", "--name", name, "--publish", "127.0.0.1::3000",
    "--volume", `${volume}:/app/.data`,
    "--env", `CASEFILE_SECRET=${secret}`, "--env", "BLOB_READ_WRITE_TOKEN=", image);
  const port = cli("port", name, "3000/tcp").split("\n")[0].split(":").at(-1);
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return origin;
    } catch { /* The server may still be starting. */ }
    await delay(500);
  }
  throw new Error(`Container did not become ready: ${cli("logs", name)}`);
}

function stop() {
  cli("stop", "--time", "10", name);
  cli("rm", name);
}

try {
  cli("volume", "create", volume);
  volumeCreated = true;
  let origin = await start();
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  assert.notEqual(cli("exec", name, "id", "-u"), "0", "Server must run without root");
  cli("exec", name, "node", "-e", `
    const fs = require('node:fs');
    for (const path of ['/app/.env.local', '/app/.git', '/app/.hermes-local']) {
      if (fs.existsSync(path)) throw new Error('Private build input found: ' + path);
    }
  `);

  const html = await (await fetch(origin)).text();
  const asset = html.match(/(?:src|href)="([^"\s]*\/_next\/static\/[^"\s]+)"/)?.[1];
  assert.ok(asset, "Landing page must contain a static asset");
  assert.equal((await fetch(new URL(asset, origin))).status, 200, "Static asset must be served");

  const fixture = {
    title: "Container persistence check",
    event: "container_test",
    jurisdiction: { country: "Finland" },
    summary: "A disposable storage test with no claims or external evidence.",
  };
  const request = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fixture) };
  assert.equal((await fetch(`${origin}/api/cases`, request)).status, 401, "Anonymous writes must fail");
  const response = await fetch(`${origin}/api/cases`, {
    ...request, headers: { ...request.headers, authorization: `Bearer ${secret}` },
  });
  assert.equal(response.status, 201, `Authenticated write failed: ${await response.clone().text()}`);
  const published = await response.json();
  assert.equal(published.url, `${origin}/c/${published.id}`, "Returned link must use the reachable origin");
  const before = await (await fetch(`${origin}/api/cases/${published.id}`)).json();
  assert.equal(before.title, fixture.title);

  stop();
  origin = await start();
  const restored = await fetch(`${origin}/api/cases/${published.id}`);
  assert.equal(restored.status, 200, "Case must survive container replacement");
  assert.deepEqual(await restored.json(), before);
  const page = await fetch(`${origin}/c/${published.id}`);
  assert.equal(page.status, 200, "Persisted Case page must render");
  assert.ok((await page.text()).includes(fixture.title));
  console.log("Passed: non-root server, clean image, static assets, write authentication, Case links and persistence across container replacement.");
} finally {
  spawnSync(engine, ["rm", "--force", name], { stdio: "ignore", timeout: 30_000 });
  if (volumeCreated) cli("volume", "rm", volume);
}
