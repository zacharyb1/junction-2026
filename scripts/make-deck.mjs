#!/usr/bin/env node
/**
 * Builds the pitch deck: docs/pitch/deck/deck.html and docs/pitch/aidaddy-pitch-deck.pdf.
 *
 *   node scripts/make-deck.mjs                 photographs the live site, then builds the deck
 *   node scripts/make-deck.mjs --no-shots      keeps the pictures in docs/pitch/deck/img
 *   node scripts/make-deck.mjs --base http://localhost:3000
 *
 * Every figure on a slide is read from a file a script wrote: src/data/scorecard.json (the eval harness),
 * eval/results/gate-gemma3-1b.json (the gate's labelled set), src/data/replay.json (one recorded run) and
 * src/data/official-sources.json. The pictures are screenshots of the running site. Needs Playwright and its
 * browser; set CHROME_PATH to use a Chromium that is already on the machine.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const QRCode = require("qrcode");

const ROOT = path.resolve(import.meta.dirname, "..");
const DECK = path.join(ROOT, "docs/pitch/deck");
const IMG = path.join(DECK, "img");
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const base = (arg("--base") ?? "https://86.38.238.136.sslip.io").replace(/\/$/, "");
const site = base.replace(/^https?:\/\//, "");
const json = async (file) => JSON.parse(await readFile(path.join(ROOT, file), "utf8"));
const launch = () => chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const card = await json("src/data/scorecard.json");
const gate = (await json("eval/results/gate-gemma3-1b.json")).summary;
const replay = await json("src/data/replay.json");
const sources = await json("src/data/official-sources.json");

const hosts = new Set();
for (const country of Object.values(sources.countries)) {
  for (const host of [...(country.general ?? []), ...Object.values(country.topics ?? {}).flat()]) hosts.add(host);
}
const facts = {
  passed: `${card.totals.passed}/${card.totals.scenarios}`,
  quotes: `${card.totals.verifiedQuotes}/${card.totals.totalQuotes}`,
  refused: card.refusals ? `${card.refusals.passed}/${card.refusals.total}` : null,
  median: `${(card.totals.medianMs / 1000).toFixed(1)} s`,
  missed: `${gate.missedTriggers}/${gate.triggers}`,
  falseWakes: `${gate.falseWakes}/${gate.smallTalk}`,
  countries: Object.keys(sources.countries).length,
  hosts: hosts.size,
  // What the engine passed to Exa for the recorded run: Finland's list plus the EU's. The front page shows the same figure.
  finland: replay.result.officialDomains,
  run: {
    said: replay.request.situation,
    seconds: (replay.result.ms / 1000).toFixed(1),
    searches: replay.result.exa.searches,
    pages: replay.result.exa.contents,
    cost: `$${replay.result.exa.costDollars.toFixed(3)}`,
    quotes: `${replay.result.evidenceVerified} of ${replay.result.evidenceTotal}`,
    plan: replay.result.plan.map((line) => line.replace(/\s*\[\d+\]/g, "")),
    caseId: replay.result.id,
  },
};

// ---- pictures of the running site ----

if (!process.argv.includes("--no-shots")) {
  await mkdir(IMG, { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const page = await context.newPage();
  const shot = (name, options = {}) => page.screenshot({ path: path.join(IMG, `${name}.jpg`), type: "jpeg", quality: 84, ...options });
  const element = async (name, selector) => {
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await target.screenshot({ path: path.join(IMG, `${name}.jpg`), type: "jpeg", quality: 84 });
  };

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await element("research", ".hud-replay");

  await page.goto(`${base}/demo/chat?bare=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // The phone alone, scrolled to the message that carries the plan.
  await page.evaluate(() => {
    const list = document.querySelector(".chatdemo-list");
    const plan = document.querySelector(".chatdemo-preview")?.closest("li");
    if (list && plan) list.scrollTop += plan.getBoundingClientRect().top - list.getBoundingClientRect().top - 70;
  });
  await element("chat", ".chatdemo");

  await page.goto(`${base}/c/${facts.run.caseId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot("case", { clip: { x: 0, y: 96, width: 1280, height: 704 } });
  const quote = page.locator("blockquote").first();
  if (await quote.count()) {
    await quote.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -140));
    await page.waitForTimeout(400);
    await shot("sources", { clip: { x: 0, y: 0, width: 1280, height: 720 } });
  }

  await page.goto(`${base}/setup`, { waitUntil: "networkidle" });
  await element("setup", ".hud-setup-grid");
  await browser.close();
}

const qr = await QRCode.toString(`${base}/try`, { type: "svg", margin: 1, color: { dark: "#211b17", light: "#ffffff" } });

// ---- the slides ----

const slide = (number, label, body, extra = "") => `
<section class="slide ${extra}">
  <header><span class="mark"><b>AI</b>Daddy</span><span class="label">${esc(label)}</span></header>
  ${body}
  <footer><span>${esc(site)}</span><span>${number}</span></footer>
</section>`;

const FLOW = [
  ["Group chat", "Telegram", "One more member of the family group."],
  ["Gate", "Gemma, on our own server", "Life event or small talk? Small talk stops here."],
  ["Conversation", "Hermes Agent + Nemotron", "Reads the letter photo, asks, drafts. Never sends."],
  ["Research engine", "Exa search", "Structured searches on the country's official sites."],
  ["Verifier", "Own request + Exa Contents", "Opens every cited page again. No sentence, no line."],
  ["Case file", "A link for the family", "Plan, quotes, gaps. Sources can be checked again."],
];

const slides = [
  slide(
    1,
    "Junction 2026 · Exa: The Internet Butler",
    `<div class="title">
      <div>
        <h1>Silent until<br><em>it matters.</em></h1>
        <p class="lede">AIDaddy is the butler in your family's group chat. It lets the small talk pass. When life happens, it researches the live web with Exa and answers with a plan in which every line points at a sentence on an official page.</p>
      </div>
      <div class="orb"></div>
    </div>`,
    "slide--title",
  ),
  slide(
    2,
    "The problem",
    `<h2>A life event starts a list of deadlines nobody hands you.</h2>
    <div class="cols">
      <ul class="points">
        <li><strong>The answers exist, on ten official pages.</strong> Kela, the tax office, the city, the employer's duties: each page has one piece.</li>
        <li><strong>Often in a language you do not read.</strong> A newcomer's first letters in Finland come in Finnish.</li>
        <li><strong>A chatbot answers from memory, and you cannot check it.</strong> Amounts and deadlines change every year.</li>
      </ul>
      <div class="panel">
        <p class="eyebrow">Said in a family chat</p>
        <p class="said">“${esc(facts.run.said)}”</p>
        <p class="eyebrow">What that one sentence sets off</p>
        <ol class="plan">${facts.run.plan.map((line) => `<li>${esc(line)}</li>`).join("")}</ol>
      </div>
    </div>`,
  ),
  slide(
    3,
    "The product",
    `<div class="cols cols--pic">
      <div>
        <h2>One butler, three moves.</h2>
        <ol class="moves">
          <li><strong>It stays silent.</strong> Dinner, keys, who picks up the kids: a small model lets that pass. Nobody has to ask it anything.</li>
          <li><strong>It goes to work.</strong> When someone mentions a life event or shares an official letter, it searches the official sites of the right country.</li>
          <li><strong>It answers with a plan you can check.</strong> What to do, by when, and the official sentence that says so. Tap a number and the page opens at that sentence.</li>
        </ol>
        <p class="note">It never sends, files, books or pays. It prepares, and the family decides.</p>
      </div>
      <figure class="pic pic--phone"><img src="img/chat.jpg" alt=""><figcaption>A replay with a fictional family. The plan is from a real run.</figcaption></figure>
    </div>`,
  ),
  slide(
    4,
    "How it works",
    `<div class="cols cols--pic2">
      <div>
        <h2>No source, no line.</h2>
        <ul class="points">
          <li><strong>${facts.run.searches} Exa searches</strong> on official sites, three of them at once.</li>
          <li><strong>${facts.run.pages} pages opened again</strong> by our own server and by Exa Contents.</li>
          <li><strong>${facts.run.quotes} quotes found</strong> on the pages they cite. A line whose sentence is missing is taken out and listed as unconfirmed.</li>
          <li><strong>${facts.run.seconds} seconds, ${facts.run.cost}</strong> of search for this run.</li>
        </ul>
      </div>
      <figure class="pic"><img src="img/research.jpg" alt=""><figcaption>A real run, recorded and replayed on the front page.</figcaption></figure>
    </div>`,
  ),
  slide(
    5,
    "What the family gets",
    `<div class="cols cols--pic2">
      <div>
        <h2>A case file the whole family can open.</h2>
        <ul class="points">
          <li><strong>The quoted sentence under every step,</strong> with how it was confirmed.</li>
          <li><strong>Two answers? You see both.</strong> When official pages give different figures, it shows both and does not choose.</li>
          <li><strong>Gaps are listed.</strong> What it could not confirm is on the page, not hidden.</li>
          <li><strong>Sources can be read again</strong> later, to see whether a sentence changed.</li>
        </ul>
        <p class="note">Research with sources, not legal advice.</p>
      </div>
      <figure class="pic"><img src="img/case.jpg" alt=""><figcaption>The case file of the run on the previous slide.</figcaption></figure>
    </div>`,
  ),
  slide(
    6,
    "Under the hood",
    `<h2>Exa finds it. Our server proves it.</h2>
    <ol class="flow">${FLOW.map(([name, tech, text]) => `<li><h3>${esc(name)}</h3><p class="tech">${esc(tech)}</p><p>${esc(text)}</p></li>`).join("")}</ol>
    <ul class="exa">
      <li><strong>Structured search.</strong> Exa returns steps, deadlines, amounts and the quoted sentence in a schema we define.</li>
      <li><strong>Official sites first.</strong> Site lists for ${facts.countries} countries. For Finland, ${facts.finland} Finnish and EU sites go to Exa as the domains to search.</li>
      <li><strong>This year's rules.</strong> A separate search asks only for pages published in the last four months.</li>
      <li><strong>Exa Contents</strong> is the second reader of every cited page, next to our own request.</li>
    </ul>`,
  ),
  slide(
    7,
    "Where it works today",
    `<h2>Wherever the household is.</h2>
    <figure class="pic pic--wide"><img src="img/setup.jpg" alt=""></figure>
    <ul class="row">
      <li><strong>Telegram group: live.</strong> Text and photos of letters.</li>
      <li><strong>Website: live.</strong> Ask one question, or chat.</li>
      <li><strong>Listening page: first version.</strong> Hears the room, then calls or pings.</li>
      <li><strong>Browser extension: first version.</strong> Reads the page you have open.</li>
    </ul>`,
  ),
  slide(
    8,
    "Measured",
    `<h2>Tested on the live web, with the misses published.</h2>
    <ul class="numbers">
      <li><b>${facts.passed}</b><span>life events researched correctly, in 5 countries</span></li>
      <li><b>${facts.quotes}</b><span>quotes found on the pages they cite</span></li>
      ${facts.refused ? `<li><b>${facts.refused}</b><span>messages with nothing to research got no made-up plan</span></li>` : ""}
      <li><b>${facts.median}</b><span>median time from the message to a checked plan</span></li>
    </ul>
    <ul class="numbers numbers--small">
      <li><b>${facts.missed}</b><span>life events the gate missed</span></li>
      <li><b>${facts.falseWakes}</b><span>small-talk messages that woke it by mistake</span></li>
    </ul>
    <p class="note">Latest run of our own test set. The web is live, so runs differ: recent runs passed 17 to 19 of ${card.totals.scenarios}. The gate figures are from our own labelled messages, not a blind test.</p>`,
  ),
  slide(
    9,
    "Who it is for, and what is next",
    `<div class="cols">
      <div>
        <h2>For people new to a country's paperwork.</h2>
        <ul class="points">
          <li><strong>Newcomers and international families in Finland,</strong> in their first years here.</li>
          <li><strong>Why Europe:</strong> public information is good and open, but spread over hundreds of sites and several languages.</li>
          <li><strong>Why a group chat:</strong> a life event is shared. The plan lands where the family already talks.</li>
        </ul>
      </div>
      <div>
        <h2>Next.</h2>
        <ul class="points">
          <li><strong>A watch on every cited page,</strong> so a rule change reaches the family the day it happens.</li>
          <li><strong>Calendar and mail,</strong> behind the same approval.</li>
          <li><strong>More countries.</strong> Official site lists exist for ${facts.countries}; Finland is tested in depth.</li>
          <li><strong>A phone app,</strong> so listening works with the screen off.</li>
        </ul>
      </div>
    </div>`,
  ),
  slide(
    10,
    "Try it",
    `<div class="title title--end">
      <div>
        <h1>Ask it about<br><em>your own life.</em></h1>
        <p class="lede">Type what happened, and where you live. The same engine runs in the browser, on the live web, in a few seconds.</p>
        <p class="url">${esc(site)}/try</p>
        <p class="note">Team: Zachary, Milan, Vlad · Built at Junction 2026 with Exa, Hermes Agent, NVIDIA Nemotron, Gemma, ElevenLabs and Verda.</p>
      </div>
      <div class="qr">${qr}</div>
    </div>`,
    "slide--title",
  ),
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AIDaddy: pitch deck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="deck.css">
</head>
<body>${slides.join("\n")}
</body>
</html>
`;
await mkdir(DECK, { recursive: true });
await writeFile(path.join(DECK, "deck.html"), html);

const browser = await launch();
const page = await browser.newPage();
await page.goto(`file://${path.join(DECK, "deck.html")}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(ROOT, "docs/pitch/aidaddy-pitch-deck.pdf"), width: "1280px", height: "720px", printBackground: true });
// Which slides are too full? A slide is 720 px high; anything more would be cut off in the PDF.
const overfull = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((slide, index) => ({ n: index + 1, extra: slide.scrollHeight - slide.clientHeight })).filter((item) => item.extra > 0));
await browser.close();
console.log(`${slides.length} slides written to docs/pitch/aidaddy-pitch-deck.pdf`);
if (overfull.length) console.log("Too full:", JSON.stringify(overfull));
