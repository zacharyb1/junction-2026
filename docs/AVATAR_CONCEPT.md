# Companion proof of concept (issue 65)

Branch: `vlad/avatar-concept`. Route: `/avatar`. This isolated concept tests a visible, personalizable companion on top of the team's existing chat and research service. Zachary's shared UI and the shared Telegram runtime are unchanged.

## Show it

Local preview address: **http://127.0.0.1:3111/avatar**. To serve an already-built checkout with the team's remote chat service:

```sh
DEMO_OPEN=1 AVATAR_UPSTREAM=https://86.38.238.136.sslip.io pnpm start --port 3111 --hostname 127.0.0.1
```

1. Start with the **Desk** look, a filmed companion named Alex by default. **Personalize** also offers the illustrated Ari and Noor profiles, plus name, focus and tone settings.
2. Select **Try a prepared conversation**. The saved pregnancy example takes about 26 seconds: roughly nine seconds of recorded research, then a 17.1-second ElevenLabs answer while the person talks with his hands. Voice off mutes the answer; the picture still talks for its length.
3. Choose **Start with the clinic** or **What about my employer?**. Each opens its saved source passage and plays its own spoken answer, about 10.9 or 12.2 seconds. These actions do not stage a new search.
4. Pause or resume picture and voice together, turn the voice off, stop the answer, or submit a new live message while it is speaking. A new message interrupts the previous turn; completed text and citations remain available. **Replay prepared answer** deliberately replays a selected answer.
5. **Start a new conversation** clears this browser's chat-session token. There is no microphone capture. Movement previews remain available for the illustrated profiles under **About this prototype → Movement and event preview**; Desk shows its event log there.

## Current media and playback

Desk is one locked-off stock clip (Pexels video 5941016), scaled to 1280×720 without cropping and cut into seven short silent segments: five listening segments (two of them slowed to half speed; each plays out and back to return to its pose) and two speaking segments, which are never played backwards. Every segment starts and ends in one of three resting poses, so the background never changes and joins are 240 ms opacity crossfades. The player prefers a next segment that starts in the pose the previous one ended in; such a join is not visible. A change between poses shows as a short dissolve, with a brief double image of the head and hands. Idle is never a still: listening segments chain in a non-repeating random order. While a voice plays, a chain of speaking segments sized to the audio (playback rate 0.9–1.1) plays and returns to listening as the voice ends.

The three prepared answers are separate ElevenLabs recordings (voice **Bill**, `eleven_flash_v2_5`); live replies are read aloud through `/api/aidaddy/speak` in the voice set by the server's `ELEVENLABS_VOICE_ID` (Bill in the team's setup). **The performer's lips are not synchronised to the words**, and he did not say them. There are only about 16.5 seconds of unique footage, so long answers repeat or reverse the same gestures.

Source intervals, hubs, measurements and reproduction commands are in [AVATAR_DESK_ASSETS.md](AVATAR_DESK_ASSETS.md). The performer is a licensed visual stand-in, with no association or endorsement. The earlier Office footage and the cyclic `studio` footage are no longer selectable looks; [AVATAR_STOCK_ASSETS.md](AVATAR_STOCK_ASSETS.md) and git history preserve them. Ari and Noor retain their illustrated pose-based player and locally rendered clips.

Local MuseTalk/TAESD probes were rejected for these public scenes. A three-second mouth-only blend improved the jaw and neck compared with the lower-face blend, but a dark flat mouth and unstable teeth remained visible at the 915-pixel-wide preview size. Preserving the original pixels during the hand's passage across the mouth worked. This was a frame-based visual review, not an audio-alignment test. The original filmed expressions were more convincing, so the published scenes retain them; no full Muse performance was rendered. See [AVATAR_PERFORMANCE_RESEARCH.md](AVATAR_PERFORMANCE_RESEARCH.md) and the [performance direction](AVATAR_PERFORMANCE_DIRECTION.md), which separates the implemented repertoire from the remaining choreography and generation goals.

## Conversation and personalization

`/api/avatar/chat` uses the local `/api/aidaddy` handler unless `AVATAR_UPSTREAM` selects an HTTPS origin; remote requests use the fixed `/api/aidaddy` path. Normal demo-code and rate limits remain active. `DEMO_OPEN=1` opens the configured demo. Live questions consume the existing service's credits; prepared scenes require no new search, TTS or model call during playback.

The server validates name, focus and tone, then maps them to bounded presentation instructions while preserving research checks and tool limits. Messages may contain up to 1,200 characters. These settings affect new live requests; they do not generate another room, change the prepared script, create professional credentials or train a specialist. Changing the appearance cancels the current playback and request.

Only the designated signed chat-session cookie passes through the relay. It becomes an HttpOnly, SameSite=Lax `avatar_session` cookie scoped to `/api/avatar/chat`, with Secure on HTTPS. Unrelated cookies and authorization tokens are excluded. `DELETE /api/avatar/chat` expires this browser token without calling the backend or deleting its stored history. The normal chat's cookie remains separate.

The visible thread lives in page memory: reloading hides it but retains the server session until reset or expiry. Preferences persist in the browser. Partial and failed replies stay marked incomplete. Prepared turns appear in the visible thread but never enter live server memory, and the interface explains that separation.

Live voice uses the local ElevenLabs endpoint when configured, otherwise an installed browser voice marked as local. Missing voices or media errors leave the text available. Live replies do not have matching talking videos. A free-text question never silently selects a prepared answer.

## Saved evidence

The main scene replays the public pregnancy question and Engine events from `src/data/avatar-recorded-run.json` (the run the front page showed until main replaced `src/data/replay.json`), recorded **14 November 2026**. Its search events are recorded playback, not a fresh Hermes trace. All **11 evidence entries** retain their original numbers, URLs and quotations, including distinct quotations from the same page. Citation markers link to their corresponding sources.

The clinic follow-up opens saved InfoFinland citation **[1]**. The employer follow-up opens saved Kela citation **[3]**. The short spoken summaries are authored in `src/data/avatar-performance-dialogue.json`, and their transcripts accompany the prepared performances. They do not replace the full written plan or establish a new verification of the sources. The earlier `public/hud/plan.mp3` recording remains a legacy asset; the three current scenes use their own Gemini speech.

## Validation and limits

On 15 November, the full Vitest suite passed: **263 tests in 25 files**, including **59 targeted avatar tests**. Full ESLint, TypeScript and the final production build passed. The build retains the unrelated Chiron Sung HK fallback-font warning. Controller regressions cover cancellation, replacement, delayed events, an outgoing video's error during speech preload, and a stalled resume. These mocked-media checks do not replace browser playback tests.

Chromium checks at widths **1440, 1024, 768, 390 and 320** passed the controls, network-failure fallback and reduced-motion checks. Desktop playback confirmed a stable playhead during pause, resume, mute, replacement by the clinic scene, and cancellation of the old voice. Prepared playback made zero API requests. The adopted mobile-height adjustment was rechecked at **320 and 390** with real reply text: prose remained visible, controls did not overlap, and deliberate scrolling to older messages was preserved. These browser checks establish media and interface state, not audible voice quality or lip alignment.

Earlier live checks established the selected display name and follow-up memory, and the remote relay fix restored a nonempty HTTP 200 SSE response after PR #64 moved the chat endpoint to `/api/aidaddy`. The previous UI revision was inspected at six viewport widths and its old recorded walkthrough completed without sampled blank frames. Those are historical results, not a validation of the new office media or its transitions.

No paid generation or cloud-resource purchase was used for these assets. Generated identities, role-specific cabinets, open-ended synchronized speech and natural transitions over an unlimited conversation remain unfinished. The team still needs to judge whether the prepared experience supports making the avatar central to the project.
