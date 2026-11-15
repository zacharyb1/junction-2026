# Avatar performance direction

Direction and implementation status, 15 November 2026. The target follows the user's priorities: an unrepeated performance, visible conversation, and one person in their own cabinet. The current proof of concept implements only part of that target; the proposed choreography and acceptance targets below are not completed features.

## Implemented now

Superseded on 15 November 2026: the default profile is now **Desk**, one locked-off stock clip cut into listening and speaking segments that start and end in shared resting poses, with a separate ElevenLabs voice (Bill). [AVATAR_DESK_ASSETS.md](AVATAR_DESK_ASSETS.md) records its cuts and provenance. The Office footage described in the rest of this document (Gemini Kore soundtracks embedded in filmed takes) has been removed from the repository; git history keeps it.

The prepared conversation concerns pregnancy in Finland, with separate clinic and employer follow-ups. They show saved source passages and their own transcripts. Pause, mute, explicit replay, Stop and replacement by a new live message are implemented. Quiet source intervals are not automatically reused within a mounted profile; exhaustion holds a suitable frame or the neutral poster. The conversation remains usable if media fails. Browser checks cover desktop and mobile controls, media state and the adopted mobile layout; they do not establish audible voice quality or lip alignment. See [AVATAR_CONCEPT.md](AVATAR_CONCEPT.md) for completed and historical checks.

Local MuseTalk/TAESD probes were rejected for the public scenes. Restricting the blend to the mouth improved the jaw and neck boundary, and preserved source pixels handled the opening hand occlusion, but a dark flat mouth and unstable teeth were still visible. This was a frame-based visual comparison, not a test establishing audio alignment. The published scenes retain the original human face; no full Muse render is planned for this revision.

Still proposed: script-specific gestures, natural edited continuity, phrase-timed source/caption cues, marked safe exits, generated identities and cabinets, and matching speech for arbitrary live answers. The current code does not claim a general performance director that solves these problems.

## Decision

Build a **short, interactive performance with a finite repertoire**, starting with one excellent prepared conversation. The unit of content is a conversational scene with a script, body performance, audio and meaningful exits. A generic three-second “speaking” loop cannot carry an arbitrary forty-second answer.

Keep the decoded-frame handover approach used by the current `PerformanceStage`. Its finite-take history and request cancellation form a starting point for a more expressive director. The stock `studio` assets have been removed from the selectable profiles: their short forward/reverse extracts contained coworkers and no corresponding speech. Do not call naturalness solved because a frame boundary is technically continuous.

The current demonstration contains one prepared situation and two follow-ups. A second situation can be added after the first meets the visual-quality target. Open-ended live chat remains a separate mode with truthful limitations. Do not silently match a live question to a canned spoken answer or present recorded tool events as live work.

## Target: what a convincing turn looks like

1. **Invitation.** The avatar is already present in a long, quiet take: breathing, one comfortable adjustment, occasional gaze away and back. There is no recurring “idle gesture” every few seconds. The opening is performed once per visit.
2. **Attention.** Focusing or typing into the composer asks for attention; submitting commits the turn. A short prepared acknowledgment belongs to the selected scene. Do not show microphone listening when the interface only accepts text. Avoid a repeated nod on every keystroke.
3. **Work.** A real search event can motivate looking at the desk. The turn back starts after work actually completes. Slow work extends an unused work take; it does not restart the same turn-to-desk motion. Recorded scenes use their recorded timeline and retain their recorded label.
4. **Answer.** Play an authored answer once. The voice and visible speech use one media clock. A small hand gesture emphasizes a particular phrase; looking toward a source coincides with showing that source. A pause means something in the sentence. Do not add independent random gestures over speech.
5. **Handover.** Finish the sentence, settle naturally and offer a specific next action. The avatar waits for the user's choice. A new question can interrupt; the system never waits for a whole answer video to finish before accepting it.

The speaker should mostly address the viewer during the answer. They can glance at notes and the laptop without pretending every word is being typed. Use a relaxed medium shot that shows face, shoulders and hands. Keep one outfit, desk arrangement, light direction and background per profile. No people, moving silhouettes, reflections of people, or background television.

## Proposed asset grammar: continuity without compulsory resets

Requiring every clip to return to one identical front-facing frame makes every action a visible cycle. Use natural rest windows, a few transition takes and deliberate edits instead.

| Material | Required performance | Joining rule |
| --- | --- | --- |
| Presence | A long forward-only take with restrained, irregular movement | Do not reuse its source-time interval within a visit's demonstration window |
| Attention | Acknowledge, become attentive, then settle | Enter only from a compatible gaze/body state or through a prepared edit |
| Work | Turn to desk; sustained work; return | Each turn is one-shot; extend sustained work without repeating the turn |
| Answer | Script-specific speech and gestures | Audio and picture belong to the same performance; no generic mouth loop |
| Follow-up | A distinct reaction and a short relevant answer | Start from the preceding handover, not the beginning of the main answer |
| Interrupted | Stop speaking, attend to the new turn | Cut at a marked safe point; cancel old audio and future cues immediately |

A compatible boundary includes camera framing, gaze, head/torso orientation, hand and prop positions, and direction/speed of motion. An equal endpoint image alone is insufficient. Mark several hundred milliseconds of quiet rest around a boundary, not a single nominal pose. Validate transitions by watching them at normal speed.

Use two editorial escape routes:

- A purposeful cut from a medium shot to a closer shot can begin a new sentence or handover. The actor remains the same person in the same room; a slight digital zoom of incompatible body positions does not make them continuous.
- A source card or document can temporarily become the main image while the voice continues. Cut back at the next sentence to a compatible rest state. This is useful when the avatar directs the user's attention to evidence; it must not cover every gesture seam.

Do not dissolve two faces, reverse blinks or breathing, randomly vary video speed, or flip the actor horizontally. Do not promise endless natural presence from a finite library. Size the unique presence/work material to the actual demonstration window, and test the whole window.

## Future implementation seam

The current implementation uses `PerformanceStage`, `PerformanceHistory`, prepared-scene metadata and the conversation hook. Together they own finite take selection, consumed source intervals, request identity and interruption. They do not yet encode compatible gaze/body boundaries, source/caption cues or safe visual exit markers. A future `PerformanceDirector` could add those responsibilities without owning chat transport, source verification or the persona prompt. The illustrated profiles retain their existing activity scheduler.

An authored scene could contain these fields. This is a future contract sketch, not the current TypeScript interface or a request for a generalized animation engine:

```ts
type PerformanceScene = {
  id: string;
  mode: "recorded" | "live";
  question: string;
  evidenceRef?: string; // committed case/replay, not only an inaccessible case ID
  acknowledgment?: Take;
  work: Take[];
  answer?: Take;        // prepared answer permitted only in recorded mode
  followUps: { label: string; sceneId: string }[];
};

type Take = {
  id: string;
  src: string;
  sourcePerformance: string;
  sourceInMs: number;
  sourceOutMs: number;
  kind: "presence" | "attention" | "work" | "answer" | "handover";
  entry: string;        // named state including shot/gaze/hands, reviewed in video
  exit: string;
  audio: "embedded" | "silent";
  transcript?: string;
  interruptAtMs: number[];
  cues: { atMs: number; type: "source" | "caption" | "choice"; ref: string }[];
  next: "wait" | "work" | "handover";
};
```

Choose the next take from **intent and continuity first**. Among compatible takes, choose an unused source interval. Randomness is optional and last. A clip ending must never, by itself, restart an answer or cause a greeting to repeat. Retain the already decoded outgoing frame until the next take is ready, as the existing player does.

Prepared speaking videos already contain their final soundtrack, so video and audio pause or buffer together. This clock does not itself align filmed lips or gestures with the new words. The current transcript is displayed as text, not as phrase-timed captions; source passages open when a follow-up is selected, not on timed speech cues. The old `plan.mp3` is no longer the prepared scene's soundtrack. Future cues should use the exact saved speech and reviewed phrase times.

For interruption, stop audio and cancel future source/caption cues immediately; then take the next marked safe visual exit or a deliberate cut. Accept the new submission while the previous answer is speaking. A monotonically increasing turn token must prevent a cancelled stream, media-ready callback or ended event from reviving the old turn. The current hook already aborts streams and audio; reuse that cancellation boundary.

Keep the last complete answer and citations available after interruption. A choice such as “Show the official source” should open the referenced evidence immediately; the body reaction supports that action rather than delaying it. If media fails, keep the functioning conversation and its explicit media status.

## Current scenes and possible expansion

These are recorded demonstrations of stored findings, not a fresh legal or medical verification. Their recording dates must remain available. Never use the verified-count catalogue as a substitute for the underlying evidence.

| Scene | Evidence and published performance | Implemented interaction | Remaining quality target |
| --- | --- | --- | --- |
| Expecting a baby; both parents work | `src/data/avatar-recorded-run.json`: result `IRZUhuWnAtPEZVHw`, recorded 14 Nov 2026; four steps, 11 quotations. A 16.56-second filmed take carries a newly authored Gemini summary. | Recorded research playback, written plan and citations, prepared transcript, interrupt, pause, mute, replay and two explicit follow-up choices. | Matched lips and meaningful script-specific gestures; phrase-timed cues and reviewed edit continuity. |
| Start with the clinic | Saved InfoFinland citation [1]. A separate 9.64-second take carries its own Gemini answer. | Opens the exact saved passage immediately and offers its source link; no new search is staged. | Matched speech and a visually compatible transition from the main scene. |
| What about my employer? | Saved Kela citation [3] from `during-pregnancy`. A separate 12.84-second take carries its own Gemini answer. | Opens the saved notice-period quotation and source link; explicit replay uses this answer rather than restarting the main one. | Matched speech, a gesture appropriate to the explanation and a natural handover. |

The exact three authored scripts are in `src/data/avatar-performance-dialogue.json`; the Desk speech files, transcripts and provenance are in `public/avatar/desk/presence.json`. The original `public/hud/plan.mp3` remains a legacy recording and does not supply these soundtracks.

Moving from Helsinki to Tampere remains a possible second situation, not an implemented scene. `src/data/autopilot-check.json`, recorded 14 Nov 2026, contains KKV lease-termination, InfoFinland notice-period and LUVN change-of-address excerpts. It still needs a reviewed script, soundtrack, acting and scene timeline. That fixture alone does not establish a new legal conclusion or a captured conversational tool trace.

The rent-increase and cancelled-flight entries in `example-cases.json` contain case IDs and counts, not their complete supporting cases. They are not ready-made offline scenes. Recover and review their full case records before using them in an authored performance.

Prepared scene selection should be visible and deliberate. Free text still belongs to live conversation; no hidden keyword switch should substitute a staged answer. A user can compare a prepared performance with a live answer, but the interface must distinguish them.

## Completion gate

These are proposed acceptance targets, not measurements already achieved. In particular, the current dubbed scenes do not meet the exact-speech requirement; completing browser control checks does not establish natural acting or matching lips:

- Watch the full three-minute intended presentation, including time spent typing and reading sources. No reversed motion, reused recognizable gesture, repeated source interval or automatic answer restart. A reviewer must also inspect the video, not only a no-repeat counter.
- During the prepared answer, the face visibly speaks the exact soundtrack with plausible pauses and expression. No voice continues over a closed, attentive mouth. Review phrase starts, stops and one interruption at normal playback speed with audio enabled.
- No background people in any frame; stable actor identity, clothing, hands, props, room and lighting. Reject a take with a prominent physical defect even if the technical decoder tests pass.
- Composer focus, submit and source selection produce immediate interface feedback; the first prepared physical reaction begins within 400 ms when preloaded. Audio stops within 100 ms of Stop; a safe visual interruption follows within 700 ms. Measure these targets on the actual demo device.
- A late live response, blocked autoplay, stalled media, muted audio and an interruption during a tool request must not produce false speaking, revive an old turn, or lose the evidence. Pause and reduced-motion remain usable.
- A fresh viewer can identify when the avatar is addressing them, when it is working and when it is waiting for their choice, without reading a debug status. Ask them where they first noticed repetition and inspect that moment.

## Current compromise and the next quality step

Choose assets before claiming the architecture fixes naturalness. The best controllable source is one deliberately filmed or generated actor performing the actual script in an empty cabinet, with compatible rest takes. A consenting teammate recording that script is a valid proof of the playback/interaction architecture; it does not demonstrate automatic avatar generation. Creating the footage requires the person's participation and suitable recording conditions.

The current build has visible filmed speech, distinct answers and working evidence interactions, but dubbing does **not** satisfy the exact-speech target. Preserve that limitation in the prototype's description. The rejected model probes should not replace more convincing original expressions merely to claim lip sync. Before expanding the library or making the avatar central to the project, prove one complete answer with matching speech and intentional gestures, its interruption and one follow-up. Directly recorded or purpose-made generated acting remains the next quality step; final browser checks alone cannot establish naturalness.
