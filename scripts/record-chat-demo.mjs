// Records the /demo/chat replay (issue #33) as docs/pitch/aidaddy-telegram-demo.mp4.
// Needs a running site (pnpm build && pnpm start), Playwright's Chromium and ffmpeg:
//   node scripts/record-chat-demo.mjs [http://localhost:3000]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const dir = mkdtempSync(join(tmpdir(), "chat-demo-"));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 430, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: { dir, size: { width: 860, height: 1800 } },
});
const page = await context.newPage();
// ?bare=1 leaves the site's header and footer out of the recording.
await page.goto(`${base}/demo/chat?bare=1`, { waitUntil: "load" });
await page.waitForTimeout(37_500);
await context.close();
await browser.close();
const webm = join(dir, readdirSync(dir).find((f) => f.endsWith(".webm")));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", "docs/pitch/aidaddy-telegram-demo.mp4"], { stdio: "inherit" });
console.log("wrote docs/pitch/aidaddy-telegram-demo.mp4");
