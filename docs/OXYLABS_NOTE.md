# Oxylabs Web API: which endpoint we use and why

A short note for the Oxylabs challenge. The project is the same repo and demo as our Exa entry.

## Status, stated plainly

The reader is built and wired in. It has been tested against a local stand-in shaped like the documented response, not yet against the real API: we had no Oxylabs key on Friday night. Before submitting to this challenge, set `OXYLABS_API_KEY` on Vercel, run one case, and confirm that a source on the case page says "Quote found on the live page, read through Oxylabs". If that has not happened, do not claim it.

## Endpoint

`POST https://webapi.oxylabs.io/v1/scrape` with `Authorization: Bearer <key>` and the body `{ "url": "<page>", "output": ["markdown"] }`. We read `results[0].markdown`.

We do not use the search endpoint. Exa is the only finder in this project. Oxylabs is a reader.

## Where it sits

Kaveri answers a family's life event with a plan in which every line carries a sentence from an official page. After the search, our server opens every cited page again and checks that the sentence is really there (`src/lib/verify.ts`). Three readers can open a page:

1. Our own live request. Free, and the truest check.
2. Exa Contents. Reads PDFs and pages that build their text with JavaScript.
3. Oxylabs Web API. A live read of pages that refuse our own request. About 25 Finnish government hosts sit behind a bot challenge and answer a plain server request with an error.

When each reader runs:

| Situation | Oxylabs read |
|---|---|
| Fast research | Only for a page that neither our request nor Exa could open, so the claim would otherwise be dropped |
| Deep research | Every page our own request could not open |
| Change watch (`case_recheck`) | Every page our own request could not open, because a change watch needs a live reading and not a stored copy |

At most six pages per case go through Oxylabs, with a 25 second timeout. Without a key the reader is skipped and nothing else changes.

## Why it matters

- **A fact-checker that reads the source.** A quote confirmed only in Exa's stored copy is labelled as such. With Oxylabs the same quote can be confirmed on the page as it is today.
- **A watcher that can say what changed.** The change watch reports a quote as changed only when the sentence is gone from a page that still opens. A page behind a bot challenge would otherwise always be "unreachable", which says nothing. A quote last confirmed on a live reading must still be on a live reading, whatever an older copy says.

## What the user sees

- Each source on the case page says how its quote was confirmed: "on the live page", "on the live page, read through Oxylabs", or "in Exa's copy of the page".
- The research trail on the case page lists how many pages each reader opened.
- The API response of `POST /api/research` carries `readers: { live, exa, oxylabs }`.
- Every claim links to its source URL, and the link opens the page at the quoted sentence.

## Evidence to collect before the pitch

Run the scorecard with and without the key (`eval/run.mjs`) and report how many pages only Oxylabs could read. If the number is zero, say that it is a fallback and claim no benefit.
