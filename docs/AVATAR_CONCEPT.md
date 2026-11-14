# Separate avatar concept (issue 65)

Branch: `vlad/avatar-concept`. Route: `/avatar`. Existing pages and the production bot are unchanged. This is an engineering prototype for the team's decision, not a finished human avatar.

## Run

```sh
pnpm install --frozen-lockfile
DEMO_OPEN=1 pnpm dev --port 3111 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3111/avatar`. “Play walkthrough” runs synthetic, explicitly labelled events with no service calls. “Try the movements” previews all five actions. Motion can be paused; the device's reduced-motion preference shows the poster instead.

For a real streamed response through the existing public web assistant:

```sh
DEMO_OPEN=1 AVATAR_UPSTREAM=https://86.38.238.136.sslip.io pnpm dev --port 3111 --hostname 127.0.0.1
```

Each live question uses the team's research credits. Without `AVATAR_UPSTREAM`, the concept uses the existing local `/api/ukk` implementation and its configuration. Without `DEMO_OPEN=1`, the existing demo-code checks apply. The relay accepts only the server-configured HTTPS origin and fixed `/api/ukk` path; it does not forward cookies or authentication tokens. Remote turns are independent, with no conversation memory.

## What to evaluate

The controller reads Hermes tool-progress and response events. Concurrent tools keep it working until the last tool completes. Text arriving is not speech. “Read aloud” uses the existing local ElevenLabs endpoint, and only actual playback activates speaking. This voice endpoint needs its own local key even when chat is relayed; missing voice shows a message and leaves the reply readable. Listening is a movement preview only; this concept does not capture the microphone.

The scheduler chooses the shortest pose transition at clip boundaries. A working request moves from `front` through `to-desk`, then alternates working loops. When the request finishes it uses `to-front`. It re-evaluates the latest action at each boundary, so cancellation does not queue stale work. The outgoing decoded frame remains visible until the incoming clip can play. A slow download can hold that frame; this avoids a blank flash but is not a claim of uninterrupted motion.

The test profile has eight small local video files. The appearance template is separate from acting rules in `scripts/avatar/template.mjs`. [Generation instructions](AVATAR_GENERATION.md) cover the complete offline preparation/publication workflow and the later model integration. The fixture and Gemini renderers share the same image/video job interface. Publishing a complete offline preview replaces the bundled test profile; a complete generated profile adds the real appearance to the selector.

## Still needed for the intended concept

- Paid image/video access and an agreed spending limit. A free-tier Gemini key is configured locally; no paid generation has run.
- Generate and inspect a natural human avatar, especially its hands, identity and the first/last-frame joins.
- Try ElevenLabs playback with a configured key. Lip synchronization is not implemented.
- Finish the concept independently of Gemini, then connect Gemini to the original media-generation jobs, as Vlad requested. Hydrogen can produce specifications or analyze media but cannot render images/videos. Product inclusion remains the team's decision; runtime narration is optional and deferred.

The live page's replies keep source URLs clickable. The avatar changes presentation only: it does not change research, grounding, approvals, roles or the shared Telegram runtime.

## Validation on 14 November

- Production build, TypeScript and ESLint passed. Build retains the existing fallback-font warning for Chiron Sung HK.
- 230 Vitest tests, 19 Node regressions and 48 Python tests passed; 26 of the Vitest tests cover the new event/scheduler/relay behavior.
- Chromium production preview: a 95-sample walkthrough at 150 ms intervals showed the expected `front → desk → front` chain with one decoded video visible in every sample. This cannot establish sub-frame seam quality or human motion quality.
- Screens checked at 1280 and 390 px; no horizontal overflow at 320, 390, 768 or 1024 px. Reduced motion shows a still, Stop cancels playback events, and a deliberately missing video shows a recoverable message.
- One real rent question through the public server returned 1,227 characters, research/case tool events and a clickable Case link. The upstream assistant repeated several case-reading calls and exposed correction text; that behavior is unchanged by this prototype.
- The local voice endpoint returned its expected unavailable state without falsely animating speech. Actual ElevenLabs playback still requires a configured key.

Preview screenshots were saved locally as `/tmp/avatar-desktop.png`, `/tmp/avatar-mobile.png` and `/tmp/avatar-live.png` (not committed).
