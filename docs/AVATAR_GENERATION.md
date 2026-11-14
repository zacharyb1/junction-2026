# Avatar assets for the isolated concept

Develop the full asset pipeline without a model dependency first, then connect Gemini to the original image/video generation jobs. The local renderer supplies **playback test clips**, not a generated human avatar. No paid generation has been run. `scripts/avatar/template.mjs` contains an editable starting appearance, separate from the acting rules.

## What is ready

- `public/avatar/test/manifest.json`: eight local H.264 clips, two poses (`front`, `desk`), poster, explicit `placeholder: true`.
- `node scripts/avatar/make-test-clips.mjs`: regenerates those assets with an existing `ffmpeg`; no service call or package install.
- `node scripts/avatar/generate.mjs --help`: the shared asset workflow. Its default renderer is local fixtures; every provider defaults to dry run.
- The real profile is prepared under ignored `.data/avatar-generation/default/`. Local publishing creates `public/avatar/default/manifest.json` only after every clip exists.

## Build and exercise the pipeline offline

```sh
node scripts/avatar/generate.mjs --stage all --apply
```

The individual `front`, `desk`, `clips --clips all` and `publish` stages remain available for inspection between steps. `all` is deliberately limited to the offline provider. Existing outputs are preserved; running it again stops rather than overwriting them.

The default `fixture` provider reads local test media, extracts the two reference images, and supplies all eight clips through the same renderer interface. It never reads an API key or sends a request. Files go to ignored `.data/avatar-generation/preview/`; publication goes to ignored `public/avatar/preview/`. The manifest remains `placeholder: true`, and `/avatar` automatically displays this complete offline publication in place of the bundled test profile.

Both renderers receive a media job: an ID, desired output kind, prompt, reference images and optional video duration. Both return bytes and a MIME type. Model names, request bodies, authentication and response parsing belong only to the Gemini adapter in `scripts/avatar/renderers.mjs`. Scheduling, pose rules, preparation, and publication do not know the provider. Publishing prepares a temporary directory and exposes a complete profile only after conversion succeeds.

Offline fixtures establish the workflow, validation and playback. They do not simulate a model's latency, quota failures, visual consistency or ability to satisfy a new appearance prompt. Test assets stay labelled even after publication.

## Verified API contract

Checked against Google's live documentation on 14 November 2026. The Gemini API now uses `gemini-omni-1.2-flash` for video; the Veo 3.1 preview endpoints were retired on 22 October. [Google video documentation](https://aistudio.google.com/docs/video)

Omni supports interpolation between two image inputs for 3–10 seconds. The script describes their roles in natural language and reads media from REST `steps[].content[]`; `output_video` is an SDK convenience. Providing the same image twice is our proposed loop experiment: Google's support for interpolation does **not** establish that repeated endpoints will produce a natural loop or an invisible join. Native audio is removed before publication. [Google Omni guide](https://aistudio.google.com/docs/omni#first-and-last-frame-interpolation)

Canonical poses use `gemini-nano-banana-2.1`: first generate the front view from the template, then edit that generated image into the desk pose. This keeps appearance generation separate from movement. [Google image generation guide](https://aistudio.google.com/docs/image-generation)

## Generate only after choosing a budget

For the later Gemini integration, explicitly select `--provider gemini` and place `GEMINI_API_KEY` in this worktree's ignored `.env.local`, or provide it through the process environment. The scripts never print its value. Billing/model access and actual account quota must be checked in AI Studio. Do not infer account quota from the earlier chat. [Current pricing](https://aistudio.google.com/docs/pricing)

Dry run requires no key and makes no HTTP requests:

```sh
node scripts/avatar/generate.mjs --provider gemini --stage front
node scripts/avatar/generate.mjs --provider gemini --stage desk
node scripts/avatar/generate.mjs --provider gemini --clips all
```

The complete template is two image calls and eight video calls, requesting 30 seconds of video before any retries. First test only the front pose and one four-second idle loop. After an explicit decision to spend credit:

```sh
node --env-file=.env.local scripts/avatar/generate.mjs --provider gemini --stage front --apply
node --env-file=.env.local scripts/avatar/generate.mjs --provider gemini --clips idle --apply
```

Inspect the idle clip repeated several times. Only if its motion and joins are acceptable, create the desk pose, inspect it against the front pose, then generate the remaining clips:

```sh
node --env-file=.env.local scripts/avatar/generate.mjs --provider gemini --stage desk --apply
node --env-file=.env.local scripts/avatar/generate.mjs --provider gemini --clips listening,thinking,speaking,to-desk,working-a,working-b,to-front --max-requests 7 --max-video-seconds 26 --apply
```

Limits apply **per invocation**; they are request/duration caps, not a dollar billing cap. No automatic retry occurs. Attempts are logged before sending in `.data/avatar-generation/default/attempts.jsonl`. A timeout can still be billed. Existing files are never overwritten by the paid generator; review and move a failed output before making another attempt. Check current pricing when setting a monetary budget.

## Inspect and publish locally

Check identity, lighting, framing, natural pauses, hands, and the endpoint match for each clip. Test `front → to-desk → working-a → working-b → to-front → front`, including a requested state change halfway through a transition. All five activities must have usable loops. The speaking loop is generic acting; there is no audio-driven lip sync.

Publishing runs `ffmpeg` to remove audio and normalize H.264/yuv420p at 24 fps with a fast-start MP4 header. It probes actual durations, writes a poster, and emits the shared manifest shape. It changes local assets only; it does not deploy anything.

```sh
node scripts/avatar/generate.mjs --provider gemini --stage publish
node scripts/avatar/generate.mjs --provider gemini --stage publish --apply
```

The player can then use `/avatar/default/manifest.json` instead of `/avatar/test/manifest.json`. Do not label that profile as seamless until it has passed the playback review in the actual browser.

## Remaining evidence

Paid API requests, actual generated faces/acting, visual seam quality, and voice integration remain unverified. Test cards demonstrate scheduling and decoding only. No Gemini challenge claim should describe these local fixtures as model-generated media or describe asset preparation as a runtime Gemini integration.

## Free-tier access check, 14 November

The user supplied a free-tier key locally after the hackathon credit giveaway ran out. An authenticated model-catalogue request succeeded; catalogue presence alone does not establish generation entitlement. No image/video request was made. The planned Omni and Nano Banana models have no free tier according to [Google pricing](https://aistudio.google.com/docs/pricing).

One synthetic text-only call to `gemini-3.5-flash-lite` via Interactions returned HTTP 200, completed in 1,756 ms, using 50 input and 30 output tokens. The prompt asked for a single spoken sentence preserving uncertainty about an unconfirmed deadline. Output: “I found a source for you, but I couldn't confirm the deadline, so you'll want to read through it before taking any action.” This is a successful API smoke check, not a quality evaluation or an implemented runtime narration feature. Raw probe evidence stays in ignored `.data/avatar-generation/free-text-probe.json`; no key is recorded there.

Flash-Lite text input/output has a free tier; project quotas still apply. It is a candidate for preparing short spoken replies or appearance specifications. It does not create the avatar images or video. Selecting a sponsor challenge and the final runtime role remain team decisions.

## Hydrogen and the deferred integration

`gemini-4-hydrogen` also has free Standard-tier text input/output. It accepts images, video, audio and PDFs for understanding, but returns **text only**. It can help produce appearance specifications or acting prompts and inspect generated media; it cannot supply PNG or MP4 bytes through the media-renderer interface. [Model specification](https://aistudio.google.com/docs/models/gemini-4-hydrogen), [pricing](https://aistudio.google.com/docs/pricing#gemini-4-hydrogen).

Vlad chose to finish the concept without Gemini first and connect it later to the originally intended functions. Text narration is a separate optional idea, not a replacement for those functions and not part of this change. Real image/video generation still needs suitable model access. No Hydrogen API call has been made in this step.

The offline pipeline was exercised end to end on 14 November: two reference frames, eight clips, normalized publication, and browser playback from `/avatar/preview/`. A separate temporary workspace with a deliberately corrupt clip failed without publishing a partial profile or leaving a staging directory. All 31 avatar tests, ESLint, TypeScript and the production build passed. Desktop/mobile browser checks showed decoded preview videos, no horizontal overflow and no console errors. No real Gemini media call has been made; adapter tests use mocked responses.
