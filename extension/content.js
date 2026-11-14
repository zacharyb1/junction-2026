/*
 * Runs on every web page once the person has said yes on the welcome page.
 *
 * It reads the page that is open (never another tab), lets the local gate in gate.js decide whether the page
 * is about life admin, and only then asks the Engine. What comes back is shown in a small panel in the corner.
 * A form is filled only when the person clicks the button, only in empty fields, and it is never submitted.
 *
 * Field values are never read. A page with a password or payment field is not read at all.
 */
/* global UkkGate, UKK_OFFICIAL_HOSTS */

(() => {
  if (window.top !== window || window.__ukkLoaded) return;
  window.__ukkLoaded = true;

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
    .ukk { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: min(360px, calc(100vw - 32px));
      font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e6f1ff; }
    .pill { display: flex; align-items: center; gap: 8px; margin-left: auto; width: fit-content; min-height: 36px; padding: 0 12px;
      border: 1px solid rgb(79 216 255 / .35); border-radius: 18px; background: #05080d; color: #9db0c9; cursor: pointer;
      font: 600 12px/1 ui-monospace, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .pill:hover { color: #e6f1ff; border-color: #4fd8ff; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #4fd8ff; }
    .ukk[data-state="working"] .dot { background: #ffb547; animation: beat 1s ease-in-out infinite; }
    .ukk[data-state="ready"] .dot { background: #3ddc97; }
    .ukk[data-state="off"] .dot { background: #6b7a90; }
    .ukk[data-state="working"] .pill { color: #ffb547; border-color: #ffb547; }
    .ukk[data-state="ready"] .pill { color: #3ddc97; border-color: #3ddc97; }
    @keyframes beat { 50% { transform: scale(1.7); opacity: .5; } }
    .panel { margin-bottom: 8px; padding: 14px; border: 1px solid rgb(79 216 255 / .35); border-radius: 6px;
      background: #0a121d; box-shadow: 0 12px 40px rgb(0 0 0 / .5); max-height: min(70vh, 520px); overflow: auto; }
    .panel[hidden] { display: none; }
    .head { display: flex; justify-content: space-between; gap: 8px; align-items: start; }
    h2 { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
    .label { margin: 0 0 8px; color: #4fd8ff; font: 600 11px/1.3 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
    p { margin: 0 0 8px; color: #9db0c9; }
    ol { margin: 8px 0; padding: 0; list-style: none; }
    li { padding: 8px 0; border-top: 1px dashed rgb(79 216 255 / .18); color: #e6f1ff; }
    .src { display: inline-block; margin-left: 4px; padding: 1px 6px; border: 1px solid #3ddc97; border-radius: 3px;
      color: #3ddc97; font: 600 11px/1.4 ui-monospace, Menlo, monospace; text-decoration: none; }
    .src:hover { background: #3ddc97; color: #03140c; }
    a { color: #4fd8ff; }
    button { font: inherit; cursor: pointer; }
    .btn { display: block; width: 100%; min-height: 40px; margin-top: 8px; border: 1px solid rgb(79 216 255 / .35); border-radius: 4px;
      background: rgb(79 216 255 / .06); color: #e6f1ff; }
    .btn:hover { border-color: #4fd8ff; background: rgb(79 216 255 / .16); }
    .btn.primary { border-color: #4fd8ff; background: #4fd8ff; color: #03131c; font-weight: 600; }
    .x { border: 0; background: none; color: #9db0c9; font-size: 18px; line-height: 1; padding: 0 2px; }
    .small { font-size: 12px; }
    :focus-visible { outline: 2px solid #ffb547; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .dot { animation: none !important; } }
  `;

  function mount() {
    if (root) return root;
    const host = el("div", { id: "ukk-root" });
    root = host.attachShadow({ mode: "open" });
    root.append(el("style", { text: STYLE }), el("div", { class: "ukk", "data-state": "idle" }));
    document.documentElement.append(host);
    return root;
  }

  /** Draws the pill and, when there is something to say, the panel above it. */
  function show({ state, pill, title, lines = [], body = [], open = false }) {
    const box = mount().querySelector(".ukk");
    box.dataset.state = state;
    const panel = el("div", { class: "panel", role: "dialog", "aria-label": "UKK" }, [
      el("div", { class: "head" }, [
        el("div", {}, [el("p", { class: "label", text: "UKK · looking at this page" }), title ? el("h2", { text: title }) : null]),
        el("button", { class: "x", "aria-label": "Close", text: "×", onclick: () => (panel.hidden = true) }),
      ]),
      lines.length ? el("ol", {}, lines) : null,
      ...body,
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
    const host = UkkGate.hostOf(location.href);
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
      .map((field, index) => ({ field, kind: UkkGate.fieldKind(page.fields[index]) }))
      .map((item) => ({ ...item, value: item.kind ? UkkGate.profileValue(item.kind, profile) : "" }))
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
            href: UkkGate.highlightUrl(source.url, source.quote),
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
    const settings = await send({ type: "ukk:settings" });
    if (!settings.consent) return; // the person has not said yes: nothing is read and nothing is shown

    const page = readPage();
    const first = UkkGate.decide(page, settings, UKK_OFFICIAL_HOSTS);
    if (!first.read) {
      show({ state: "off", pill: "UKK is not looking", title: "Not reading this page", body: [el("p", { text: `Reason: ${first.why}.` })] });
      return;
    }
    // Only now is the page's text read.
    page.text = clean(page.main.innerText).slice(0, TEXT_LIMIT);
    const verdict = UkkGate.decide(page, settings, UKK_OFFICIAL_HOSTS);
    const filler = () => fillButton(page, settings.profile ?? {});

    const ask = async () => {
      show({ state: "working", pill: "UKK is checking", title: "Checking official sources", body: [el("p", { text: "Searching official sites and reading every page it will cite. About ten seconds." })], open: force });
      const answer = await send({ type: "ukk:research", url: page.url.split("#")[0], question: UkkGate.question(page), country: verdict.country });
      if (mine !== run) return; // the person moved on to another page
      if (answer.ok) {
        const { result } = answer;
        show({
          state: "ready",
          pill: `UKK: ${result.plan.length} thing${result.plan.length === 1 ? "" : "s"} to know`,
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
        "no-code": "Add the access code on UKK's settings page (right-click the UKK icon, then Options).",
        "bad-code": "The access code was not accepted. Check it on UKK's settings page.",
        busy: "The demo is busy. Try again in a minute.",
        nothing: "Nothing on this page needs a plan.",
      };
      show({
        state: answer.error === "nothing" ? "idle" : "off",
        pill: answer.error === "nothing" ? "UKK is watching" : "UKK needs you",
        title: answer.error === "nothing" ? "Nothing to do here" : "Could not check this page",
        body: [el("p", { text: reasons[answer.error] ?? answer.error }), filler(), pauseButton(settings)],
        open: answer.error !== "nothing",
      });
    };

    if (verdict.relevant || force) return ask();
    show({
      state: "idle",
      pill: "UKK is watching",
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
      if (changes.consent && !changes.consent.newValue && root) root.querySelector(".ukk").replaceChildren();
      else look();
    });
  }

  start();
})();
