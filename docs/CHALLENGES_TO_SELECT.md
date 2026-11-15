# Which challenges to select in the submission form

Written Saturday 14 November, 20:09 Helsinki, from the challenge texts on the Junction platform. The platform lets one project enter several challenges. Tick a box here when you have selected it on the platform.

Updated Sunday 15 November, 09:40 Helsinki: ElevenLabs moved to "Select now" after both live voice paths worked on the production server; the Nemotron note names the emergency rule. The same notes, with the final list of what to tick, are in [SUBMISSION_TEXT.md](SUBMISSION_TEXT.md).

**The rule we follow:** select a challenge only when its technology does real work in the demo. A judge who opens the project and cannot find their product will mark it down, and that costs more than the entry gains.

Demo address for every note below: <https://86.38.238.136.sslip.io>

## 1. Select now (5)

These work today. Each has a note you can paste into the form.

### - [ ] Exa: The Internet Butler / Your Personal Assistant (main challenge)

- **Why it fits:** this is the challenge the product was built for.
- **Note to paste:**
  > AIDaddy is the assistant that you don't have to ask. Every other AI waits for a prompt, but we don't know what we don't know: the things that cost you money are the ones you never knew to ask about, a deadline on an invoice, a benefit nobody mentioned. AIDaddy is a butler in a household's Telegram group, at the kitchen table (a listening page), on the web and in the browser. It stays silent on small talk. In an emergency it speaks at once: call 112 first. On a life event or an official letter it runs four Exa structured searches on the official sites of the right country, opens every page it wants to cite again (our own request plus Exa Contents), and keeps a plan line only when its quoted sentence is found on that page. Each source number opens the official page at that sentence. Latest test run on the live web: 19 of 19 scenarios, 98 of 98 quotes found on their pages, 6 of 6 messages with nothing to research refused, median 5.6 s, about $0.03 of Exa search per case. Judges can ask their own question at /try.
- **How each Exa product is used** (add to the note if there is room):
  > Exa Search `auto` with an output schema: the structured searches on official sites, plus one limited to pages published in the last four months. Exa Search `lite`: a first look at the official pages in under a second, shown while the research runs. Exa Contents: the second reader of every cited page, next to our own request. Exa Agent: a second research mode on /try, one agent run in place of the separate searches, whose quotes pass the same page check (one measured run: 32 s, 11 of 11 quotes confirmed).
- **Evidence:** `src/data/scorecard.json`, `eval/results/latest.md`, the front page replay. The scorecard figures describe the fast mode; the agent mode has single measured runs only.

### - [ ] NVIDIA: Best Use of Nemotron

- **Why it fits:** Nemotron 3.5 Super VL is AIDaddy's conversation model, in Telegram and on `/chat`.
- **Required:** a text in the form naming the model, what it does, why it matters and how we improved its outputs. Paste this:
  > **Model:** `nvidia/nemotron-3.5-super-vl-120b-a12b`, through the Hermes Agent runtime's NVIDIA provider. **What it does:** it is the whole conversation layer of AIDaddy. It decides whether a message in a group needs an answer, calls our research tool, writes drafts of letters for the household to send, sets reminders after approval, and reads photos of official letters with its own vision (no separate OCR model). **Why it matters:** one open model handles text, images and tool calls, so a newcomer can drop a photo of a Finnish letter into the chat and get a plan back. **How we improved its outputs:** (1) The model never states a figure itself. Deadlines and amounts come only from our research engine, which keeps a line only when its quoted sentence is found on the cited page; the model posts those lines unchanged. (2) A persona file and short skills give it exact procedures and the reason behind each rule. (3) A local Gemma gate stops small talk before it reaches Nemotron, and the model answers `[SILENT]` when it is still unsure. (4) An emergency rule wakes it and forbids silence; it then answers without tools, in fixed Red Cross words with 112 first. (5) We rehearsed scenarios from the command line and recorded live group runs, then fixed what failed: recovery when a case is missing, and duplicate reminders. Measured: first reply 3 to 12 seconds; a letter photo was read correctly in all six field groups with two street-name errors.
- **Evidence:** `docs/HERMES_HANDOVER.md`, `hermes/SOUL.md`, `hermes/skills/`, `eval/bot/`.

### - [ ] Google DeepMind: Best Use of Gemma

- **Why it fits:** Gemma is the gate that makes "silent until it matters" true.
- **Note to paste:**
  > Gemma 3 (1B) runs with Ollama next to the bot, on our own server in Finland. Every group message goes to it first, after simple rules and wake patterns. It decides one thing: is this a life event or small talk? Small talk stops there and never reaches the cloud model. If Gemma is unsure it wakes the bot; if it is down, the patterns take over. Measured on our labelled set of 60 messages in English and Finnish: 0 of 20 life events missed, 1 of 40 small-talk messages woke the bot. Patterns alone missed 3 of 20, and so did the model alone, so the combination is what works. It is a development set, not a blind test. Photos, and messages in the three minutes after a wake, go on to the conversation model.
- **Evidence:** `eval/results/gate-gemma3-1b.json`, `eval/gate/`, `hermes/plugins/kaveri-gate/`.

### - [ ] Verda: Verda Compute Track

- **Why it fits:** the whole product runs on one Verda CPU instance, which their brief lists ("CPU instances for hosting agentic applications", and "Keep sensitive data in Europe. Run open-weight models on infrastructure you control").
- **Required by the brief:** document the process, and **post a link to the summary in Verda's Discord channel**. The summary is [VERDA.md](VERDA.md). The repo is private, so either make it public first or paste the summary's text into the Discord post.
- **Note to paste:**
  > Everything runs on one Verda CPU instance in Finland (8 vCPU, 32 GB): the website and research engine, the Telegram bot, a second web-only bot instance, and Gemma 3 served by Ollama as the privacy gate. A laptop could not do this: the bot needs one always-on host, judges need case links that open on any phone, and the gate model has to sit next to the bot so small talk is judged on infrastructure we control, in Europe, before anything goes to a cloud model. Every merge to main is tested and then deployed to the instance automatically, with a rollback when the health check fails. Process and scaling path: docs/VERDA.md.

### - [ ] Major League Hacking: Best Use of ElevenLabs

- **Why it fits:** ElevenLabs is AIDaddy's voice on the live site, and the voice paths were checked on the production server on Sunday at 09:35: `/api/aidaddy/speak` returned spoken audio in about one second, and `/api/aidaddy/listen` (Scribe) turned that audio back into "Hello, this is AIDaddy". `/api/health` reports `"voice":"elevenlabs"` and `"calls":"browser"`.
- **Voice used live:** AIDaddy's own voice (Voice Design) when the server's account has it, otherwise the standard voice "Bill" (DECISIONS.md, Sun 04:36). The front page plan and the emergency clips are pre-rendered in AIDaddy's own voice. The pitch files in `docs/pitch/voiceover/` use the premade George voice; the same lines in AIDaddy's voice are in `docs/pitch/voiceover-aidaddy/`.
- **Not claimed:** a real voice conversation on `/call` (#32 stays open until a person holds one on the deployed site), and phone calls over Twilio (not configured on the server).
- **Note to paste:**
  > ElevenLabs is AIDaddy's voice on the live site. Text to speech speaks the chat's replies and reads a case's plan aloud, in the case's own language (Finnish, Swedish, German, Spanish, French, Ukrainian, Estonian or English), slower and steadier after bad news; it says only what the case file shows. Scribe turns a short voice note into an editable draft before anything is sent. The emergency words on the listening page are clips in AIDaddy's voice, loaded when listening starts so they play without a tap or the network. AIDaddy's own voice is made with Voice Design, not a clone of anyone; live replies fall back to a standard ElevenLabs voice when the server's account lacks it. The `/call` page is a first version: after one confirmation, an ElevenLabs agent in AIDaddy's voice holds the call on a browser test line, and purchases discussed on a call are role-play.
- **Evidence:** `src/lib/speech.ts`, `src/app/api/aidaddy/speak`, `src/app/api/aidaddy/listen`, `public/listen/emergency/`, `src/data/plan-audio.json`, `docs/DEMO_CALLS.md`.

## 2. Close: select only after the named step is done (6)

Each of these needs work that is not done. The team's own feature freeze was 20:00, so starting any of them is a team decision. If the step is not done, do not select the challenge.

| | Challenge | What is there | What is missing | Rough effort |
|---|---|---|---|---|
| - [ ] | **Oxylabs: Best agentic use of the Web API** | A third page reader in the verifier calls Oxylabs when our own request and Exa cannot read a page. Source URLs are shown everywhere. | The brief demands a live Web API call at runtime. We have no key (their Junction offer asked for a credit card) and no recorded real call. Needs `OXYLABS_API_KEY` on the server and one case where Oxylabs read a page. | 30 min with a key |
| - [ ] | **Context.dev: Best Use of Context.dev** (tech) | Nothing in the code. | "Must call at least one Context.dev endpoint in its core flow." The natural place is a fourth page reader in the verifier, shown on the case page as "found via Context.dev". Needs a key. | 1 to 2 h |
| - [ ] | **Context.dev: The Web Is Your Real-Time Database** (main) | The product does react to the live web: sources are re-checked and a changed sentence is reported. But it does this with Exa. | The same reader as above, plus the re-check using it, so that Context.dev data visibly drives the "this source changed" message. | 2 to 3 h |
| - [ ] | **CRACI: Best use of CRACI** | Our CI runs on GitHub Actions. | The brief says a project qualifies when its CI/CD runs on CRACI: change a job to `runs-on: craci`. Needs CRACI set up for the repo (ask at their booth) and a green run. | 30 min with their help |
| - [ ] | **Google DeepMind: Best Use of Gemini API** | Nothing. Nemotron reads the letter photos. | Gemini needs a real job. The planned one: read the letter photo with Gemini and compare with Nemotron, which got two street names wrong. Enter only if Gemini is then used in the product. | 1 to 2 h |
| - [ ] | **Aiven: Best Use of Aiven** | Nothing. Cases are files on the server. | One Aiven service doing real work, for example Aiven PostgreSQL as the index from a cited page to the cases that cite it, so a page change finds the affected households. | 2 to 3 h |

**OpenAI: Best Use of Codex.** Select it only if a teammate really built part of this project with Codex and can show it. The work done in the Claude Code sessions does not count. Ask Vlad and Milan.

## 3. Not a fit

Selecting these would not help. One line each, so nobody has to wonder.

**Main challenges**

| Challenge | Why not |
|---|---|
| Hostinger: Decode the Noise | Detects propaganda and bots, and must run on Hostinger. We do neither. |
| Tieto: Earned Trust in AI Code | A code-review concept on their sample repository. |
| Cala: Make Unicorns Real | For founders and investors, on Cala's data. |
| Bahn: Spread | A simulation game with its own leaderboard. |
| AfterQuery: Break the Agent | A reinforcement-learning environment. Our scorecard is a test set, not an environment. |
| Valio Aimo: Trusted Trade Agents | A purchasing interface for a wholesaler. |
| City of Espoo: Rethinking Recruitment | About recruitment events. AIDaddy helps newcomers with paperwork, not with hiring. |
| S-Pankki: Personal Economic Trainer | Built on their bank-transaction dataset. Our finance desk gives rules and sources, not spending analysis. |
| MariaDB: Wikipedia Through Time | Needs MariaDB and Wikipedia data. |
| Stoa: Make Blueprints Talk | Construction drawings. |
| AstraZeneca, Aalto Beyond the Clinic | Healthcare products. |
| Arduino, Meta, Intel, Rokoko, Aalto humanoid | Hardware we do not use. |

**Tech challenges**

| Challenge | Why not |
|---|---|
| MongoDB Atlas, Tiger Data, Vultr, Modal | We use none of them. Storage is files on the Verda server. |
| Solana | No blockchain in the product. |
| Entire | We did not use Entire's sessions, graph or trails. |
| Cloudinary | Needs one of their four starter tools and image or video work. |
| Arduino Uno Q, Atech | Hardware. |

## 4. Before you press FINAL

- [ ] Every selected challenge has its note pasted where the form asks for one. Nemotron's is required.
- [ ] The Verda summary link is posted in Verda's Discord channel.
- [ ] The ElevenLabs note matches what the live server does (checked Sun 09:35; recheck `/api/health` shows `"voice":"elevenlabs"` just before FINAL).
- [ ] Any challenge from section 2 whose step was not done is unselected.
- [ ] The numbers in the notes still match `src/data/scorecard.json` and `eval/results/gate-gemma3-1b.json` after the last test run.
