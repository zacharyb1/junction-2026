# Which challenges to select in the submission form

Written Saturday 14 November, 20:09 Helsinki, from the challenge texts on the Junction platform. The platform lets one project enter several challenges. Tick a box here when you have selected it on the platform.

Handover updated Sunday 15 November for #72 and #77: the refreshed landing replay has new measurements and no matching narration, and unconfigured chat offers text without voice controls. This does not complete the live voice work in #75/#76 or the calling work in #32/#73.

**The rule we follow:** select a challenge only when its technology does real work in the demo. A judge who opens the project and cannot find their product will mark it down, and that costs more than the entry gains.

Demo address for every note below: <https://86.38.238.136.sslip.io>

## 1. Select now (4)

These work today. Each has a note you can paste into the form.

### - [ ] Exa: The Internet Butler / Your Personal Assistant (main challenge)

- **Why it fits:** this is the challenge the product was built for.
- **Note to paste:**
  > AIDaddy is a butler in a household's Telegram group, on the web and in the browser. It stays silent on small talk. On a life event or an official letter it first takes a look with Exa's lite search, which names the official pages in well under a second, then runs four Exa structured searches on the official sites of the right country, opens every page it wants to cite again (our own request plus Exa Contents), and keeps a plan line only when its quoted sentence is found on that page. Each source number opens the official page at that sentence. Latest test run on the live web: 19 of 19 scenarios, 98 of 98 quotes found on their pages, 6 of 6 messages with nothing to research refused, median 5.6 s, about $0.03 of Exa search per case. Judges can ask their own question at /try.
- **Which parts of Exa do what** (issue 109; say this when a judge asks how Exa is used):
  - **Search, lite:** the first look. Official pages named in about half a second while the research runs (measured 0.4 to 0.7 s).
  - **Search, auto, with structured output:** the plan. Three searches at once, each with an `objective`, a `systemPrompt`, an `outputSchema`, highlights, the user's country and the country's official sites as `includeDomains`.
  - **Search with a date filter:** a fourth search for pages the official sites published in the last four months (`startPublishedDate`): what a model's memory cannot hold.
  - **Search, deep:** the same plan search at `depth: "deep"`, when a case asks for it.
  - **Contents:** a second reading of every cited page, also for PDFs and pages that refuse our own request, so each quote is checked on its page.
  - **Not used, and why:** past versions of pages (Exa Snapshot) answered "not on the current plan" for our account (tried Sun 04:40; a top-up unlocks a trial), so the idea of marking a sentence that was not on its page a while ago is not built. The Agent API, Monitors, Answer and Websets have no job here yet: the plan needs a quote checked on its page within seconds, and the daily source check already runs on our own scheduler.
- **Evidence:** `src/data/scorecard.json`, `eval/results/latest.md`, the front page replay, `src/lib/engine/research.ts` (`firstLook`, `search`, `searchNews`), `src/lib/verify.ts` (`fetchViaExa`).

### - [ ] NVIDIA: Best Use of Nemotron

- **Why it fits:** Nemotron 3.5 Super VL is AIDaddy's conversation model, in Telegram and on `/chat`.
- **Required:** a text in the form naming the model, what it does, why it matters and how we improved its outputs. Paste this:
  > **Model:** `nvidia/nemotron-3.5-super-vl-120b-a12b`, through the Hermes Agent runtime's NVIDIA provider. **What it does:** it is the whole conversation layer of AIDaddy. It decides whether a message in a group needs an answer, calls our research tool, writes drafts of letters for the household to send, sets reminders after approval, and reads photos of official letters with its own vision (no separate OCR model). **Why it matters:** one open model handles text, images and tool calls, so a newcomer can drop a photo of a Finnish letter into the chat and get a plan back. **How we improved its outputs:** (1) The model never states a figure itself. Deadlines and amounts come only from our research engine, which keeps a line only when its quoted sentence is found on the cited page; the model posts those lines unchanged. (2) A persona file and ten short skills give it exact procedures and the reasons behind each rule. (3) A local Gemma gate stops small talk before it reaches Nemotron, and the model answers `[SILENT]` when it is still unsure. (4) We rehearsed 12 scenarios from the command line and recorded live group runs, then fixed what failed: recovery when a case is missing, and duplicate reminders. Measured: first reply 3 to 12 seconds; a letter photo was read correctly in all six field groups with two street-name errors.
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

## 2. Close: select only after the named step is done (7)

Each of these needs work that is not done. The team's own feature freeze was 20:00, so starting any of them is a team decision. If the step is not done, do not select the challenge.

### - [ ] Major League Hacking: Best Use of ElevenLabs

- **What exists:** case narration, chat speech and speech-to-text code, plus recorded pitch audio. The pitch files in `docs/pitch/voiceover/` use the premade George voice; do not describe them as the project's designed voice. The same eight lines in AIDaddy's own designed voice are in `docs/pitch/voiceover-aidaddy/`.
- **Required for a live voice claim:** account configuration from #76, then the production checks in #75: the intended voice plays a reply and a short voice note becomes an editable draft. A configured-key flag or simulated browser audio does not prove either provider path works. Check case narration separately before claiming it in the demo. #37 remains open until the intended voice feature is demonstrated.
- **Works on the server without a key:** the front page's "Hear the plan" button plays the current recorded run's plan in AIDaddy's designed voice (35 seconds, rendered from that case by the same route, checked by transcribing it back). The page offers it only for the case named in `src/data/plan-audio.json`, so a new recording is never narrated by old audio.
- **The voice fits the case:** a case is read in its own language (Finnish, Swedish, German, Spanish, French, Ukrainian, Estonian), slower and steadier after bad news, with more movement after good news; a chat reply is spoken in the language of the reply. Measured on a Finnish dismissal case and the English pregnancy case (docs/DECISIONS.md, Sun 02:40). On the server this needs the key, like every live voice path.
- **Current fallback:** `/chat` offers text and hides voice controls when the server has no ElevenLabs key.
- **Note to paste only after the named live checks pass; remove any path not demonstrated:**
  > ElevenLabs gives AIDaddy its spoken interface: case narration reads the stored plan, chat replies can be spoken while the avatar follows the audio, and Scribe turns a short voice note into an editable draft before sending. The voice fits the case: it reads in the case's language (Finnish, Swedish, German, Spanish, French, Ukrainian or Estonian), slower and steadier after bad news, lighter after good news, and it says only what the case file shows. The voice is our own, made with Voice Design, not a clone of anyone. We demonstrated these paths on the deployed app with the intended voice. Outbound phone calls are a separate controlled rehearsal and are not claimed here.
- **Narrower note, true today without the server key:**
  > On the front page, AIDaddy reads the recorded run's plan aloud in its own ElevenLabs voice, made with Voice Design. The audio was rendered from that case file by the product's own narration route and says only what the file shows.
- **Recorded-only alternative:** if the final video uses the existing ElevenLabs voiceover, describe that exact use and listen to the final edit. Recorded assets alone do not establish a live voice feature; reconcile that narrower submission with [the challenge evidence](TECH_CHALLENGES.md).
- **Evidence:** `src/lib/speech.ts`, `src/app/api/aidaddy/speak`, `src/app/api/aidaddy/listen`, `docs/pitch/voiceover.json`, `docs/pitch/voiceover/`, and the eventual #75 acceptance results.

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
- [ ] The ElevenLabs note matches demonstrated audio: live acceptance under #75/#76, the front page's narration (the narrower note), or an accurately described voiceover actually included in the final video.
- [ ] Any challenge from section 2 whose step was not done is unselected.
- [ ] The numbers in the notes still match `src/data/scorecard.json` and `eval/results/gate-gemma3-1b.json` after the last test run.
