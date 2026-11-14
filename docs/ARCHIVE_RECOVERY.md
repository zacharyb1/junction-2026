# Recover recorded case links

Issue [#66](https://github.com/zacharyb1/junction-2026/issues/66) began as an unfinished data migration. The 14 November 15:51 entry in [DECISIONS.md](DECISIONS.md) records an exact download of 363 case files and two audio files before Vercel was deleted. Production now reads local files from the web container's `/app/.data/cases`, in the persistent `case-data` volume.

## Recovery through normal deployment

On 15 November, the public check found 29 recorded case IDs: the four newer video-demo cases returned matching pages and APIs; the other 25 returned 404. The original downloaded backup and server SSH access were not available on this machine. A complete recorded dataset in Git supplies another recovery source:

- **19 original scorecard cases:** `eval/results/2026-11-14T05-01-11-265Z.json` contains the full `results[*].case` objects captured by `GET /api/cases/:id` during the actual run. Their original IDs, timestamps, evidence, verification marks and other fields are retained. The published scorecard is unchanged.
- **Six refreshed demo cases:** the landing replay and five saved examples were genuinely researched again against an isolated local Engine with the existing Exa account on 15 November. They have new IDs, real new timestamps and measured timings; all 36 quotes were verified on their pages. `src/data/demo-case-seeds.json` contains those full Case objects, and `src/data/replay.json` / `example-cases.json` reference them. These are predefined synthetic demo scenarios, not household data. The old static narration is no longer offered because it describes the old replay.
- **Four existing video-demo cases:** remain in production and are not replaced.

The image build validates and packages only the 25 original/refreshed Case objects above. On startup, `scripts/restore-recorded-seed.mjs` imports missing cases before the web server starts. It uses the exclusive importer below, never overwrites an existing case, and skips local import if Blob storage is configured. Existing production data and the Telegram gateway stay in place. The deployment needs no new provider credentials or SSH access outside the existing deployment workflow.

All **current** recorded/sample links must pass the checker below after deployment before #66 is closed. The six former replay/example IDs are not reused or made to represent new research. Old bookmarks to those IDs still need the original backup; this repair refreshes their links on the site. It does not claim recovery of all 363 historical cases.

## Check the recorded links

From this repository, with Node 22 or newer:

```bash
node scripts/check-recorded-cases.mjs
```

The check reads case IDs from the landing replay, saved examples, scorecard and four demo recordings. For each ID it requires both the public page and case API to answer 200, and the API to return the matching ID with steps and evidence. It prints IDs and status codes, never case text, and exits nonzero if any check fails. Use `--origin https://your-host` for another deployment. Check the source revision that is deployed; an additional `NEXT_PUBLIC_SAMPLE_CASE_ID` override must be checked separately.

## Optional: restore the original full backup

This additional operation needs the **original** backup's `cases` directory and SSH access to the existing server. It can restore historical bookmarks beyond the current demo links. Do not reconstruct old cases from summaries or give fresh research an old ID. Keep the incoming backup outside Git. The commands below assume its location is `/root/kaveri-recovery/blob-backup/cases`; substitute the real private path.

From `/opt/kaveri`, first preserve the current store. A failed backup must be resolved before continuing. This leaves the running web app and Telegram gateway in place:

```bash
umask 077
mkdir -p /root/kaveri-recovery
docker compose --env-file .env.local exec -T --user root web \
  tar -C /app/.data -czf - cases \
  > "/root/kaveri-recovery/before-restore-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
```

Copy the helper and incoming cases into a new temporary directory in the existing web container. If that directory already exists, inspect it before repeating these steps:

```bash
docker compose --env-file .env.local exec -T web \
  mkdir -m 700 /tmp/kaveri-archive-restore
docker compose --env-file .env.local cp scripts/restore-cases.mjs \
  web:/tmp/kaveri-archive-restore/restore-cases.mjs
docker compose --env-file .env.local cp /root/kaveri-recovery/blob-backup/cases \
  web:/tmp/kaveri-archive-restore/cases
docker compose --env-file .env.local exec -T --user root web \
  chown -R node:node /tmp/kaveri-archive-restore
```

Run the dry run and inspect its counts:

```bash
docker compose --env-file .env.local exec -T web node \
  /tmp/kaveri-archive-restore/restore-cases.mjs \
  /tmp/kaveri-archive-restore/cases /app/.data/cases
```

`cases` should match the original backup manifest (recorded as 363). `missing` is what would be imported; `identical` already matches exactly; `keptDifferent` has an existing version that will be preserved. The importer validates every incoming filename and embedded ID before writing anything. It rejects malformed JSON and symlinks. Inspect unexpected counts before proceeding.

Apply the same import:

```bash
docker compose --env-file .env.local exec -T web node \
  /tmp/kaveri-archive-restore/restore-cases.mjs \
  /tmp/kaveri-archive-restore/cases /app/.data/cases --apply
```

Each missing file is published atomically with its original bytes and ID. An existing file is never overwritten, including one that appears during the import. Originals stay in the private backup. A partial run can be repeated safely. No container rebuild, restart, or second gateway is needed.

Re-run `node scripts/check-recorded-cases.mjs` from a checkout matching the deployed revision. Also check any historical bookmark being restored directly. Inspect any still-missing old ID in the original backup; never save another case under it. The two archived audio files are separate from case JSON and are not imported by this helper; keep them in the backup for voice recovery.

After successful verification, remove only the temporary container copy:

```bash
docker compose --env-file .env.local exec -T web \
  rm -rf /tmp/kaveri-archive-restore
```

Retain both private host backups. If a restored case needs to be withdrawn, identify that newly imported file explicitly; never roll an entire live volume back over newer cases.

## Local safety checks

```bash
node --test scripts/restore-cases.test.mjs scripts/check-recorded-cases.test.mjs scripts/recorded-seed.test.mjs
```

These cover exact bytes, dry runs, existing newer cases, full-input validation, symlinks, concurrent imports, and a link check that fails on a missing or wrong case and passes after restoration. They do not establish that production has been restored.

The container smoke check also opens all 25 packaged case pages and APIs, compares every returned Case object to its recorded source, edits one restored case, and verifies that the newer edit survives container replacement:

```bash
docker build --tag kaveri-web:check .
node scripts/container-smoke.mjs docker kaveri-web:check
```
