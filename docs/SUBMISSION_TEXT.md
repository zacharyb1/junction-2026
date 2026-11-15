# Text for the submission form

Copy these into the Junction form. The pitch deck is [pitch/aidaddy-pitch-deck.pdf](pitch/aidaddy-pitch-deck.pdf); `node scripts/make-deck.mjs` rebuilds it from the live site and the result files.

Phone numbers and Discord names are not kept in this repository, because it becomes public at submission. Each team member types their own into the form.

## Project name

AIDaddy

## Punchline (10 words)

AIDaddy is the assistant that you don't have to ask.

Longer alternative (15 words): The always-listening family assistant you don't have to ask: source-checked plans before you prompt.

## Description

**Why we built it.** Saturday night, Junction 2026. This happened to our team. We took a brave bet: a personal assistant that is always listening. We could not have expected this choice to end up life-changing. We contacted 112, and the person is stable now. This is why we built AIDaddy. (Sorry, we came up with the name before the emergency.)

**Problem.** Every other AI waits for a prompt. Other AIs make you connect your data, set them up, and then still require a prompt. The problem is that we don't know what we don't know. The things that cost you money are the ones you never knew to ask about: a deadline on an invoice, a benefit nobody mentioned. You don't realize you filed your taxes wrong, you forget your wedding anniversary, or you are just too lazy to prompt. And when a chatbot does answer, it answers from memory, and you cannot check whether an amount or a deadline is still true this year.

**Solution.** AIDaddy is the assistant that you don't have to ask. It sits in the family's Telegram group, or listens at the kitchen table on a phone or laptop, and stays silent during small talk. When someone mentions a life event or shares a photo of an official letter, it researches the live web with Exa on its own and comes back with a short plan: what to do, by when, and the official sentence that says so. In an emergency it speaks at once, without research: call 112 first, then the Red Cross first aid steps, in fixed words that no model writes. It never sends, files, books or pays. It prepares, and the family decides. AIDaddy is here to AID.

**How it works.** A small Gemma model on our own server decides whether a message is a life event; small talk stops there. Hermes Agent with NVIDIA Nemotron holds the conversation and reads letter photos. The research engine runs structured Exa searches on the country's official sites and asks for steps, deadlines, amounts and quoted sentences in a schema we define. Then a verifier opens every cited page again, with our own request and with Exa Contents, and looks for the quoted sentence and its numbers on that page. A line whose sentence is not found is removed and listed as unconfirmed. The family gets a case file link with the plan, the quotes and the gaps.

**How we use Exa.** Exa Search `auto` with an output schema runs the structured searches on official sites, plus one search limited to pages published in the last four months. Exa Search `lite` gives a first look at the official pages in under a second, shown while the research runs. Exa Contents is the second reader of every cited page. Exa Agent is a second research mode on `/try`: one agent run searches, reads and reasons in steps, and its quotes pass the same page check.

**What is real in the demo.** The website, the research engine, the verifier and the case files are live at https://86.38.238.136.sslip.io, on one Verda server; anyone can type a situation at `/try` and get a checked plan in a few seconds. The Telegram bot runs on the same server. In the latest run of our own test set, 19 of 19 life events were researched correctly, 98 of 98 quotes were found on the pages they cite, 6 of 6 messages with nothing to research got no made-up plan, and the median time was 5.6 seconds. The web is live, so runs differ: recent runs passed 17 to 19 of 19. On 60 labelled messages the gate missed 0 of 20 life events and woke by mistake on 1 of 40 small-talk messages; that is our own development set, not a blind test. The listening page and the browser extension are first versions. The chat replays on the site use a fictional family with plans from real runs, and say so.

**What is next.** A watch on every cited page, so a rule change reaches the family the day it happens. Calendar and mail behind the same approval step. More countries: official site lists exist for 12, and Finland is tested in depth. A phone app, so listening works with the screen off.

This is research with sources, not legal advice.

## Technologies used

Exa (Search `auto` with output schema, Search `lite`, Exa Contents, Exa Agent), Next.js 16, React 19, TypeScript, Tailwind CSS, Hermes Agent, NVIDIA Nemotron (`nvidia/nemotron-3.5-super-vl-120b-a12b`), Gemma 3 1B on Ollama, ElevenLabs, Telegram Bot API, Docker Compose and Caddy on a Verda server, Playwright, Vitest.

## Note for the NVIDIA Nemotron challenge

The form asks which model, what it does, why it matters and how its output was improved.

- **Model:** `nvidia/nemotron-3.5-super-vl-120b-a12b`, through Hermes Agent.
- **Job:** the conversation in the group chat, the tool calls to the research engine, the drafts, and reading photos of official letters.
- **Why it matters:** one model reads the letter and decides what to research, so a family can photograph a letter in Finnish and get a plan in English.
- **How its output was improved:** the bot's instructions now make it fetch a case before reusing it, save and read back a deadline before scheduling a reminder, and avoid duplicate reminders; rehearsal records are in `eval/results/`. Facts and quotes are not taken from the model: they come from the research engine and are checked against the fetched pages.

## Links

- Demo: https://86.38.238.136.sslip.io
- Try it without setup: https://86.38.238.136.sslip.io/try
- Which challenges to select: [CHALLENGES_TO_SELECT.md](CHALLENGES_TO_SELECT.md)
