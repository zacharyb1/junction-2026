/*
 * Runs on every web page once the person has said yes on the welcome page.
 *
 * It reads the page that is open (never another tab), lets the local gate in gate.js decide whether the page
 * is about life admin, and only then asks the Engine. What comes back is shown in a small panel in the corner.
 * A form is filled only when the person clicks the button, only in empty fields, and it is never submitted.
 *
 * Field values are never read. A page with a password or payment field is not read at all.
 */
/* global AIDaddyGate, AIDADDY_OFFICIAL_HOSTS */

(() => {
  if (window.top !== window || window.__aidaddyLoaded) return;
  window.__aidaddyLoaded = true;

  const TEXT_LIMIT = 3000;
  let root = null; // the shadow root of the panel
  let lastUrl = "";
  let run = 0;

  const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
  const visible = (node) => Boolean(node.offsetParent || node.getClientRects().length);

  /** Tiny DOM builder. Text always goes in as text, never as HTML. */
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") node.textContent = value;
      else if (key === "onclick") node.addEventListener("click", value);
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  function labelOf(field) {
    const fromLabel = field.labels?.[0]?.textContent;
    return clean(fromLabel || field.getAttribute("aria-label") || field.getAttribute("placeholder") || field.name || "").slice(0, 80);
  }

  /** The form fields a person can see. Their labels and kinds are read, their values are not. */
  function fields() {
    return [...document.querySelectorAll("input, select, textarea")]
      .filter((field) => !["hidden", "submit", "button", "image", "reset", "file"].includes(field.type) && visible(field))
      .slice(0, 60);
  }

  function readPage() {
    const inputs = fields();
    const hint = (field) => `${field.autocomplete} ${field.name} ${field.id}`;
    const main = document.querySelector("main, [role=main], article") ?? document.body;
    return {
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang || "",
      heading: clean(document.querySelector("h1")?.textContent),
      hasPassword: inputs.some((field) => field.type === "password"),
      hasCard: inputs.some((field) => /cc-|card.?number|cardnumber|cvc|cvv/i.test(hint(field))),
      fields: inputs.map((field) => ({ label: labelOf(field), type: field.type, name: field.name, id: field.id, autocomplete: field.autocomplete })),
      inputs,
      text: "",
      main,
    };
  }

  // ---------- the panel ----------

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .aidaddy { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: min(360px, calc(100vw - 32px));
      font: 14px/1.45 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #211b17; }
    .pill { display: flex; align-items: center; gap: 8px; margin-left: auto; width: fit-content; min-height: 40px; padding: 0 14px;
      border: 1px solid #e5dccf; border-radius: 99px; background: #fff;
      box-shadow: 0 6px 20px rgb(60 40 25 / .14); color: #6b625b; cursor: pointer;
      font: 600 13px/1 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      transition: color .2s, border-color .2s; }
    .pill:hover { color: #211b17; border-color: #b84f2a; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #b84f2a; }
    .aidaddy[data-state="working"] .dot { background: #96600f; animation: beat 1.1s ease-in-out infinite; }
    .aidaddy[data-state="ready"] .dot { background: #23744a; }
    .aidaddy[data-state="off"] .dot { background: #a39685; }
    .aidaddy[data-state="attention"] .dot { background: #96600f; }
    .aidaddy[data-state="working"] .pill,
    .aidaddy[data-state="attention"] .pill { color: #96600f; border-color: #96600f; }
    .aidaddy[data-state="ready"] .pill { color: #23744a; border-color: #23744a; }
    @keyframes beat { 50% { opacity: .35; } }
    .panel { position: relative; margin-bottom: 8px; border: 1px solid #e5dccf; border-radius: 20px;
      background: #fff; box-shadow: 0 12px 40px rgb(60 40 25 / .16); }
    .panel[hidden] { display: none; }
    .bar { display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 4px 4px 0 14px;
      border-bottom: 1px solid #efe8dd; }
    .body { max-height: min(calc(70vh - 56px), 470px); overflow: auto; padding: 12px 14px 14px; }
    h2 { margin: 0 0 6px; font-size: 16px; font-weight: 600; line-height: 1.3; }
    .label { margin: 0; color: #b84f2a; font: 600 11px/1.3 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: .05em; text-transform: uppercase; }
    p { margin: 0 0 8px; color: #6b625b; }
    ol { margin: 8px 0; padding: 0; list-style: none; }
    li { padding: 8px 0 8px 10px; border-top: 1px solid #efe8dd; border-left: 3px solid #b84f2a; color: #211b17; }
    li + li { margin-top: 2px; }
    .src { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; margin-left: 4px; padding: 0 6px;
      border: 1px solid #23744a; border-radius: 12px; color: #23744a; vertical-align: middle;
      font: 600 11px/1 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; text-decoration: none; }
    .src:hover { background: #23744a; color: #fff; }
    a { color: #b84f2a; }
    button { font: inherit; cursor: pointer; }
    .btn { display: block; width: 100%; min-height: 44px; margin-top: 8px; padding: 8px 14px; border: 1px solid #e5dccf; border-radius: 12px;
      background: #fff; color: #211b17; transition: border-color .2s, background-color .2s; }
    .btn:hover { border-color: #b84f2a; background: #fdf3ee; }
    .btn.primary { border-color: #b84f2a; background: #b84f2a; color: #fff; font-weight: 600; box-shadow: 0 6px 16px rgb(184 79 42 / .28); }
    .btn.primary:hover { border-color: #9d4122; background: #9d4122; }
    .x { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 36px; height: 36px; border: 0; border-radius: 12px;
      background: none; color: #6b625b; font-size: 18px; line-height: 1; padding: 0; }
    .x:hover { color: #211b17; background: #efe8dd; }
    .small { font-size: 12px; }
    :focus-visible { outline: 2px solid #b84f2a; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { .dot { animation: none !important; } .pill, .btn { transition: none; } }
  `;

  function mount() {
    if (root) return root;
    const host = el("div", { id: "aidaddy-root" });
    root = host.attachShadow({ mode: "open" });
    root.append(el("style", { text: STYLE }), el("div", { class: "aidaddy", "data-state": "idle" }));
    document.documentElement.append(host);
    return root;
  }

  /** Draws the pill and, when there is something to say, the panel above it. */
  function show({ state, pill, title, lines = [], body = [], open = false }) {
    const box = mount().querySelector(".aidaddy");
    box.dataset.state = state;
    // A title bar with the label and the close button, then the body, which scrolls, so the corner brackets stay whole.
    const panel = el("div", { class: "panel", role: "dialog", "aria-label": "AIDaddy" }, [
      el("div", { class: "bar" }, [
        el("p", { class: "label", text: "AIDaddy · looking at this page" }),
        el("button", { class: "x", "aria-label": "Close", text: "×", onclick: () => (panel.hidden = true) }),
      ]),
      el("div", { class: "body" }, [title ? el("h2", { text: title }) : null, lines.length ? el("ol", {}, lines) : null, ...body]),
    ]);
    panel.hidden = !open;
    const button = el("button", { class: "pill", "aria-expanded": String(open), onclick: () => (panel.hidden = !panel.hidden) }, [
      el("span", { class: "dot" }),
      el("span", { text: pill }),
    ]);
    box.replaceChildren(panel, button);
  }

  const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, (reply) => resolve(reply ?? { ok: false, error: "The extension is restarting." })));

  /** Pausing on a site is one click, and it is remembered. */
  function pauseButton(settings) {
    const host = AIDaddyGate.hostOf(location.href);
    return el("button", {
      class: "btn small",
      text: `Do not look at ${host}`,
      onclick: async () => {
        await chrome.storage.local.set({ pausedHosts: [...new Set([...(settings.pausedHosts ?? []), host])] });
        look(true);
      },
    });
  }

  // ---------- filling a form, on a click only ----------

  function fillable(page, profile) {
    return page.inputs
      .map((field, index) => ({ field, kind: AIDaddyGate.fieldKind(page.fields[index]) }))
      .map((item) => ({ ...item, value: item.kind ? AIDaddyGate.profileValue(item.kind, profile) : "" }))
      .filter((item) => item.value && !item.field.value && !item.field.readOnly && !item.field.disabled);
  }

  function fill(items) {
    for (const { field, value } of items) {
      // The page's own code must notice the change, so the value is set the way typing would set it.
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
      if (setter) setter.call(field, value);
      else field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      field.style.outline = "2px solid #3ddc97";
    }
  }

  function fillButton(page, profile) {
    const items = fillable(page, profile);
    if (!items.length) return null;
    const button = el("button", {
      class: "btn primary",
      text: `Fill ${items.length} field${items.length === 1 ? "" : "s"} with what I know`,
      onclick: () => {
        fill(items);
        button.replaceWith(el("p", { class: "small", text: `Filled ${items.length} field${items.length === 1 ? "" : "s"}, marked in green. Check them. Nothing was sent.` }));
      },
    });
    return button;
  }

  // ---------- looking at the page ----------

  function planLines(result) {
    return result.plan.map((line) => {
      const item = el("li", { text: line.replace(/\s*\[\d+\]/g, "") });
      for (const match of line.matchAll(/\[(\d+)\]/g)) {
        const source = result.evidence.find((evidence) => evidence.n === Number(match[1]));
        if (!source) continue;
        item.append(
          el("a", {
            class: "src",
            href: AIDaddyGate.highlightUrl(source.url, source.quote),
            target: "_blank",
            rel: "noopener noreferrer",
            title: `“${source.quote}”`,
            "aria-label": `Source ${source.n}, opens the page at the quoted sentence`,
            text: String(source.n),
          }),
        );
      }
      return item;
    });
  }

  async function look(force = false) {
    const mine = ++run;
    const settings = await send({ type: "aidaddy:settings" });
    if (settings.ok === false) {
      // No answer at all: Chrome is still running the background worker of an earlier version of the extension
      // (it swaps the worker only when the extension is reloaded). Say so instead of going quiet. Nothing is read.
      let consent = false;
      try {
        ({ consent = false } = await chrome.storage.local.get("consent"));
      } catch {
        // The extension itself was reloaded and this page still holds its old copy: stay quiet.
      }
      if (consent) {
        show({
          state: "off",
          pill: "AIDaddy needs a reload",
          title: "The extension was updated",
          body: [
            el("p", {
              text: "Open chrome://extensions and press the reload arrow on this extension's card, then refresh this page. Your settings stay as they are.",
            }),
          ],
        });
      }
      return;
    }
    if (!settings.consent) return; // the person has not said yes: nothing is read and nothing is shown

    const page = readPage();
    const first = AIDaddyGate.decide(page, settings, AIDADDY_OFFICIAL_HOSTS);
    if (!first.read) {
      show({ state: "off", pill: "AIDaddy is not looking", title: "Not reading this page", body: [el("p", { text: `Reason: ${first.why}.` })] });
      return;
    }
    // Only now is the page's text read.
    page.text = clean(page.main.innerText).slice(0, TEXT_LIMIT);
    const verdict = AIDaddyGate.decide(page, settings, AIDADDY_OFFICIAL_HOSTS);
    const filler = () => fillButton(page, settings.profile ?? {});

    const ask = async () => {
      show({ state: "working", pill: "AIDaddy is checking", title: "Checking official sources", body: [el("p", { text: "Searching official sites and reading every page it will cite. About ten seconds." })], open: force });
      const answer = await send({ type: "aidaddy:research", url: page.url.split("#")[0], question: AIDaddyGate.question(page), country: verdict.country });
      if (mine !== run) return; // the person moved on to another page
      if (answer.ok) {
        const { result } = answer;
        show({
          state: "ready",
          pill: `AIDaddy: ${result.plan.length} thing${result.plan.length === 1 ? "" : "s"} to know`,
          title: result.title,
          lines: planLines(result),
          body: [
            el("p", { class: "small", text: `${result.evidenceVerified} of ${result.evidenceTotal} quotes found on their pages. Research with sources, not legal advice.` }),
            filler(),
            el("a", { class: "btn", href: result.url, target: "_blank", rel: "noopener noreferrer", text: "Open the case file", style: "display:grid;place-items:center;text-decoration:none" }),
            pauseButton(settings),
          ],
          open: true,
        });
        return;
      }
      const reasons = {
        "no-code": "This AIDaddy server asks for an access code. Add it on AIDaddy's settings page (right-click the AIDaddy icon, then Options).",
        "bad-code": "The access code was not accepted. Check it on AIDaddy's settings page.",
        busy: "The demo is busy. Try again in a minute.",
        nothing: "Nothing on this page needs a plan.",
      };
      show({
        state: answer.error === "nothing" ? "idle" : "attention",
        pill: answer.error === "nothing" ? "AIDaddy is watching" : "AIDaddy needs you",
        title: answer.error === "nothing" ? "Nothing to do here" : "Could not check this page",
        body: [el("p", { text: reasons[answer.error] ?? answer.error }), filler(), pauseButton(settings)],
        open: answer.error !== "nothing",
      });
    };

    if (verdict.relevant || force) return ask();
    show({
      state: "idle",
      pill: "AIDaddy is watching",
      title: "Nothing to do here",
      body: [
        el("p", { text: `This page was read on your computer only (${verdict.why}). Nothing was sent.` }),
        filler(),
        el("button", { class: "btn", text: "Check this page anyway", onclick: () => look(true) }),
        pauseButton(settings),
      ],
    });
  }

  function start() {
    lastUrl = location.href;
    look();
    // Many sites change the page without loading a new one. A new address is a new page to look at.
    setInterval(() => {
      if (location.href.split("#")[0] === lastUrl.split("#")[0]) return;
      lastUrl = location.href;
      setTimeout(look, 800);
    }, 1500);
    // Saying yes, pausing or resuming takes effect on open pages at once.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !(changes.consent || changes.paused || changes.pausedHosts)) return;
      if (changes.consent && !changes.consent.newValue && root) root.querySelector(".aidaddy").replaceChildren();
      else look();
    });
  }

  start();
})();
