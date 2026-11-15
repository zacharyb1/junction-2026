# Avatar desk assets

The `/avatar` concept page plays `public/avatar/desk/`: short silent video segments of one filmed man at a desk, plus three pre-rendered spoken answers. `public/avatar/desk/presence.json` lists them. `scripts/avatar/make-desk-presence.mjs` re-creates every segment, the poster and the manifest from the cut list in `scripts/avatar/desk-cuts.json`.

This is stock footage with a synthetic voice. The man is not a team member, never said these words, and his lips are not synchronised to the audio.

## Source and licence

- Pexels video 5941016 ("Casual businessman looking at camera and talking"), <https://www.pexels.com/video/5941016/>. The UHD file is `5941016-uhd_3840_2160_25fps.mp4`: 3840x2160, 25 fps, 413 frames (16.52 s), SHA-256 `ed0e477d088c9be3c8bea45a20f147a93de5bbdb6f1b03609f300e000405a6ff`.
- Creator: not recorded. The Pexels page is behind a bot check and answered 403 on 15 November 2026, so the manifest says "Pexels contributor (see source page)". Fill in the name from the page.
- Pexels licence, in plain words: free to use and edit, including commercially, and no credit is required. You may not sell the clip unaltered, suggest the person in it endorses you, or use it in a way that misrepresents them. See <https://www.pexels.com/license/>.

## Crop and encoding

The whole frame is used (crop 3840x2160 at 0,0), scaled to 1280x720. No smaller crop keeps both things the shot needs. His hair reaches about 100 px from the top of the 4K frame and the desk edge is about 2030 px down, so a 16:9 window has to be at least about 3600x2030. The proposed 3200x1800 window would cut off either his hair or the desk. In the widest gesture (about 9-10 s) his hands stay inside the frame.

Encoding: H.264, yuv420p, CRF 20, 25 fps, keyframe every second, no audio track, `+faststart`, BT.709 tags. Every file starts on a keyframe. Cuts are frame-exact: the script decodes and re-encodes, and never stream-copies.

Camera stillness, measured on the background with ORB features over all 16.52 s at 6 samples per second (`.data/avatar-v2/tools/camera_motion.py`): maximum drift 0.08 px, 95th percentile 0.03 px, scale drift 0.013 %, rotation drift 0.007°, normalised to a 1000-px-wide frame. The camera is locked off, and the background is the same in every segment.

Background: there is no person or moving object in the corridor. The largest frame-to-frame change outside the man is 4.5 grey levels on a 16x16 block, and that block is his own head moving at 15.9 s. Behind the frosted glass on the left a blurred dark shape drifts slowly, by at most 0.8 grey levels (mean) over the whole clip. It cannot be seen at normal viewing.

## Hubs and segments

Every segment starts and ends on one of three hub frames. Each hub is a moment when his hands are together on the desk and he looks into the camera. The source has no single rest pose that comes back exactly: he sways about 100 px (at 1280 wide) from side to side throughout. The hubs are therefore the three quiet moments that are closest to one another:

| Hub | Source time | Pose |
| --- | --- | --- |
| 100 | 4.00 s | fingers interlaced at chest height, broad smile, head right of centre |
| 181 | 7.24 s | hands clasped, lips slightly apart, head right of centre |
| 396 | 15.84 s | hands clasped low, lips slightly apart, head furthest right |

Frames are 0-based. A part written `a→b` runs from frame a to frame b inclusive; a part with a > b plays backwards. Durations are measured from the encoded files.

| Segment | Kind | Frames | Duration | Speed | What happens |
| --- | --- | --- | --- | --- | --- |
| listen-a | listen | 100→56, 57→100 | 3560 ms | 1 | Smiling, not speaking; his head sways to his right and back. |
| listen-b | listen | 181→148, 149→181 | 2680 ms | 1 | Settles into steepled fingers and lifts them again, smiling. |
| listen-c | listen | 396→412, 411→396 | 1320 ms | 1 | Hands clasped low, nearly still (the last 0.7 s of the source). His lips are slightly apart and move a little, which may read as the end of a word. |
| listen-b-slow | listen | as listen-b | 5360 ms | 0.5 | listen-b at half speed, with the in-between frames interpolated. |
| listen-c-slow | listen | as listen-c | 2640 ms | 0.5 | listen-c at half speed, with the in-between frames interpolated. |
| talk-a | talk | 100→181 | 3280 ms | 1 | Says one short phrase with both hands opening (source 4.4-5.5 s), then pauses smiling with steepled fingers. |
| talk-b | talk | 181→396 | 8640 ms | 1 | About 7.5 s of continuous talking with wide two-handed gestures, ending as his hands come back together. |

In `presence.json`, `sourceInMs`/`sourceOutMs` give the span of the source that a segment uses. For a segment played out and back, or backwards, `durationMs` is not `sourceOutMs - sourceInMs`. `desk-cuts.json` records the exact parts.

Footage that was left out, and why:

- 0-1.9 s: it opens mid-gesture, and no frame in it is close to any hub (pose distance 10 or more).
- 1.9-2.2 s (hands steepled, head centred): too far from the hubs to start or end a segment, so it appears only inside listen-a, as the turning point.
- 8.2 s and 12.5 s: the only pauses inside the long talking stretch. At 8.2 s one hand is still raised. At 12.5 s his hands meet, but that frame is 6.8-8.4 away from the hubs, so splitting talk-b there would add worse joins than the ones that exist now. talk-b is therefore kept whole.

The slowed variants were made with ffmpeg `minterpolate` (`mi_mode=mci`). Interpolated frames inspected at 1:1 showed no warping in the hands, glasses or face. listen-a was not slowed: its head sway is the largest motion among the listen segments.

## Join evidence

The pose descriptor is a blurred 96x94 grey thumbnail of the person region (x 300-1000, y 20-700 at 1280x720). Distance is the mean absolute difference in grey levels.

| Comparison | Distance |
| --- | --- |
| Two random frames more than 1 s apart | median 11.10 (10th percentile 8.41, 90th percentile 14.12) |
| Consecutive frames (natural motion in 40 ms) | median 0.87 (90th percentile 2.43) |
| Hub 100 to hub 181 | 6.73 |
| Hub 100 to hub 396 | 6.83 |
| Hub 181 to hub 396 | 6.62 |

Measured on the encoded files, 35 % of the 81 possible ordered joins end and start on the same hub. Those joins measure 0.4-1.1, which is encoder noise, so they are seamless. The other joins measure 6.6-6.9.

A join between two different hubs shows a visible double image halfway through the 240 ms crossfade: his head shifts by about 20 px and his hands move. It reads as a soft dissolve, not as natural movement. The hubs connect: talk-a and talk-a-rev link hubs 100 and 181, and talk-b and talk-b-rev link hubs 181 and 396. Each segment in `presence.json` names its `startHub` and `endHub`, and the player uses them: a talk plan is a chain in which every segment starts on the hub the previous one ended on (only its first segment may start elsewhere, because that join interrupts a listen segment anyway), the listen segment after a talk starts on the hub the talk ended on, and while idle it stays on its hub with probability 0.7 (`LEAVE_HUB` in `src/lib/avatar/presence.ts`). listen-a is the only listen segment on hub 100, so idle always leaves that hub with a dissolve. The cost is variety: idling on hub 181 or 396 alternates the normal and slow versions of one movement.

Analysis scripts are in `.data/avatar-v2/tools` (`desk_analyse.py`, `desk_cuts.py`, `desk_match.py`, `desk_hubs.py`, `desk_verify.py`, `desk_background.py`). They are not committed.

## Speech

`public/avatar/desk/speech/{pregnancy,clinic,employer}.mp3` hold the three `speech` texts from `src/data/avatar-performance-dialogue.json`, 588 characters in all. They were rendered on 15 November 2026 with ElevenLabs text-to-speech: one request per scene, with the same model (`eleven_flash_v2_5`) and output format (`mp3_44100_128`) as `src/lib/speech.ts` and default voice settings. The voice is the ElevenLabs premade voice "Bill", the voice set in the team's `ELEVENLABS_VOICE_ID`. No key or ID is stored in the repository.

Measured durations: pregnancy 17 090 ms, clinic 10 913 ms, employer 12 214 ms.

An offline check with whisper-tiny recognised every word. The only differences were spellings (Kela heard as "Kayla"/"Kaila", "centre" as "center", "InfoFinland" as "Info Finland") and "leave" heard as "leaves" in the employer answer. This is automatic recognition only. Nobody has listened to the audio, and the pronunciation of "Kela" has not been checked.

## Limits

- There are only 16.5 s of unique footage, and about 6 s of it is quiet. Speech segments are never played backwards, so long answers repeat the same gestures with a dissolve between them.
- There is no footage of desk work, typing or looking away. He always faces the camera.
- His lips are not synchronised to the voice. talk-a contains about 1.7 s of smiling silence.
- In the hub poses his lips are slightly apart or he is smiling broadly. They are not a neutral closed mouth.
