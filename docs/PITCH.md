# Pitch kit: AIDaddy

**Newer run of show:** [DEMO_PLAN.md](DEMO_PLAN.md) (Saturday 09:05) uses the new front page and the run 12 numbers. Its table replaces the two-minute video table below. The story, the criteria table and the judge answers here still hold.

**Before using this kit:** this script and the generated voiceover contain earlier scorecard measurements and proposed demo beats. Reconcile them with [the current handover](../README.md#what-the-evidence-establishes) and [challenge status](TECH_CHALLENGES.md) for the selected build before recording or submitting.

Filled in from `docs/PITCH_TEMPLATE.md`. Numbers below are from runs 8 and 9 (Sat 06:30 to 06:40). The newest run is 13 (Sun 01:54, on the Verda server): 17 of 19, 95 of 95 quotes, 6 of 6 refusals, median 7.4 s. Cases now carry about five quotes each, because repeated steps are merged. Re-run the scorecard on Saturday evening and update them before recording.

## The story

- **Who:** an international family in Finland. Two working parents, a rented flat, letters from Kela, Vero and the landlord in a language they do not read.
- **Problem:** a life event (a pregnancy, a rent increase, a cancelled flight, a lost job) starts a list of deadlines and entitlements that sit on ten different official pages. A chat assistant answers from memory, and its answer cannot be checked.
- **Why now, why Europe:** rules change every year and differ by country and city. Europe's public information is good and public, but spread over hundreds of sites and several languages.
- **Solution:** a butler in the family's group chat. It researches the live web with Exa, official sites first, and returns a short plan where every line carries a sentence from the page, checked again by our own server.
- **The wow:** tap a source number. The official page opens with the quoted sentence highlighted.
- **Impact:** about 6 seconds and 2 cents per case, instead of an evening of reading. The family sees what is confirmed and what is not.
- **Implementation, honestly:** the research engine, verifier, case pages, browser demo, REST API and MCP server are live. The Telegram bot runs on a separate runtime that calls the engine. Say which bot track is live when you record.

## Numbers you can say

| Fact | Value | Where it comes from |
|---|---|---|
| Scenarios passed | 19 of 19 (expect 18 or 19 on any run) | `eval/results/latest.md` |
| Quotes found on their pages | 119 of 119 in run 8, 127 of 127 in run 9 | same |
| Median time per case | 6.2 s in run 8, 7.1 s in run 9 | same |
| Messages with nothing to research that were refused | 6 of 6 | `eval/results/latest.md`, section Refusals |
| Unit tests on the grounding code | 70, in CI | `pnpm test` |
| Exa searches per case | 3 structured searches in parallel, plus 1 for recent official pages | research trail on every case page |
| Search cost per case | about $0.028 | Exa's `costDollars` in the response |
| Official sites mapped | 12 countries, about 650 hosts, 87 for Finland | `src/data/official-sources.json` |

Do not say "100% accurate". Say: "every line shown is backed by a sentence on a page we opened. What we could not confirm is listed."

## The five Exa criteria

| Criterion | What to show | Proof |
|---|---|---|
| Use of Exa for information not in training data | Structured search with `outputSchema`, `objective`, `userLocation` and `includeDomains` wildcards, then Exa Contents as the second page reader | The 2026 tax credit guide and this year's rent rules come back with this year's figures |
| Usefulness to a specific group | International families in Finland. English plan, quotes from Finnish, Swedish or English pages | Pregnancy and rent-letter cases |
| Clarity of sources | Numbered quotes, official or secondary label, how each was checked, highlight link, gaps list, "Two figures found" when sources disagree | Any case page |
| Originality | It checks itself: no sentence, no claim. It stays silent in a group chat until a life event appears | Trust section on the landing page |
| Working on live queries | `/try` with the judge's own question and country | Scorecard and the research trail |

## Two-minute video (max 2:00)

| Time | Picture | Words |
|---|---|---|
| 0:00 | Family chat. "I'm pregnant" | "Good news starts a list of deadlines. In a country whose language you do not read." |
| 0:12 | The plan appears in the chat, numbers after each line | "AIDaddy reads along and says nothing, until life happens. Then it researches the live web with Exa." |
| 0:30 | Open the case file on a phone | "Each line has the sentence it came from. Our server opened that page again and found the sentence." |
| 0:45 | Tap a number, the Kela page opens with the sentence highlighted | "Tap a number. The official page opens at that sentence." |
| 1:00 | Rent letter in Finnish pasted in `/try`, live progress | "A letter in Finnish. Three Exa searches on official sites, every cited page read twice." |
| 1:20 | Renovation case with "Two figures found" | "When two sources disagree, it shows both. It does not pick one in silence." |
| 1:35 | Scorecard on the landing page | "19 scenarios, 123 quotes, all found on their pages. Six seconds, two cents." |
| 1:50 | QR code | "AIDaddy. Research with sources, in your family chat." |

### Voiceover files

Each line of the table is rendered as its own file in `docs/pitch/voiceover/` with ElevenLabs (voice George, model `eleven_v4`), about 50 seconds of speech in total, so each can be placed on the video timeline. The words were checked by transcribing the files back to text. Nobody has listened to them yet. Lines 02 and 08 say the product name; their text spells it "A.I. Daddy" so the voice reads it as two words. Line 07 no longer quotes a quote count, because that number moves with every scorecard run.

Line 07 holds the scorecard numbers. If Saturday's run gives other numbers, change the text in `docs/pitch/voiceover.json` and run `node scripts/voiceover.mjs --only 07-numbers` (needs `ELEVENLABS_API_KEY`; in a Claude cloud session run it with `NODE_USE_ENV_PROXY=1` and no key).

## What was added on Friday night

Each is on main and can be shown. Say only what you have seen work yourself.

- **New on official sites.** A case lists up to three pages the official sites published in the last four months on its topic, for example "Government proposes an increase to the maternity grant" (Kela, August 2026). This is the clearest answer to "what could a model not know from training".
- **Live progress in `/try`.** Searches and pages appear as they finish, and each plan line shows its quoted sentence.
- **Work out the date.** A deadline such as "two months before the start of the leave" becomes a date and a calendar file.
- **Sources are read again.** A daily job and a button on the case page re-read the cited pages and flag a quote that is gone.
- **Listen to the plan.** ElevenLabs reads the plan aloud. Hidden until `ELEVENLABS_API_KEY` is set on Vercel.
- **Link previews.** A case link pasted into a chat shows "10 of 10 quotes found on their pages".
- **A safety net for the demo.** When live research is down, `/try` offers real cases researched earlier, labelled with their date.

## Live demo, three minutes

1. Landing page, one sentence on who it is for.
2. `/try`: "I just found out I am pregnant. We both work full time." Finland, Espoo. Point at the stages as they appear.
3. Open the case. Tap source 2. Show the highlighted sentence on kela.fi.
4. Ask the judge for their own question and country. Type it. This is the criterion "judges' own queries", so always do it.
5. If a judge asks about a restaurant or a trip: it works, sources are labelled "secondary", and prices it cannot find on a page are left out.

Fallbacks: if the venue network is slow, open a case made earlier (links in `eval/results/latest.md`). If Exa is down, show the sample case from the landing page and say so.

## Questions judges ask

- **"How is this different from asking a chatbot?"** A chatbot's answer is a claim. Ours is a list of sentences from official pages, each opened again by our server. A figure with no sentence is removed.
- **"What if the model invents a quote?"** It is replaced by the real sentence from the page, or the step is dropped. A quote that only resembles the page is never shown.
- **"What if the page is wrong or old?"** We show the source and its label. When two sources give different figures we show both.
- **"Other countries?"** Twelve have a checked official-site list. Others search the open web with every source labelled.
- **"Is this legal advice?"** No. Research with sources. It never sends, files, books or pays.
- **"What does it cost?"** About two cents of search per case.
- **"What if I type nonsense?"** It says it found nothing to research. It does not invent a situation.
- **"What is not done?"** Quote translation, reminders and approvals in the chat depend on the bot runtime. Say what is live at recording time.
