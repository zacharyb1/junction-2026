# Avatar assets for the isolated concept

This branch contains **playback test clips**, not a generated human avatar. They establish the video/pose contract without spending API credit. No paid generation has been run. The user has not yet selected a final appearance; `scripts/avatar/template.mjs` contains an editable starting template, separate from the acting rules.

## What is ready

- `public/avatar/test/manifest.json`: eight local H.264 clips, two poses (`front`, `desk`), poster, explicit `placeholder: true`.
- `node scripts/avatar/make-test-clips.mjs`: regenerates those assets with an existing `ffmpeg`; no service call or package install.
- `node scripts/avatar/generate.mjs --help`: a dry-run-first Gemini asset workflow. It uses Node's built-in `fetch`, with no SDK dependency.
- The real profile is prepared under ignored `.data/avatar-generation/default/`. Local publishing creates `public/avatar/default/manifest.json` only after every clip exists.

## Verified API contract

Checked against Google's live documentation on 14 November 2026. The Gemini API now uses `gemini-omni-1.2-flash` for video; the Veo 3.1 preview endpoints were retired on 22 October. [Google video documentation](https://aistudio.google.com/docs/video)

Omni supports interpolation between two image inputs for 3–10 seconds. The script describes their roles in natural language and reads media from REST `steps[].content[]`; `output_video` is an SDK convenience. Providing the same image twice is our proposed loop experiment: Google's support for interpolation does **not** establish that repeated endpoints will produce a natural loop or an invisible join. Native audio is removed before publication. [Google Omni guide](https://aistudio.google.com/docs/omni#first-and-last-frame-interpolation)

Canonical poses use `gemini-nano-banana-2.1`: first generate the front view from the template, then edit that generated image into the desk pose. This keeps appearance generation separate from movement. [Google image generation guide](https://aistudio.google.com/docs/image-generation)

## Generate only after choosing a budget

Place `GEMINI_API_KEY` in this worktree's ignored `.env.local`, or provide it through the process environment. The scripts never print its value. Billing/model access and actual account quota must be checked in AI Studio. Do not infer account quota from the earlier chat. [Current pricing](https://aistudio.google.com/docs/pricing)

Dry run requires no key and makes no HTTP requests:

```sh
node scripts/avatar/generate.mjs --stage front
node scripts/avatar/generate.mjs --stage desk
node scripts/avatar/generate.mjs --clips all
```

The complete template is two image calls and eight video calls, requesting 30 seconds of video before any retries. First test only the front pose and one four-second idle loop. After an explicit decision to spend credit:

```sh
node --env-file=.env.local scripts/avatar/generate.mjs --stage front --apply
node --env-file=.env.local scripts/avatar/generate.mjs --clips idle --apply
```

Inspect the idle clip repeated several times. Only if its motion and joins are acceptable, create the desk pose, inspect it against the front pose, then generate the remaining clips:

```sh
node --env-file=.env.local scripts/avatar/generate.mjs --stage desk --apply
node --env-file=.env.local scripts/avatar/generate.mjs --clips listening,thinking,speaking,to-desk,working-a,working-b,to-front --max-requests 7 --max-video-seconds 26 --apply
```

Limits apply **per invocation**; they are request/duration caps, not a dollar billing cap. No automatic retry occurs. Attempts are logged before sending in `.data/avatar-generation/default/attempts.jsonl`. A timeout can still be billed. Existing files are never overwritten by the paid generator; review and move a failed output before making another attempt. Check current pricing when setting a monetary budget.

## Inspect and publish locally

Check identity, lighting, framing, natural pauses, hands, and the endpoint match for each clip. Test `front → to-desk → working-a → working-b → to-front → front`, including a requested state change halfway through a transition. All five activities must have usable loops. The speaking loop is generic acting; there is no audio-driven lip sync.

Publishing runs `ffmpeg` to remove audio and normalize H.264/yuv420p at 24 fps with a fast-start MP4 header. It probes actual durations, writes a poster, and emits the shared manifest shape. It changes local assets only; it does not deploy anything.

```sh
node scripts/avatar/generate.mjs --stage publish
node scripts/avatar/generate.mjs --stage publish --apply
```

The player can then use `/avatar/default/manifest.json` instead of `/avatar/test/manifest.json`. Do not label that profile as seamless until it has passed the playback review in the actual browser.

## Remaining evidence

Paid API requests, actual generated faces/acting, visual seam quality, and voice integration remain unverified. Test cards demonstrate scheduling and decoding only. No Gemini challenge claim should describe these local fixtures as model-generated media or describe asset preparation as a runtime Gemini integration.
