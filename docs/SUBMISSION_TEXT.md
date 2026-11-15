# Text for the submission form

Copy these into the Junction form. Updated Sunday 15 November, 09:40 Helsinki, against the live server at commit `c77cbd4`. The pitch deck is [pitch/aidaddy-pitch-deck.pdf](pitch/aidaddy-pitch-deck.pdf); `node scripts/make-deck.mjs` rebuilds it from the live site and the result files.

Phone numbers and Discord names are not kept in this repository, because it becomes public at submission. Each team member types their own into the form.

Form limits: name 30 characters, punchline 200, description 5000 (the description below is under 5000).

## Project name

AIDaddy

## Punchline (10 words)

AIDaddy is the assistant that you don't have to ask.

Longer alternative (15 words): The always-listening family assistant you don't have to ask: source-checked plans before you prompt.

## Description

**Why we built it.** Saturday night, Junction 2026. This happened to our team. We took a brave bet: a personal assistant that is always listening. We could not have expected this choice to end up life-changing. We contacted 112, and the person is stable now. This is why we built AIDaddy. (Sorry, we came up with the name before the emergency.)

**Problem.** Every other AI waits for a prompt. Other AIs make you connect your data, set them up, and then still require a prompt. The problem is that we don't know what we don't know. The things that cost you money are the ones you never knew to ask about: a deadline on an invoice, a benefit nobody mentioned. You don't realize you filed your taxes wrong, you forget your wedding anniversary, or you are just too lazy to prompt. And when a chatbot does answer, it answers from memory, and you cannot check whether an amount or a deadline is still true this year.

**Solution.** AIDaddy is the assistant that you don't have to ask. It sits in the family's Telegram group, or listens at the kitchen table on a phone or laptop, and stays silent during small talk. When someone mentions a life event or shares a photo of an official letter, it researches the live web with Exa on its own and comes back with a short plan: what to do, by when, and the official sentence that says so. In an emergency it speaks at once, without research: call 112 first, then the Red Cross first aid steps, in fixed words that no model writes. It never sends, files, books or pays. It prepares, and the family decides. AIDaddy is here to AID.

**How it works.** A small Gemma model on our own server decides whether a message is a life event; small talk stops there. Hermes Agent with NVIDIA Nemotron holds the conversation and reads letter photos. The research engine runs structured Exa searches on the country's official sites and asks for steps, deadlines, amounts and quoted sentences in a schema we define. Then a verifier opens every cited page again, with our own request and with Exa Contents, and looks for the quoted sentence and its numbers on that page. A line whose sentence is not found is removed and listed as unconfirmed. The family gets a case file link with the plan, the quotes and the gaps. ElevenLabs gives AIDaddy its voice: it reads replies and plans aloud in the case's language, and turns a voice note into text.

**How we use Exa.** Exa Search `auto` with an output schema runs the structured searches on official sites, plus one search limited to pages published in the last four months. Exa Search `lite` gives a first look at the official pages in under a second, shown while the research runs. Exa Contents is the second reader of every cited page. Exa Agent is a second research mode on `/try`: one agent run searches, reads and reasons in steps, and its quotes pass the same page check.

**What is real in the demo.** The website, the research engine, the verifier and the case files are live at https://86.38.238.136.sslip.io, on one Verda server; anyone can type a situation at `/try` and get a checked plan in a few seconds. The Telegram bot runs on the same server. In the latest run of our own test set, 19 of 19 life events were researched correctly, 98 of 98 quotes were found on the pages they cite, 6 of 6 messages with nothing to research got no made-up plan, and the median time was 5.6 seconds. The web is live, so runs differ: recent runs passed 17 to 19 of 19. On 60 labelled messages the gate missed 0 of 20 life events and woke by mistake on 1 of 40 small-talk messages; that is our own development set, not a blind test. Voice is live on `/chat`: replies are spoken, and a voice note becomes a draft you can edit before sending. The emergency words answer at once on the listening page, in Telegram and in the web chat. The listening page, the browser extension and the `/call` page, where an ElevenLabs agent holds a confirmed call on a browser test line, are first versions. The chat replays on the site use a fictional family with plans from real runs, and say so.

**What is next.** A watch on every cited page, so a rule change reaches the family the day it happens. Calendar and mail behind the same approval step. Calls on a real phone line, still behind one confirmation. More countries: official site lists exist for 12, and Finland is tested in depth. A phone app, so listening works with the screen off.

This is research with sources, not legal advice.

## Technologies used

Exa (Search `auto` with output schema, Search `lite`, Exa Contents, Exa Agent), Next.js 16, React 19, TypeScript, Tailwind CSS, Hermes Agent, NVIDIA Nemotron (`nvidia/nemotron-3.5-super-vl-120b-a12b`), Gemma 3 1B on Ollama, ElevenLabs (text to speech, Voice Design, Scribe speech to text, Agents), the browser's Web Speech API on the listening page, Telegram Bot API, Docker Compose and Caddy on a Verda server, GitHub Actions, Playwright, Vitest.

## Challenges to select

The form has one main challenge picker and a separate tech challenge list. Select exactly these; the reasons and evidence are in [CHALLENGES_TO_SELECT.md](CHALLENGES_TO_SELECT.md).

| Form field | Select |
|---|---|
| Challenge Picker (main) | **Exa: The Internet Butler / Your Personal Assistant** |
| Tech Challenge Participation | **NVIDIA: Best Use of Nemotron**, **Google DeepMind: Best Use of Gemma**, **Verda: Verda Compute Track**, **Major League Hacking: Best Use of ElevenLabs** |

Do not select Oxylabs, Context.dev, CRACI, Gemini API, Aiven or OpenAI Codex: their technology does no work in the demo.

Verda also requires a post in their Discord channel with a link to [VERDA.md](VERDA.md), or its text while the repository is private.

## Note for the NVIDIA Nemotron challenge (required)

The form asks which model, what it does, why it matters and how its output was improved.

> **Model:** `nvidia/nemotron-3.5-super-vl-120b-a12b`, through the Hermes Agent runtime's NVIDIA provider. **What it does:** it is the whole conversation layer of AIDaddy, in Telegram and on `/chat`. It decides whether a message in a group needs an answer, calls our research tool, writes drafts of letters for the household to send, sets reminders after approval, and reads photos of official letters with its own vision (no separate OCR model). **Why it matters:** one open model handles text, images and tool calls, so a newcomer can drop a photo of a Finnish letter into the chat and get a plan back. **How we improved its outputs:** (1) The model never states a figure itself. Deadlines and amounts come only from our research engine, which keeps a line only when its quoted sentence is found on the cited page; the model posts those lines unchanged. (2) A persona file and short skills give it exact procedures and the reason behind each rule. (3) A local Gemma gate stops small talk before it reaches Nemotron, and the model answers `[SILENT]` when it is still unsure. (4) An emergency rule wakes it and forbids silence; it then answers without tools, in fixed Red Cross words with 112 first. (5) We rehearsed scenarios from the command line and recorded live group runs, then fixed what failed: recovery when a case is missing, and duplicate reminders. Measured: first reply 3 to 12 seconds; a letter photo was read correctly in all six field groups with two street-name errors.

## Note for the Gemma challenge

> Gemma 3 (1B) runs with Ollama next to the bot, on our own server in Finland. Every group message goes to it first, after simple rules and wake patterns. It decides one thing: is this a life event or small talk? Small talk stops there and never reaches the cloud model. If Gemma is unsure it wakes the bot; if it is down, the patterns take over. Measured on our labelled set of 60 messages in English and Finnish: 0 of 20 life events missed, 1 of 40 small-talk messages woke the bot. Patterns alone missed 3 of 20, and so did the model alone, so the combination is what works. It is a development set, not a blind test. The listening page can use the same model and prompt as an optional "Model check" for sentences its phrase list missed.

## Note for the Verda challenge

> Everything runs on one Verda CPU instance in Finland (8 vCPU, 32 GB): the website and research engine, the Telegram bot, a second web-only bot instance, and Gemma 3 served by Ollama as the privacy gate. A laptop could not do this: the bot needs one always-on host, judges need case links that open on any phone, and the gate model has to sit next to the bot so small talk is judged on infrastructure we control, in Europe, before anything goes to a cloud model. Every merge to main is tested and then deployed to the instance automatically, with a rollback when the health check fails. Process and scaling path: docs/VERDA.md.

## Note for the ElevenLabs challenge

Checked on the live server on Sunday at 09:35: `/api/aidaddy/speak` returned spoken audio in about one second, and `/api/aidaddy/listen` turned that audio back into "Hello, this is AIDaddy".

> ElevenLabs is AIDaddy's voice on the live site. Text to speech speaks the chat's replies and reads a case's plan aloud, in the case's own language (Finnish, Swedish, German, Spanish, French, Ukrainian, Estonian or English), slower and steadier after bad news; it says only what the case file shows. Scribe turns a short voice note into an editable draft before anything is sent. The emergency words on the listening page are clips in AIDaddy's voice, loaded when listening starts so they play without a tap or the network. AIDaddy's own voice is made with Voice Design, not a clone of anyone; live replies fall back to a standard ElevenLabs voice when the server's account lacks it. The `/call` page is a first version: after one confirmation, an ElevenLabs agent in AIDaddy's voice holds the call on a browser test line, and purchases discussed on a call are role-play.

## Links

- Demo: https://86.38.238.136.sslip.io
- Try it without setup: https://86.38.238.136.sslip.io/try
- Source code: https://github.com/zacharyb1/junction-2026 (make it public, or add the organizers, before FINAL)
- Which challenges to select and why: [CHALLENGES_TO_SELECT.md](CHALLENGES_TO_SELECT.md)
