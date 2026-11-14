# Companion proof of concept (issue 65)

Branch: `vlad/avatar-concept`. Route: `/avatar`. This separate product concept tests whether a visible, personalizable companion makes the existing assistant more useful and engaging. It uses the team's existing chat and research service; it does not add another specialist engine or change the shared Telegram bot.

## Show it

The current production-mode preview is at **http://127.0.0.1:3111/avatar**. To serve an already-built checkout on that address:

```sh
DEMO_OPEN=1 pnpm start --port 3111 --hostname 127.0.0.1
```

1. The default **Natural** look is a filmed person at a laptop. Open **Personalize** to select Ari or Noor, change the companion's name, choose everyday support / letters and paperwork / shopping, and set its tone.
2. Select **Try a recorded conversation**. The portrait turns toward its work during recorded searches, returns to the viewer, and enters its speaking state when audio actually plays. Allow about 50 seconds with voice on, or nine seconds with voice off.
3. Ask a live question and then a follow-up. **Start a new conversation** clears the browser's conversation token, including after a reload. **Stop reply and voice** cancels the current client operation and audio.
4. Pause movement, compare the available looks, or open **About this prototype → Movement and event preview** to exercise each state without a model request. Listening is a movement preview; there is no microphone capture.

## Media and playback

The default `studio` profile contains eight edited stock clips, a poster and a manifest, totaling **1,554,293 bytes (about 1.55 MB)**. These are actual licensed frames of an actor, not generated video. Source, permission, editing compromises and reproduction commands are in [AVATAR_STOCK_ASSETS.md](AVATAR_STOCK_ASSETS.md). The actor does not endorse the product; software names and focus choices do not describe his identity or qualifications.

Ari and Noor are original illustrated alternatives, each with eight locally rendered clips. Regenerate them with `node scripts/avatar/make-illustrated-clips.mjs`; the vector rig is in `scripts/avatar/illustrated-scene.mjs`.

All looks share the same pose-based scheduler and two-video player. Actions are reconsidered at clip boundaries, and an incoming frame is decoded before replacing the outgoing image. Pause preserves the current movement; reduced-motion preferences show a still. Failed media displays a retry message while the conversation remains usable. Slow downloads can hold a frame, and matching source endpoints do not guarantee perceptually seamless playback on every device.

The stock front-facing activities reuse attentive footage; they are not distinct scripted performances. Some loops and the turn to the laptop reverse the original motion. The speaking state follows audio playback, including buffering and cancellation, but the lips are not synchronized.

## Conversation and personalization

`/api/avatar/chat` uses the existing local `/api/ukk` handler unless `AVATAR_UPSTREAM` explicitly selects an HTTPS origin. Remote requests use the fixed `/api/aidaddy` path. Normal demo-code and rate limits remain active; `DEMO_OPEN=1` opens the configured demo. Live questions consume the team's existing service credits.

The server validates name, focus and tone, then maps them to bounded presentation instructions while retaining source checks and tool limits. A personalized message can contain up to 1,200 characters. This changes how the existing assistant responds; it does not create professional credentials or a separately trained doctor, lawyer or shopping agent.

Only the designated signed chat-session cookie passes through the relay. It becomes an HttpOnly, SameSite=Lax `avatar_session` cookie scoped to `/api/avatar/chat`, with Secure on HTTPS. Unrelated cookies and authorization tokens never reach the remote service. `DELETE /api/avatar/chat` expires this browser token without calling the backend or deleting its stored history. The normal chat's cookie remains separate.

The visible thread lives in page memory: reloading hides it but retains the server session until reset or cookie expiry. Appearance, name, focus and tone are stored in browser preferences. Live tool events drive the portrait's movements; partial or failed replies remain marked incomplete rather than becoming completed answers.

Live voice uses the local ElevenLabs endpoint when configured. Otherwise, the browser may read replies using an installed voice marked as local; remote browser voices are not selected. Missing device voices or playback failures leave the written answer available. **Read aloud** retries a completed reply. The recorded example always uses its saved MP3.

## Recorded evidence

The example replays the public pregnancy question and Engine events from `src/data/replay.json`, with no new search or model call. Search events are adapted to playback tool labels; they are not a fresh Hermes trace. All **11 evidence entries** retain their original citation numbers, source URLs and quotes, including separate quotes from the same page. Citation markers link to their corresponding sources.

`public/hud/plan.mp3` is the earlier ElevenLabs recording for that same Case. The displayed written plan is not a full transcript of the audio, and this recording does not demonstrate the later custom UKK voice. **Hear recorded plan** permits an explicit playback attempt if automatic audio is blocked. Recorded turns may appear in the visible thread, but they never enter the live server's conversation memory; the page states this when showing the example.

## Validation and remaining decision

As of 15 November, **49 targeted avatar tests, lint, TypeScript and the production build pass**. The build retains the unrelated Chiron Sung HK fallback-font warning. Three actual live turns verified the chosen display name **Mika** and recall of **birch** across requests. Media-only Chromium checks covered all eight stock clips without decode errors; see the asset document for measurements.

The full recorded conversation completed in Chromium: 490 samples at 100 ms intervals, zero blank frames, zero API calls, actual speech followed by idle, and all eight citation markers linked to their original evidence. Sampling is not a guarantee of sub-frame smoothness. Additional browser checks passed for persistent appearance, keyboard focus restoration, reduced motion, a failed stream followed by a successful reply, its retained incomplete-response label, and the completion announcement. Earlier controller checks covered cancellation, mute and failed reset without losing the visible thread.

The final production layout was inspected at 320, 390, 768, 1024, 1440 and 1639 pixels. There was no horizontal overflow. Initial mobile composers fit their tested viewports; active conversations scroll above an in-flow composer without overlap. Captures are local under `.impeccable/review/`. An independent fresh reviewer substituted for the unavailable named skill reviewer and returned **ship** after scoring all five findings resolved across two fix rounds: mobile reachability, citation mapping, face ghosting, completed-reply announcement and placeholder contrast. That verdict covers the scored fixes rather than claiming a whole-product audit. The scoped design documentation preserves the existing team's design rules.

The previous generic chat error came from the team's API rename in PR #64: remote `/api/ukk` returned 404 HTML. Switching the relay to `/api/aidaddy` restored a nonempty HTTP 200 SSE response. No Verda resources or server configuration were changed for that fix.

No new paid media requests were made. Custom generated appearances, purpose-made acting and lip-sync remain unimplemented. Gemini integration is still reserved for the original image/video generation jobs, pending a purchase decision and a bounded media experiment; see [AVATAR_GENERATION.md](AVATAR_GENERATION.md). The team still needs to judge whether this experience merits becoming the product's main feature.
