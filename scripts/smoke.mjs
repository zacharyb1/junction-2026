// Usage: node scripts/smoke.mjs [url]   (default http://localhost:3000)
// Opens the URL headless, fails on HTTP errors, console errors or failed requests, saves a screenshot.
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:3000";
const outDir = "/tmp/demo-check";
mkdirSync(outDir, { recursive: true });

const preinstalled = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(preinstalled) ? { executablePath: preinstalled } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
const failedRequests = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));

const t0 = Date.now();
const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
const ms = Date.now() - t0;
await page.screenshot({ path: `${outDir}/home.png`, fullPage: true });

const health = await page.request.get(new URL("/api/health", url).toString());
const healthBody = health.ok() ? await health.json() : null;

await browser.close();

const status = res?.status() ?? 0;
const ok = status < 400 && consoleErrors.length === 0 && failedRequests.length === 0 && health.ok();
console.log(JSON.stringify({ url, status, ms, health: healthBody, consoleErrors, failedRequests, screenshot: `${outDir}/home.png` }, null, 2));
process.exit(ok ? 0 : 1);
