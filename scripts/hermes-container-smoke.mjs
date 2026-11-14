// Exercise real Hermes configuration and its Engine connection with disposable state.
// No Telegram token/provider credentials or native Hermes home are used.
// node scripts/hermes-container-smoke.mjs [docker|podman] [hermes-image] [web-image]
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const engine = process.argv[2] ?? "docker";
assert.ok(["docker", "podman"].includes(engine));
const image = process.argv[3] ?? "kaveri-hermes:check";
const webImage = process.argv[4] ?? "kaveri-web:check";
const prefix = `kaveri-hermes-check-${randomUUID()}`;
const volume = `${prefix}-home`;
const network = `${prefix}-net`;
const web = `${prefix}-web`;
const holder = `${prefix}-lock`;
const env = {
  TELEGRAM_BOT_TOKEN: "123456789:fake-container-test-token",
  TELEGRAM_ALLOWED_USERS: "12345",
  NVIDIA_API_KEY: "fake-provider-key",
  EXA_API_KEY: "fake-exa-key",
  CASEFILE_SECRET: randomUUID(),
  CASEFILE_URL: "http://web:3000/api/mcp",
  KAVERI_TELEGRAM_CHAT_ID: "-100123456789",
};
const settings = Object.entries(env).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
const mount = ["--volume", `${volume}:/opt/data`];
let volumeCreated = false;
let networkCreated = false;

function result(args) {
  const r = spawnSync(engine, args, { encoding: "utf8", timeout: 240_000 });
  if (r.error) throw r.error;
  return r;
}
function cli(...args) {
  const r = result(args);
  assert.equal(r.status, 0, `${args[0]} failed: ${r.stderr}\n${r.stdout}`);
  return r.stdout.trim();
}
function check(overrides = []) {
  return result(["run", "--rm", "--network", "none", ...mount, ...settings, ...overrides, image, "check"]);
}
function python(code) {
  return cli("run", "--rm", "--network", "none", ...mount,
    "--entrypoint", "/opt/hermes/.venv/bin/python", image, "-c", code);
}

try {
  cli("volume", "create", volume);
  volumeCreated = true;
  const missing = check(["--env", "NVIDIA_API_KEY="]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Missing runtime settings.*NVIDIA_API_KEY/);

  const first = check();
  assert.equal(first.status, 0, `${first.stderr}\n${first.stdout}`);
  assert.match(first.stdout, /UKK configuration passed/);
  python(`
from pathlib import Path
import json
home=Path('/opt/data')
assert not (home/'cron/ticker_heartbeat').exists(), 'check started a scheduler'
assert not Path('/opt/kaveri/.env.local').exists()
assert not Path('/opt/kaveri/.hermes-local').exists()
(home/'memories').mkdir(exist_ok=True)
(home/'memories/MEMORY.md').write_text('Keep this container test memory.\\n')
(home/'cron').mkdir(exist_ok=True)
(home/'cron/jobs.json').write_text('{"jobs": [], "test_marker": "retain me"}\\n')
`);
  const snapshot = () => python(`
from pathlib import Path
import json
h=Path('/opt/data')
print(json.dumps({p:(h/p).read_text() for p in ['memories/MEMORY.md','cron/jobs.json','.kaveri-container.json']}))
`);
  const saved = snapshot();
  const repeated = check();
  assert.equal(repeated.status, 0, `${repeated.stderr}\n${repeated.stdout}`);
  assert.equal(snapshot(), saved, "Configuration must retain private state");
  const other = check(["--env", "TELEGRAM_BOT_TOKEN=987654321:another-test-token"]);
  assert.notEqual(other.status, 0);
  assert.match(other.stderr, /different bot token/);
  assert.equal(snapshot(), saved);

  cli("run", "--detach", "--name", holder, "--network", "none", ...mount,
    "--entrypoint", "/bin/bash", image, "-c",
    "exec 9>/opt/data/.kaveri-runtime.lock; flock 9; touch /opt/data/.smoke-locked; exec sleep 300");
  for (let attempt = 0; attempt < 30; attempt++) {
    if (result(["exec", holder, "test", "-f", "/opt/data/.smoke-locked"]).status === 0) break;
    await delay(200);
  }
  const concurrent = check();
  assert.notEqual(concurrent.status, 0);
  assert.match(concurrent.stderr, /already in use/);
  cli("rm", "--force", holder);

  // Neither test service can reach the internet. Real Hermes discovers the real Engine tools.
  cli("network", "create", "--internal", network);
  networkCreated = true;
  cli("run", "--detach", "--name", web, "--network", network, "--network-alias", "web",
    "--env", `CASEFILE_SECRET=${env.CASEFILE_SECRET}`, "--env", "PUBLIC_BASE_URL=https://kaveri.invalid", webImage);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (result(["exec", web, "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]).status === 0) {
      ready = true;
      break;
    }
    await delay(500);
  }
  assert.ok(ready, "Engine must become ready");
  const mcp = cli("run", "--rm", "--network", network, ...mount, ...settings,
    "--entrypoint", "/opt/hermes/bin/hermes", image, "mcp", "test", "casefile");
  assert.match(mcp, /research_case/, "Hermes must discover the authenticated research tool");
  assert.match(mcp, /case_get/, "Hermes must discover the Case tools");
  cli("run", "--rm", "--network", network, ...settings,
    "--entrypoint", "/opt/hermes/.venv/bin/python", image, "-c", `
import json, os, urllib.request
fixture={'title':'Container link check','event':'container_test','summary':'No external claims.','jurisdiction':{'country':'Finland'}}
request=urllib.request.Request('http://web:3000/api/cases',data=json.dumps(fixture).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+os.environ['CASEFILE_SECRET']})
with urllib.request.urlopen(request,timeout=10) as response:
    case=json.load(response)
assert case['url']=='https://kaveri.invalid/c/'+case['id'], case['url']
`);
  console.log("Passed: offline Hermes setup, gate import, retained state, token/volume guards and authenticated Engine MCP discovery. No Telegram/provider calls.");
} finally {
  for (const name of [holder, web]) result(["rm", "--force", name]);
  if (networkCreated) cli("network", "rm", network);
  if (volumeCreated) cli("volume", "rm", volume);
}
