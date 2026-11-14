# Recover recorded case links

Issue [#66](https://github.com/zacharyb1/junction-2026/issues/66) is an unfinished data migration. The 14 November 15:51 entry in [DECISIONS.md](DECISIONS.md) records an exact download of 363 case files and two audio files before Vercel was deleted. Production now reads local files from the web container's `/app/.data/cases`, in the persistent `case-data` volume.

**Recovery is still blocked as of 15 November:** this machine has neither that backup nor working Verda SSH access. The shared keys repository has no populated Blob token. Do not mark the issue Done because these helpers exist. No production data has been changed.

The public check on 15 November found 29 recorded case IDs: the four newer video-demo cases returned matching pages and APIs; the other 25 returned 404, including the landing recording, saved examples and scorecard cases.

## Check the recorded links

From this repository, with Node 22 or newer:

```bash
node scripts/check-recorded-cases.mjs
```

The check reads case IDs from the landing replay, saved examples, scorecard and four demo recordings. For each ID it requires both the public page and case API to answer 200, and the API to return the matching ID with steps and evidence. It prints IDs and status codes, never case text, and exits nonzero if any check fails. Use `--origin https://your-host` for another deployment. Check the source revision that is deployed; an additional `NEXT_PUBLIC_SAMPLE_CASE_ID` override must be checked separately.

## Restore on the server

The operator needs the **original** backup's `cases` directory and SSH access to the existing server. Do not reconstruct cases from the summaries in `src/data`, republish them with new IDs, or switch production back to Blob. Keep the incoming backup outside Git. The commands below assume its location is `/root/kaveri-recovery/blob-backup/cases`; substitute the real private path.

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

Re-run `node scripts/check-recorded-cases.mjs` from a checkout matching the deployed revision. All recorded pages and APIs must pass before #66 is closed. Inspect any still-missing ID in the original backup; do not replace its link with a different case. The two archived audio files are separate from case JSON and are not imported by this helper; keep them in the backup for voice recovery.

After successful verification, remove only the temporary container copy:

```bash
docker compose --env-file .env.local exec -T web \
  rm -rf /tmp/kaveri-archive-restore
```

Retain both private host backups. If a restored case needs to be withdrawn, identify that newly imported file explicitly; never roll an entire live volume back over newer cases.

## Local safety checks

```bash
node --test scripts/restore-cases.test.mjs scripts/check-recorded-cases.test.mjs
```

These cover exact bytes, dry runs, existing newer cases, full-input validation, symlinks, concurrent imports, and a link check that fails on a missing or wrong case and passes after restoration. They do not establish that production has been restored.
