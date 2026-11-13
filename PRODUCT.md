# Product

<!-- impeccable:product-schema 1 -->

Written from `README.md`, `docs/CHALLENGE.md`, `docs/PITCH.md` and `CLAUDE.md` on 14 Nov 2026. Those files stay the authority: when they change, update this one.

## Platform

web

## Users

- **Families who use it:** international families in Finland. Two working parents, a rented flat, letters from Kela, Vero, Migri and the landlord in a language they do not read. They talk in a Telegram group chat.
- **People who judge it this weekend:** Junction 2026 judges (Exa engineers among them) and peer reviewers. Most reach the site on a phone after scanning a QR code at the team's table. They have minutes, and they will type their own question and country.

## Product Purpose

Kaveri (Finnish for "buddy") is a butler in a family's group chat. It reads along and stays silent until someone mentions a life event or shares an official letter. Then it researches official sources on the live web with Exa and posts a short plan: what to do, by when, and what the family is entitled to. A link opens the case file with every step, deadline and source.

Success for a family: an evening of reading official pages becomes a plan they can check in a minute. Success at the hackathon: a judge runs their own case in the browser demo and believes what the case file shows.

## Positioning

It checks itself: no sentence, no claim. Every line of a plan carries a sentence from a page, and Kaveri's own server opens that page again, by its own request and through Exa, and looks for the sentence. A step whose sentence is not on the page is left out, a figure without a sentence is removed, and what could not be confirmed is listed as unverified. A chat assistant's answer is a claim; this is a list of sentences you can open at the source.

It is also ambient. Nobody asks the bot anything. Small talk gets no reply.

## Operating Context

- A Telegram group chat where the bot is a member. The bot is a separate runtime that calls the research engine.
- The case file at `/c/[id]`: steps, deadlines, money, numbered quotes with how each was checked, gaps and open questions. Tapping a source number opens the official page at the quoted sentence.
- The browser demo at `/try`: the same engine without Telegram, with live progress. It needs an access code that the table's QR code carries.
- The landing page at `/`: explains the product, links to the demo and a sample case file, shows the scorecard.
- The scorecard: a fixed set of everyday scenarios run through the live engine by `eval/run.mjs`, written to `src/data/scorecard.json`.
- Official source lists per country in `src/data/official-sources.json`. Twelve countries have a checked list. Elsewhere it searches the open web and labels every source.

## Capabilities and Constraints

- Three Exa structured searches in parallel per case, official domains first, pinned to country and city. Each cited page is read twice: a live request and Exa Contents.
- When two sources give different figures, the case file shows both.
- A re-check opens each cited page again and reports a quote that is no longer there.
- The bot never sends, files, books or pays. Approval comes first.
- Research with sources, never "legal advice". Do not say "100% accurate".
- Answer languages and supported countries are a team decision recorded in `src/lib/engine/research.ts`. Do not add languages, countries or examples outside those lists.
- English is the main language for product copy. Finnish is available as an answer language and for case-page labels.
- Not decided here: which bot runtime is live at recording time, and whether quote translation, reminders and in-chat approvals ship.

## Brand Commitments

- Name: Kaveri. Gloss: Finnish for "buddy". Role: a butler.
- Voice: plain, short sentences, concrete. It says what it could not confirm.
- No logo, photographs or brand assets exist. The product's own interface (the chat, the case file, the scorecard) is the picture material.
- Independent hackathon project. Not affiliated with Kela, Vero or Telegram, and must not look as if it were.

## Evidence on Hand

- `src/data/scorecard.json`: real runs, with a link to the case file each scenario produced. Read it, never retype it.
- `src/data/sample-case.json`: the sample case (expecting a baby, Espoo). The chat example and the trust specimens on the landing page quote it word for word.
- Case-page labels in `src/lib/i18n.ts`, reused on the landing page so the two cannot drift apart.
- Numbers the team says aloud, with their sources, in `docs/PITCH.md`.
- There are no testimonials, customers, press or user counts. Do not invent any.

## Product Principles

1. No sentence, no claim. Proof sits next to the statement it supports.
2. Say what is missing. Gaps and disagreements are shown, never smoothed over.
3. Silent until it matters.
4. The person decides. Kaveri researches and prepares.
5. Show real runs, failures included.

## Accessibility & Inclusion

Readers often use English as a second language, on a phone, in a noisy hall. Plain words, WCAG 2.1 AA contrast, tap targets of at least 44 px, no meaning carried by colour alone, and reduced motion respected.
