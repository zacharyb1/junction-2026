# How AIDaddy runs on Verda

A summary for the Verda Compute Track at Junction 2026. Written Saturday 14 November, 20:09 Helsinki. Details and dates are in the [decision log](DECISIONS.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

## What we built

AIDaddy is a butler for a household's group chat. It stays silent on small talk. When someone mentions a life event or shares an official letter, it researches the live web with Exa and answers with a plan in which every line points at a sentence on an official page.

Live during the hackathon at `https://86.38.238.136.sslip.io`. After the event the demo was stopped, and the server is being shut down.

## What runs on Verda

One **Verda CPU instance** in Finland (FIN-02, 8 vCPU, 32 GB) runs the whole product with Docker Compose:

| Service | What it does |
|---|---|
| Web app and research engine | The website, the case files, the research and the quote checking |
| Caddy | HTTPS for the public address |
| Ollama with Gemma 3 (1B) | The gate: decides whether a chat message is a life event or small talk |
| Hermes, Telegram | AIDaddy in the household's Telegram group |
| Hermes, web | A second, web-only instance of AIDaddy for the `/chat` page, with no memory |

## Why a CPU instance, and why not a laptop

- **The bot needs one always-on host.** A Telegram token can be polled from one place only. On a laptop the bot stopped whenever its owner closed the lid, and its case links pointed at `localhost`.
- **Judges open case links on their own phones.** That needs a public engine with storage that stays.
- **The gate model sits next to the bot.** Every group message is judged by an open-weight model on infrastructure we control, in Europe. Small talk stops there and never reaches a cloud model. This is the product's privacy claim, and it only holds when we run the model ourselves.
- **A CPU instance is the right size.** Gemma 3 (1B) answers in about 3 to 4 seconds on CPU, and the heavy model work (the conversation model, the search) is called over the network. A GPU would sit idle.

## How we got here

| When | Step |
|---|---|
| Friday | The engine ran on Vercel and the bot on one teammate's laptop. Bot and engine were never connected in production. |
| Saturday 08:25 | Compose gained a server mode: an HTTPS proxy, restart after a crash, and a setting for the engine's address. |
| Saturday 09:05 | Everything moved to the Verda instance: website, engine, both bots and the gate. |
| Saturday 09:20 | Automatic deployment: after the tests pass on `main`, GitHub Actions sends the commit to the instance over SSH. A script builds it, restarts what changed, and checks that the site reports the new commit and the bot is back in Telegram. If not, it puts the previous commit back. The deploy key can run that one script and nothing else. |
| Saturday 15:51 | Vercel was switched off. Verda is the only place the product runs. |
| Saturday 16:20 | A second bot instance for the website, separated from the Telegram one. |

## What we measured there

- **Gate, on the instance:** 0 of 20 life events missed and 1 of 40 small-talk messages let through, on our labelled set of 60 messages (`eval/results/gate-gemma3-1b.json`). It is a development set, not a blind test.
- **Research:** a plan in about 6 to 9 seconds, about $0.03 of search per case.
- **Deploys:** a merge to `main` reaches the instance by itself once the tests pass. When the tests fail, nothing is deployed.

## How it would scale to real users

| Part | Today | With many households |
|---|---|---|
| Gate | One Ollama process on the CPU instance | Gemma on Verda's Inference API or an auto-scaling container, so many chats are judged at once |
| Research engine | One container, cases as files | Stateless containers that scale with load, cases in a database |
| Bots | One instance for all groups | One bot container per group of households, each with its own memory |
| Nightly source re-check | One job | A batch job over all cited pages |

## Limits we know

- One instance is one point of failure. A restart takes the bot offline for about a minute.
- The bot's memory is shared across chats and kept apart by rules, not by separate storage.
- Photos, and messages in the three minutes after the bot wakes, go to the cloud conversation model. Only small talk outside that window stays on the instance.
