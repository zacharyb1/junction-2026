# Avatar proof of concept (issue 65)

Branch: `vlad/avatar-concept`. Route: `/avatar`. The question is whether an assistant with a visible character and purposeful actions is worth making central to the product. This prototype can be shown before buying any generation access. Zachary's existing pages and the shared bot are unchanged.

## Show it

```sh
DEMO_OPEN=1 pnpm dev --port 3111 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3111/avatar`.

1. Choose **Ari · home office** or **Noor · studio**.
2. Press **Watch recorded example**. The character turns to the laptop while the recorded searches run, returns to the conversation, and speaks when the associated recording plays. The complete example lasts about 49 seconds; uncheck **Include the recorded voice** for the nine-second version.
3. Change character and compare. **Try the movements** exposes listening, thinking, working, speaking and idle individually. Pause freezes the current pose; Resume continues from it. Stop cancels the example and its audio.

The example uses the public Engine recording in `src/data/replay.json`: the original pregnancy question, search start/end times, stored plan and source URLs. It does not make a new search or model call. The MP3 is the matching earlier ElevenLabs pregnancy-plan recording in `public/hud/plan.mp3`. The written plan is not a complete audio transcript, and this older recording is not evidence of the later custom UKK voice. If a browser blocks automatic audio, **Hear recorded plan** starts it explicitly.

## What is implemented

- Two original illustrated adults, each with eight pre-rendered MP4 clips. Their faces, hair, clothing and room palettes differ, while acting rules remain shared.
- Blinking, breathing, a listening nod, a thoughtful glance/hand movement, a speaking gesture, laptop work and turns in both directions.
- The same scheduler and video player for illustrated, fixture and future generated profiles. Pose-compatible transitions are chosen at clip boundaries, without queuing stale actions.
- Speech state follows actual audio playback, including buffering and cancellation. Text arrival alone never animates speech. Lip synchronization is not implemented.
- Incoming video is decoded before replacing the outgoing frame. A slow download can hold a frame; this is not a guarantee of uninterrupted playback on every device.
- Reduced motion displays a still. No microphone capture is implemented in this concept; listening is a manual preview.

Regenerate the two illustrated profiles locally:

```sh
node scripts/avatar/make-illustrated-clips.mjs
```

The original vector rig lives in `scripts/avatar/illustrated-scene.mjs`. Rendering uses the installed `sharp` dependency and `ffmpeg`, with no service requests. Outputs are in `public/avatar/ari/` and `public/avatar/noor/`, labelled `medium: "illustrated"`. Idle is 1.5 seconds, work loops two seconds, listening/thinking 2.5 seconds, speaking three seconds and turns one second. Files are 800×450, H.264, 24 fps.

## Optional live question

```sh
DEMO_OPEN=1 AVATAR_UPSTREAM=https://86.38.238.136.sslip.io pnpm dev --port 3111 --hostname 127.0.0.1
```

A live question uses the team's research service and credits. Without `AVATAR_UPSTREAM`, the page uses the existing local UKK configuration. Without `DEMO_OPEN=1`, normal demo-code checks apply. The relay uses only the configured HTTPS origin and fixed `/api/aidaddy` path, without forwarding cookies or authentication tokens. This remote path follows the team's rename in PR #64; the isolated branch's local handler remains `/api/ukk`. Remote turns have no conversation memory. Dynamic voice needs the local ElevenLabs key; missing access does not prevent reading the reply or playing the recorded example.

Live Hermes tool events drive the same actions as the recorded example. This page changes presentation only: research, grounding, approvals, roles and the Telegram runtime are unchanged.

## Decision after the demonstration

Watch the example before reading the event log. Can a viewer tell when the assistant is attending to them and when it is working? Does the movement make the wait more understandable? Does choosing a different character change the experience enough to matter? These are the questions this prototype lets the team judge; they have not been established by automated tests.

This does **not** establish natural photorealistic motion, consistent identity from a generation model, arbitrary new appearances, or convincing generated-video joins. Those need a later bounded media experiment if the team finds the experience worthwhile. A free Gemini key exists locally, but no paid avatar generation has run. Gemini integration remains planned for the original image/video jobs, not a substituted narration feature. See [asset workflow and generation notes](AVATAR_GENERATION.md).

## Validation

The production build, TypeScript, ESLint and 31 existing avatar tests pass. The build retains the unrelated Chiron Sung HK fallback-font warning. Source frames at every illustrated clip endpoint match the corresponding canonical front/desk pose exactly; compressed video and playback are checked separately in the browser.

Earlier integration validation included one live rent question through the public server, with 1,227 reply characters, tool events and a clickable Case link. The local voice endpoint correctly reported unavailable without falsely animating speech. No new live model request is needed to validate the offline proof of concept.

The complete recorded example was checked in Chromium: search → desk work → return → speech → idle, with matching stored plan and four source links, zero API requests, and zero blank frames in 504 samples at 100 ms intervals. This sampling is not a sub-frame smoothness guarantee. Stop/restart during a turn, audio cancellation, denied autoplay followed by manual voice playback, and normal audio completion passed. Pause preserved the same transition video at exactly 0.0562 seconds; rapid pause/resume also recovered. Both characters played, reduced motion showed the poster, and widths 320/390/768/1024 had no horizontal overflow. No console errors occurred; Next emitted CSS-preload warnings. Screenshots are saved under `/tmp/avatar-poc-*.png` locally.

After the team's API rename in PR #64, a direct live-chat probe initially reproduced the user's generic 502 in 219 ms; remote `/api/ukk` returned 404 HTML. The relay was updated to `/api/aidaddy`. The same probe then returned HTTP 200 with a nonempty SSE reply in 5,642 ms. All 17 relay tests, ESLint and the production build passed. No server configuration or Verda resources were changed.
