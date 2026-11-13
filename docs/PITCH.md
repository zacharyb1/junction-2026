# Pitch kit: Kaveri

Filled in from `docs/PITCH_TEMPLATE.md`. Numbers are from scorecard run 5 (Fri 23:42). Re-run the scorecard on Saturday evening and update them before recording.

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
| Quotes found on their pages | 123 of 123 | same |
| Median time per case | 6.0 s, slowest tenth within 8.3 s | same |
| Exa searches per case | 3, in parallel | research trail on every case page |
| Search cost per case | about $0.021 | Exa's `costDollars` in the response |
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
| 0:12 | The plan appears in the chat, numbers after each line | "Kaveri reads along and says nothing, until life happens. Then it researches the live web with Exa." |
| 0:30 | Open the case file on a phone | "Each line has the sentence it came from. Our server opened that page again and found the sentence." |
| 0:45 | Tap a number, the Kela page opens with the sentence highlighted | "Tap a number. The official page opens at that sentence." |
| 1:00 | Rent letter in Finnish pasted in `/try`, live progress | "A letter in Finnish. Three Exa searches on official sites, every cited page read twice." |
| 1:20 | Renovation case with "Two figures found" | "When two sources disagree, it shows both. It does not pick one in silence." |
| 1:35 | Scorecard on the landing page | "19 scenarios, 123 quotes, all found on their pages. Six seconds, two cents." |
| 1:50 | QR code | "Kaveri. Research with sources, in your family chat." |

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
