# Which challenges to select in the submission form

Written Saturday 14 November, 20:09 Helsinki, from the challenge texts on the Junction platform. The platform lets one project enter several challenges. Tick a box here when you have selected it on the platform.

**The rule we follow:** select a challenge only when its technology does real work in the demo. A judge who opens the project and cannot find their product will mark it down, and that costs more than the entry gains.

Demo address for every note below: <https://86.38.238.136.sslip.io>

## 1. Select now (5)

These work today. Each has a note you can paste into the form.

### - [ ] Exa: The Internet Butler / Your Personal Assistant (main challenge)

- **Why it fits:** this is the challenge the product was built for.
- **Note to paste:**
  > AIDaddy is a butler in a household's Telegram group, on the web and in the browser. It stays silent on small talk. On a life event or an official letter it runs four Exa structured searches on the official sites of the right country, opens every page it wants to cite again (our own request plus Exa Contents), and keeps a plan line only when its quoted sentence is found on that page. Each source number opens the official page at that sentence. Latest test run on the live web, on the Verda server: 17 of 19 scenarios, 95 of 95 quotes found on their pages, 6 of 6 messages with nothing to research refused, median 7.4 s, about $0.03 of Exa search per case. Judges can ask their own question at /try.
- **Evidence:** `src/data/scorecard.json`, `eval/results/latest.md`, the front page replay.

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

### - [ ] Major League Hacking: Best Use of ElevenLabs

- **Why it fits:** AIDaddy has its own voice, and the voice is used in four places.
- **Do first:** the server has no ElevenLabs key yet (`/api/health` says `"voice":"none"`), so `/chat` shows "Voice is not set up on this server". Add `ELEVENLABS_API_KEY` to the server's `.env.local` (Milan). The front page's "Hear the plan" works without it.
- **Note to paste:**
  > AIDaddy's voice was made with ElevenLabs Voice Design from a text description (a calm older voice with a light Nordic accent). It is not a clone of anyone. ElevenLabs is used in four places: (1) every case file can be read aloud, and the audio says only what the file shows; (2) on /chat each reply is spoken while a drawn avatar glows with the audio; (3) the microphone button sends speech to ElevenLabs Scribe and puts the words in the message box to check before sending; (4) the front page's "Hear the plan" and the pitch voiceover. We checked the spoken words by transcribing the audio back to text.
- **Evidence:** `src/lib/speech.ts`, `src/app/api/aidaddy/speak`, `src/app/api/aidaddy/listen`, `public/hud/plan.mp3`, `docs/pitch/voiceover/`.

### - [ ] Verda: Verda Compute Track

- **Why it fits:** the whole product runs on one Verda CPU instance, which their brief lists ("CPU instances for hosting agentic applications", and "Keep sensitive data in Europe. Run open-weight models on infrastructure you control").
- **Required by the brief:** document the process, and **post a link to the summary in Verda's Discord channel**. The summary is [VERDA.md](VERDA.md). The repo is private, so either make it public first or paste the summary's text into the Discord post.
- **Note to paste:**
  > Everything runs on one Verda CPU instance in Finland (8 vCPU, 32 GB): the website and research engine, the Telegram bot, a second web-only bot instance, and Gemma 3 served by Ollama as the privacy gate. A laptop could not do this: the bot needs one always-on host, judges need case links that open on any phone, and the gate model has to sit next to the bot so small talk is judged on infrastructure we control, in Europe, before anything goes to a cloud model. Every merge to main is tested and then deployed to the instance automatically, with a rollback when the health check fails. Process and scaling path: docs/VERDA.md.

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
- [ ] `ELEVENLABS_API_KEY` is on the server, or the ElevenLabs note says where voice can be heard (the front page).
- [ ] Any challenge from section 2 whose step was not done is unselected.
- [ ] The numbers in the notes still match `src/data/scorecard.json` and `eval/results/gate-gemma3-1b.json` after the last test run.
