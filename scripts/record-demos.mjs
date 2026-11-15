// Re-record the existing scripted scenes. This never researches a case or calls a provider.
// Requires the installed Playwright Chromium browser, ffmpeg and a production site:
//   node scripts/record-demos.mjs [http://localhost:3000] [all|chat|browser|talk|calendar|call]
// CHROME_PATH may select an existing Chromium installation instead of Playwright's bundled version.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("playwright/package.json")), "cli.js");
const scenes = {
  chat: { source: "chat-demo/script.ts", name: "telegram", width: 430, height: 900, scale: 2 },
  browser: { source: "browser-demo/browser-demo.tsx", name: "browser", width: 1280, height: 800, scale: 1.5 },
  talk: { source: "talk-demo/talk-demo.tsx", name: "talk", width: 430, height: 900, scale: 2 },
  calendar: { source: "calendar-demo/calendar-demo.tsx", name: "calendar", width: 1280, height: 800, scale: 1.5 },
  call: { source: "call-demo/script.ts", name: "call", width: 430, height: 900, scale: 2 },
};

export function recordDemos(base = "http://localhost:3000", selection = "all") {
  const origin = new URL(base).origin;
  if (!/^https?:/.test(origin) || (selection !== "all" && !Object.hasOwn(scenes, selection))) {
    throw new Error("Usage: node scripts/record-demos.mjs [http://localhost:3000] [all|chat|browser|talk|calendar|call]");
  }
  const dir = mkdtempSync(join(tmpdir(), "aidaddy-demos-"));
  const session = `aidaddy-demos-${process.pid}`;
  const run = (...args) => execFileSync(process.execPath, [cli, "cli", `-s=${session}`, ...args], { cwd: root, encoding: "utf8", timeout: 60_000 });
  try {
    const config = join(dir, "browser.json");
    writeFileSync(config, JSON.stringify({ browser: { browserName: "chromium", launchOptions: { headless: true, chromiumSandbox: true, executablePath: process.env.CHROME_PATH } } }));
    run("open", "about:blank", "--config", config);
    for (const [slug, scene] of Object.entries(scenes)) {
      if (selection !== "all" && selection !== slug) continue;
      const source = readFileSync(join(root, "src/components", scene.source), "utf8");
      const duration = Number(source.match(/export const DURATION = (\d+);/)?.[1]);
      if (!duration) throw new Error(`No replay duration found for ${slug}`);
      const viewport = { width: scene.width, height: scene.height };
      const webm = join(dir, `${slug}.webm`);
      const script = join(dir, "record.js");
      writeFileSync(script, `async page => {
        await page.setViewportSize(${JSON.stringify(viewport)});
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          return url.origin === ${JSON.stringify(origin)} && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
        });
        await page.goto(${JSON.stringify(`${origin}/demo/${slug}?bare=1`)}, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.screencast.start({ path: ${JSON.stringify(webm)}, size: ${JSON.stringify(viewport)}, fps: 25 });
        await page.waitForTimeout(${duration + 1500});
        const text = await page.locator('body').innerText();
        if (!text.includes('AIDaddy')) throw new Error('The replay has unexpected branding');
        await page.screencast.stop();
        await page.unrouteAll();
      }`);
      console.log(`Recording ${slug} (${duration / 1000} seconds)...`);
      const output = run("run-code", `--filename=${script}`);
      if (/### Error/.test(output)) throw new Error(output);
      const target = join(root, `docs/pitch/aidaddy-${scene.name}-demo.mp4`);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-vf", `scale=${scene.width * scene.scale}:${scene.height * scene.scale}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", target], { stdio: "inherit" });
      console.log(`Wrote ${target}`);
    }
  } finally {
    try { run("close"); } finally { rmSync(dir, { recursive: true, force: true }); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  recordDemos(process.argv[2], process.argv[3]);
}
