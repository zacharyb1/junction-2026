// Screenshot and audit script for the landing page.
// Master copy lives in the scratchpad. It is copied to <project>/scripts/.landing-shot.mjs to run
// (so that `playwright` resolves from the project's node_modules) and deleted afterwards.
//
// Usage: node scripts/.landing-shot.mjs <baseUrl> <outDir> <label> [path]
//   baseUrl  e.g. http://localhost:3210
//   outDir   folder for PNGs and the JSON report
//   label    prefix for the files of this run, e.g. "full" or "unset"
//   path     page path, default "/"
//
// Dark mode note: the app's dark variant is class based (`.dark` on an ancestor, see globals.css)
// and nothing sets that class yet, so `prefers-color-scheme: dark` alone changes nothing.
// The "dark" shots therefore add the `dark` class to <html> after the page has loaded.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const base = (process.argv[2] ?? "http://localhost:3210").replace(/\/$/, "");
const outDir = process.argv[3] ?? "/tmp/landing-shots";
const label = process.argv[4] ?? "run";
const pagePath = process.argv[5] ?? "/";
const sections = process.env.SHOT_SECTIONS === "1";
mkdirSync(outDir, { recursive: true });

const preinstalled = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(preinstalled) ? { executablePath: preinstalled } : {});

const iphone = devices["iPhone 14"];
const VIEWS = [
  // deviceScaleFactor 2 instead of the phone's 3 keeps the full-page PNG under Chromium's texture limit.
  { name: "mobile", context: { ...iphone, deviceScaleFactor: 2 } },
  { name: "desktop", context: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 } },
];
const SCHEMES = ["light", "dark"];
const OVERFLOW_WIDTHS = [320, 375, 390, 768, 1024, 1280];

/** Runs in the page. Returns layout and accessibility facts. */
function audit() {
  const doc = document.documentElement;
  const vw = doc.clientWidth;

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.split(/\s+/).slice(0, 4).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  // Elements that stick out of the viewport horizontally.
  const offenders = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) {
      offenders.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent ?? "").trim().slice(0, 50) });
    }
  }

  // Accessible name, roughly as the browser computes it.
  const nameOf = (el) => {
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      return labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim();
    if (el.tagName === "IMG") return (el.getAttribute("alt") ?? "").trim();
    let text = "";
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
        else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.getAttribute("aria-hidden") === "true") continue;
          const childAria = child.getAttribute("aria-label");
          if (childAria) text += ` ${childAria} `;
          else if (child.tagName === "IMG") text += ` ${child.getAttribute("alt") ?? ""} `;
          else walk(child);
        }
      }
    };
    walk(el);
    return text.replace(/\s+/g, " ").trim();
  };

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.textContent ?? "").replace(/\s+/g, " ").trim(),
  }));
  const headingSkips = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) headingSkips.push(`${headings[i - 1].text} (h${headings[i - 1].level}) -> ${headings[i].text} (h${headings[i].level})`);
  }

  const links = [...document.querySelectorAll("a")].map((a) => ({
    name: nameOf(a),
    href: a.getAttribute("href"),
    target: a.getAttribute("target"),
    rel: a.getAttribute("rel"),
    role: a.getAttribute("role"),
    type: a.getAttribute("type"),
  }));
  const linksWithoutName = links.filter((l) => !l.name);
  const linksWithoutHref = links.filter((l) => !l.href);

  const buttons = [...document.querySelectorAll("button,[role=button]")].map((b) => ({ el: describe(b), name: nameOf(b) }));

  // SVGs must either be hidden from assistive tech or carry a name (directly or on a role=img ancestor).
  const unlabelledSvgs = [];
  for (const svg of document.querySelectorAll("svg")) {
    if (svg.closest("[aria-hidden=true]")) continue;
    if (svg.getAttribute("aria-label") || svg.getAttribute("aria-labelledby") || svg.querySelector("title")) continue;
    const img = svg.closest("[role=img]");
    if (img && (img.getAttribute("aria-label") || img.getAttribute("aria-labelledby"))) continue;
    unlabelledSvgs.push(describe(svg));
  }
  const labelledGraphics = [...document.querySelectorAll("svg[aria-label],[role=img]")].map((el) => ({
    el: describe(el),
    name: nameOf(el),
  }));
  const imagesWithoutAlt = [...document.querySelectorAll("img:not([alt])")].map(describe);

  const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
  const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const brokenRefs = [];
  for (const el of document.querySelectorAll("[aria-labelledby],[aria-describedby]")) {
    for (const attr of ["aria-labelledby", "aria-describedby"]) {
      for (const id of (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) brokenRefs.push(`${describe(el)} ${attr}=${id}`);
      }
    }
  }
  const brokenAnchors = [...document.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute("href"))
    .filter((href) => href.length > 1 && !document.getElementById(href.slice(1)));

  const landmarks = {
    main: document.querySelectorAll("main").length,
    header: document.querySelectorAll("body header").length,
    footer: document.querySelectorAll("footer").length,
    nav: document.querySelectorAll("nav").length,
    sections: [...document.querySelectorAll("section")].map((s) => ({
      id: s.id || null,
      name: nameOf(s).slice(0, 60) || null,
      labelled: Boolean(s.getAttribute("aria-labelledby") || s.getAttribute("aria-label")),
    })),
  };

  // Colour contrast of every text run against its effective background.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const toRgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat(a);
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const backgroundOf = (el) => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const bg = toRgba(getComputedStyle(node).backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] === 1) break;
    }
    let result = [255, 255, 255, 1]; // canvas default
    for (const layer of layers.reverse()) result = over(layer, result);
    return result;
  };
  const lowContrast = [];
  let textRuns = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest("script,style,noscript,[data-qr]")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue; // sr-only
    textRuns++;
    const bg = backgroundOf(el);
    const fg = over(toRgba(style.color), bg);
    const l1 = lum(fg);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      lowContrast.push({ el: describe(el), text: node.textContent.trim().slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, size });
    }
  }

  // Tap targets: links and buttons that are small on a touch screen.
  const smallTargets = [];
  for (const el of document.querySelectorAll("a,button")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 24 || r.width < 24) smallTargets.push({ el: describe(el), name: nameOf(el).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }

  return {
    viewport: { width: vw, height: doc.clientHeight },
    page: { scrollWidth: doc.scrollWidth, bodyScrollWidth: document.body.scrollWidth, scrollHeight: doc.scrollHeight },
    horizontalOverflow: doc.scrollWidth > vw || document.body.scrollWidth > vw,
    offenders: offenders.slice(0, 15),
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
    lang: doc.getAttribute("lang"),
    h1Count: headings.filter((h) => h.level === 1).length,
    headings,
    headingSkips,
    links,
    linksWithoutName,
    linksWithoutHref,
    buttons,
    unlabelledSvgs,
    labelledGraphics,
    imagesWithoutAlt,
    duplicateIds,
    brokenRefs,
    brokenAnchors,
    landmarks,
    textRuns,
    lowContrast,
    smallTargets,
    htmlClass: doc.className,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  };
}

const report = { base, pagePath, label, runs: [], overflow: [] };
let failed = false;

for (const view of VIEWS) {
  for (const scheme of SCHEMES) {
    const context = await browser.newContext({ ...view.context, colorScheme: scheme });
    const page = await context.newPage();
    const consoleMessages = [];
    const pageErrors = [];
    const failedRequests = [];
    const badResponses = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") consoleMessages.push(`${m.type()}: ${m.text().slice(0, 600)}`);
    });
    page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 600)));
    page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on("response", (r) => {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
    });

    const response = await page.goto(base + pagePath, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    // What the page does on its own when the OS prefers dark, before we force the class.
    const nativeBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (scheme === "dark") {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }
    await page.waitForTimeout(150);

    // The Next.js dev indicator floats over the page in development. Keep it out of the pictures.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    const file = path.join(outDir, `${label}-${view.name}-${scheme}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: "disabled" });

    if (sections) {
      const dir = path.join(outDir, "sections");
      mkdirSync(dir, { recursive: true });
      // The first screen, as a visitor sees it before scrolling.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(dir, `${label}-${view.name}-${scheme}-00-fold.png`), animations: "disabled" });
      // One crop per top-level block of the page, so each can be read at full size.
      const blocks = await page.locator("main > *, body > footer, main ~ footer").all();
      let i = 0;
      for (const block of blocks) {
        i++;
        const name = (await block.getAttribute("id")) ?? (await block.evaluate((el) => el.tagName.toLowerCase()));
        await block.scrollIntoViewIfNeeded();
        await block.screenshot({
          path: path.join(dir, `${label}-${view.name}-${scheme}-${String(i).padStart(2, "0")}-${name}.png`),
          animations: "disabled",
        });
      }
    }

    const facts = await page.evaluate(audit);
    const run = {
      view: view.name,
      scheme,
      status: response?.status() ?? 0,
      file,
      nativeBackground,
      consoleMessages,
      pageErrors,
      failedRequests,
      badResponses,
      ...facts,
    };
    report.runs.push(run);
    if (
      run.status >= 400 ||
      run.horizontalOverflow ||
      run.h1Count !== 1 ||
      run.headingSkips.length ||
      run.linksWithoutName.length ||
      run.unlabelledSvgs.length ||
      run.imagesWithoutAlt.length ||
      run.duplicateIds.length ||
      run.brokenRefs.length ||
      run.brokenAnchors.length ||
      run.lowContrast.length ||
      run.pageErrors.length ||
      run.consoleMessages.some((m) => m.startsWith("error"))
    ) {
      failed = true;
    }
    await context.close();
  }
}

// Horizontal overflow at a range of widths, light scheme is enough.
for (const width of OVERFLOW_WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
  const page = await context.newPage();
  await page.goto(base + pagePath, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  const facts = await page.evaluate(audit);
  // Also try to scroll sideways: if the page moves, it overflows.
  const scrolledX = await page.evaluate(() => {
    window.scrollTo(500, 0);
    const x = window.scrollX;
    window.scrollTo(0, 0);
    return x;
  });
  const entry = {
    width,
    clientWidth: facts.viewport.width,
    scrollWidth: facts.page.scrollWidth,
    bodyScrollWidth: facts.page.bodyScrollWidth,
    scrolledX,
    horizontalOverflow: facts.horizontalOverflow || scrolledX > 0,
    offenders: facts.offenders,
  };
  report.overflow.push(entry);
  if (entry.horizontalOverflow) failed = true;
  await context.close();
}

await browser.close();

const reportFile = path.join(outDir, `${label}-report.json`);
writeFileSync(reportFile, JSON.stringify(report, null, 2));

// Short summary on stdout, the full detail is in the JSON file.
const first = report.runs[0];
console.log(`# ${label} ${base}${pagePath}`);
console.log(`title: ${first.title}`);
console.log(`description: ${first.description}`);
console.log(`h1 count: ${first.h1Count}`);
console.log("headings:");
for (const h of first.headings) console.log(`  ${"  ".repeat(h.level - 1)}h${h.level} ${h.text}`);
for (const run of report.runs) {
  console.log(
    `- ${run.view}/${run.scheme}: status ${run.status}, ${run.viewport.width}x${run.page.scrollHeight}, overflow=${run.horizontalOverflow}, ` +
      `body bg ${run.bodyBackground} (before forcing: ${run.nativeBackground}), text runs ${run.textRuns}, low contrast ${run.lowContrast.length}, ` +
      `links ${run.links.length} (unnamed ${run.linksWithoutName.length}), unlabelled svgs ${run.unlabelledSvgs.length}, ` +
      `heading skips ${run.headingSkips.length}, dup ids ${run.duplicateIds.length}, broken refs ${run.brokenRefs.length + run.brokenAnchors.length}, ` +
      `console ${run.consoleMessages.length}, page errors ${run.pageErrors.length}, bad responses ${run.badResponses.length}`,
  );
  for (const m of run.consoleMessages) console.log(`    console ${m}`);
  for (const m of run.pageErrors) console.log(`    pageerror ${m}`);
  for (const m of run.badResponses) console.log(`    response ${m}`);
  for (const m of run.failedRequests) console.log(`    requestfailed ${m}`);
  for (const c of run.lowContrast) console.log(`    contrast ${c.ratio} (<${c.need}) ${c.el} "${c.text}"`);
  for (const o of run.offenders.slice(0, 5)) console.log(`    sticks out: ${o.el} left=${o.left} right=${o.right} "${o.text}"`);
  for (const s of run.headingSkips) console.log(`    heading skip: ${s}`);
  for (const s of run.unlabelledSvgs) console.log(`    unlabelled svg: ${s}`);
  for (const l of run.linksWithoutName) console.log(`    link without name: ${l.href}`);
}
console.log("overflow by width:");
for (const o of report.overflow) {
  console.log(`  ${o.width}px: clientWidth ${o.clientWidth}, scrollWidth ${o.scrollWidth}, body ${o.bodyScrollWidth}, scrolledX ${o.scrolledX}, overflow=${o.horizontalOverflow}`);
  for (const off of o.offenders.slice(0, 5)) console.log(`    sticks out: ${off.el} left=${off.left} right=${off.right} "${off.text}"`);
}
console.log(`report: ${reportFile}`);
console.log(failed ? "RESULT: problems found" : "RESULT: clean");
process.exit(failed ? 1 : 0);
