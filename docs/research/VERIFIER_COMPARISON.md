# Joined versus independent page readings

Measured 14 November 2026, 01:42–01:45 Helsinki. Base: `ef53df2`; engine patch: `3125e57`. This is a proposal for Zachary to review, not a production change.

## Finding and the existing design

The joined fallback in `judge()` deliberately allows partial readings to complement each other. Its current comment says:

> The readings can each hold part of a long quote (different line breaks, cut-off text).
> The engine grounds against all of them together, so the verdict here must as well.

That can recover legitimate material from incomplete extraction. It also permits a `verified` result when no individual reading passes the verifier's threshold, then attributes the result to `live`, `oxylabs` or `exa` as though that reader had confirmed it.

The regression fixture uses two readings of the same URL:

```text
direct: Applicants must submit the completed application to the authority.
exa:    The payment is available only after the application is approved.
quote:  <direct sentence> <exa sentence>
```

The individual matches are 0.33 and 0.40. Main returns `verified`, match 1, `checkedVia: exa`; this branch returns `not_found`, match 0.40. Neither extraction contains the complete proposed passage. Different extraction fragments, or readings from different times, need not form one passage that occurred on a page.

The proposed change requires one reading to meet the existing 0.8 threshold. It keeps all three readers, number checks and live-first rechecks. It does **not** turn approximate verification into an exact verbatim or semantic-entailment guarantee. An alternative is to retain joined verification but label it explicitly as combined readings and adjust the pitch accordingly.

## Live measurement

| Run | Scenarios passed | Verified quotes | Verified only by joined readings | Engine-reported Exa cost |
| --- | --- | --- | --- | --- |
| Main verifier | 18/19 | 128/128 | 0/128 | $0.39 |
| Independent verifier | 18/19 | 133/133 | 0/133 | $0.39 |

**Quotes dropped by removing the fallback on the same fetched readings: none in either run.** The observed coverage cost was zero across 261 quote observations. The different run totals are different generated research results, not a five-quote improvement caused by this patch.

Both runs failed `lost-passport-abroad` only because the case contained no deadline or amount. All its quotes verified (7/7 on main, 5/5 on this branch). There were no HTTP errors, no unsourced claims and no failed citation checks. Two silence scenarios remain manual bot checks and are excluded from the 19 scored cases.

Method:

1. Used this worktree's local engine on `127.0.0.1:3230`, fast mode, concurrency 2. The money filter and all other engine code were identical in both runs; only the active verifier differed.
2. Ran `eval/run.mjs` once with main's verifier and once with the independent verifier, using `--no-scorecard`. Exa used the team key; storage and credentials for case writes were local. No Blob token was loaded.
3. Temporary instrumentation computed both verdicts for each quote against the **same** fetched readings. For the independent comparison, main's individual reader inputs were unchanged and only its concatenated `page.text` was emptied, disabling the joined fallback. It logged URL, quote, matches and verdicts, without credentials.
4. Matched the diagnostics to every stored case citation by URL and quote, including multiplicities, and checked that each actual verdict matched the selected mode. All 128 baseline and 133 patched citations were accounted for.
5. Removed the instrumentation, restored the repository's existing scorecard report, and stopped the measurement server before validation.

Main had direct readings for 103 citations and Exa readings for all 128; the second run had direct readings for 112 and Exa readings for all 133. No Oxylabs key was available in `app.env`, so these live runs do not measure its contribution. Offline regressions exercise the three-reader combinations. The reported $0.78 is the engine's cost tally, not a billing reconciliation; separately billed Contents calls are not added to that field.

The sample cannot prove that the fallback is never useful. Live searches and page content vary. Latency differences likewise cannot be attributed to this verifier change.

[Measurement summary](../../eval/results/review-verifier-comparison-2026-11-14.json) includes run times, per-scenario counts, reader availability, failures, empty dropped-quote lists and hashes of the raw run/diagnostic files. Raw results remain in the ignored `.data/review/` directory in the measuring worktree.

## Other retained change and validation

Upstream still persists and displays fallback money items without checking that their citation references identify verified evidence. This branch withholds those items on publish/update and records an omission. It leaves upstream's unconfirmed step labels, partial updates and outage behavior intact. This is a persistence change: omitted amount/note values are not archived; fixing evidence alone does not restore them, and the caller must resubmit the money item.

The bot-template change was split onto `review-watch-template` (`cd8c82a`) and is excluded from the engine PR.

Validation after removing measurement hooks: all 11 offline regression tests pass; `pnpm lint`, `pnpm typecheck`, `pnpm build` and `git diff --check` pass. Main's verifier fails the two combined-reading regression tests while its three reader/provenance checks pass. No preview demo was claimed.

For the team's pitch, this proposal makes “every quote was checked on its page” mean that one identified reading of that page passed the verifier, rather than pieces being pooled across readings. It still does not establish that a rule is current, applicable to the family or correctly interpreted. Merging deploys the engine; Zachary should decide whether the stronger provenance is worth losing possible complementary-reading coverage.
