/*
 * The extension's background worker. It is the only part that talks to the Engine.
 *
 * A page's content script asks it to research a question. The answer is kept for a day per page address,
 * so a page that is opened again costs nothing and answers at once.
 */

const DEFAULTS = {
  consent: false,
  paused: false,
  pausedHosts: [],
  engine: "https://86.38.238.136.sslip.io",
  code: "",
  country: "FI",
  language: "en",
  profile: {},
};
const KEEP_MS = 24 * 60 * 60 * 1000;
const MAX_KEPT = 40;

const settings = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) });

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // The first thing the person sees is the question, in plain words, whether AIDaddy may look.
  if (reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

/** Answers already fetched, by page address. Session storage is cleared when the browser closes. */
async function kept(url) {
  const { answers = {} } = await chrome.storage.session.get("answers");
  const hit = answers[url];
  return hit && Date.now() - hit.at < KEEP_MS ? hit.result : null;
}

async function keep(url, result) {
  const { answers = {} } = await chrome.storage.session.get("answers");
  answers[url] = { at: Date.now(), result };
  const newest = Object.entries(answers).sort(([, a], [, b]) => b.at - a.at).slice(0, MAX_KEPT);
  await chrome.storage.session.set({ answers: Object.fromEntries(newest) });
}

/** Research in progress, so two frames or a quick reload of the same page pay for one run. */
const running = new Map();

async function research({ url, question, country }) {
  const stored = await kept(url);
  if (stored) return { ok: true, result: stored, cached: true };

  const { engine, code, language } = await settings();
  if (!code) return { ok: false, error: "no-code" };

  let job = running.get(url);
  if (!job) {
    job = fetch(`${engine.replace(/\/$/, "")}/api/research`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-code": code },
      body: JSON.stringify({ situation: question, country, language }),
      signal: AbortSignal.timeout(90_000),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 422) return { ok: false, error: "nothing" };
        if (res.status === 401) return { ok: false, error: "bad-code" };
        if (res.status === 429) return { ok: false, error: "busy" };
        if (!res.ok) return { ok: false, error: body.error || `The Engine answered ${res.status}` };
        const result = {
          title: body.title,
          url: body.url,
          plan: body.plan ?? [],
          evidence: (body.evidence ?? []).map((item) => ({ n: item.n, url: item.url, quote: item.quote, verification: item.verification })),
          evidenceVerified: body.evidenceVerified ?? 0,
          evidenceTotal: body.evidenceTotal ?? 0,
          ms: body.ms ?? 0,
        };
        await keep(url, result);
        return { ok: true, result };
      })
      .catch((error) => ({ ok: false, error: error?.name === "TimeoutError" ? "The Engine took too long." : "The Engine could not be reached." }))
      .finally(() => running.delete(url));
    running.set(url, job);
  }
  return job;
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === "aidaddy:research") {
    research(message).then(reply);
    return true; // the reply comes later
  }
  if (message?.type === "aidaddy:settings") {
    settings().then(reply);
    return true;
  }
  return false;
});
