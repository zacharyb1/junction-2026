# UKK in the browser

A Chrome extension. It looks at the page you have open and, when the page is about a deadline, a benefit or an official form, shows what to do and by when, with the official sentence for every line. Issue [#26](https://github.com/zacharyb1/junction-2026/issues/26).

## Install (two minutes)

1. Open `chrome://extensions` in Chrome.
2. Switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose this `extension/` folder.
4. A welcome page opens. Type the **access code** (the same code as for `/try`), then click **Yes, look at my pages**.

That is the only permission question. From then on UKK looks at every page you open.

## What it does, exactly

| | |
|---|---|
| **Reads** | The page you are on: address, title, headings, visible text, and the labels of form fields. |
| **Never reads** | Other tabs. What you type into fields. Any page with a password or payment field. |
| **Decides locally first** | `gate.js` runs in the browser. An ordinary page is read on your computer and nothing is sent. |
| **Sends to the Engine** | Only for a page about life admin: its address, title, heading, field labels and the first 500 characters of its text, as one question to `POST /api/research`. |
| **Shows** | A small panel in the corner: the plan lines, each with a source number that opens the official page at the quoted sentence, and a link to the case file. |
| **Fills a form** | Only when you click the button, only empty fields, only from what you saved on the welcome page. It never fills an identity number, a bank account or a password, and it never submits. |
| **Pause** | From the toolbar icon: everywhere, or on one site. The panel has the same button. |

A page counts as "about life admin" when it is on one of the Engine's official sites and talks about a duty or a benefit, or when it has a form and the words of an application (English, Finnish, Swedish).

## Files

- `manifest.json`: Manifest V3. Chrome's install prompt lists "read and change data on all websites"; UKK still stays off until you say yes on its welcome page.
- `gate.js`: the local decisions (read or not, relevant or not, which country, which fields may be filled). Unit tests in `tests/extension-gate.test.ts`.
- `content.js`: reads the page, shows the panel, fills on a click.
- `background.js`: the only part that calls the Engine. Keeps answers for a day per page.
- `welcome.html`, `popup.html`: consent, settings, pause.
- `official-hosts.js`: written by `node scripts/make-extension-data.mjs` from `src/data/official-sources.json`.

## Limits

- **Each relevant page costs one research run** (about three cents of Exa search and about ten seconds). A page opened again within a day is answered from memory.
- **It is not in the Chrome Web Store.** It is loaded unpacked.
- **The fill is simple matching** on field names and labels. Check what it filled, marked in green.
- **Tested** in Chrome through the consent, an ordinary page, a login page, a live Kela page, a form and the pause. Not tested in Firefox or Safari.
