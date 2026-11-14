# Office performance footage

The office concept uses licensed filmed performances from one shoot by **MART
PRODUCTION**, with the same woman in a beige jacket. It is a stand-in for the
eventual generated character. These files do not demonstrate generated identity,
voice cloning, or lip sync. The performer is not a team member or an endorsement.

The source is [Pexels](https://www.pexels.com/video/a-businesswoman-greeting-and-talking-7643308/),
under the [Pexels License](https://www.pexels.com/license/). The license permits
free use and modification, including in an app; attribution is optional, but is
preserved here and in the manifest. Restrictions include implying endorsement,
offensive depictions of identifiable people, and redistributing stock originals.
This document does not establish separate permission to train an identity model
or impersonate the performer.

## What changed from the studio footage

Every selected take runs **forward at its original speed**. The renderer crops
and downsizes the source, strips audio, and encodes browser MP4s. It does not
reverse, repeat, interpolate, morph, or stretch the performance. Separate shots
are separate camera angles and cannot be presented as seamless pose matches.
Use motivated cuts between activities; never disguise these as generated
transitions.

`public/avatar/office/takes.json` contains already-trimmed MP4s, each starting at
zero. Its `sourceInMs` / `sourceOutMs` refer to the original, so the player can
avoid replaying overlapping source motion. The `provenance` entry repeats those
times as `sourceIn` / `sourceOut` in seconds and records crop and checksums.
Sources are 4096×2160 at 25 fps. Outputs are video-only at the original 25 fps:
1280×720, except `attention-late`, which is 1280×800 to preserve its portrait
framing. The manifest's top-level 1280×720 dimensions describe the poster;
they are not a claim that every take has the same aspect ratio.

| Take | Pexels source | Source interval | Use and limits |
| --- | --- | --- | --- |
| `attention-open` | [7644035](https://www.pexels.com/video/7644035/) | 0–3.40 s | Quiet eye contact and blink. Fixed crop `1600:900:840:600` excludes the other foreground performer. Ends before the original begins to lose focus. |
| `attention-return` | [7644035](https://www.pexels.com/video/7644035/) | 17.40–19.52 s | Distinct quiet eye contact, same crop. Reserved as `kind: handover` for the end of speech. Starts after focus has returned from the excluded performer. |
| `work-wide` | [7643474](https://www.pexels.com/video/7643474/) | 0–7.32 s | Woman alone at the table using a tablet; useful establishing shot. |
| `work-detail` | [7644018](https://www.pexels.com/video/woman-working-using-her-digital-tablet-7644018/) | 0–19.56 s | Tablet, notebook and hands. The source intentionally crops off the upper face. |
| `attention-late` | [7643844](https://www.pexels.com/video/7643844/) | 16–19.20 s | Off-axis listening with a gradual closer framing. Moving crop `2100:1312:166+86*t:200`, where `t` is seconds since the selected interval begins, excludes the nearby coworker. Output 1280×800. A separate reaction angle, not a seamless match to the frontal takes. |

The two work sources use crop `3840:2160:128:0`, then downscale. Both attention
sources contain another person in their originals; only their inspected crops
and intervals are included. No other person was visible in the inspected output
crops. The work takes were reviewed at quarter-second intervals, the frontal
attention takes at fifth-second intervals, and all 80 frames of the final
`attention-late` crop were reviewed. Its hair, face and chin stay within the
frame. These checks apply to the selected outputs, not to the uncropped originals
or arbitrary later trims. The source has camera and focus movements; it is not a
locked virtual camera.

The earlier standing `presence-window` and `presence-turn` takes were removed:
cutting from a seated conversation to a person already standing by the window
made the character appear to teleport. This pool now contains only seated takes.

Total distinct quiet footage: **35.60 seconds**. A finite performance pool can
be exhausted. Repeating it under a different filename is still repeating; the
player should hold a neutral frame or end that interaction rather than silently
restart the pool. These are not an unlimited live avatar.

## Published speaking performances

[A Businesswoman Greeting and Talking, 7643308](https://www.pexels.com/video/a-businesswoman-greeting-and-talking-7643308/)
is a 39.04-second forward performance by the same woman, alone at the table,
with a greeting, visible speech, varied hands and head movements. Its SHA-256 is
`e114e8a3da63c21ca3dd24ea2fd3912c2bfd44c4ecd1410b94df57ef93aa8350`.
The downloaded original has no audio stream. Three nonoverlapping sections are
now published in `public/avatar/office/answers/`, with transcripts and provenance
in `public/avatar/office/performances.json`:

| Scene | Original source interval | Prepared video | Gemini speech |
| --- | --- | --- | --- |
| `pregnancy` | 0–16.56 s | 16.56 s | 16.28 s |
| `clinic` | 16.56–26.20 s | 9.64 s | 9.36 s |
| `employer` | 26.20–39.04 s | 12.84 s | 12.52 s |

These are **dubbed filmed performances**: original forward motion at 25 fps,
scaled to 1280×676, with no model changes to the actor's face or body. Gemini
`gemini-3.8-flash-tts`, voice Kore, generated 38.16 seconds of authored speech
through the configured free-tier account. Short silence tails complete the
39.04-second video timeline. Each MP4 embeds its soundtrack, so playback, pause
and mute use one media clock. Playback makes no TTS request. The new words
**do not match the filmed mouth movements**; `quality: reviewed` refers to
inspection of the original filmed visuals, not verified lip synchronization.

The local MuseTalk/TAESD experiments were completed and rejected for public use.
A three-second mouth-only blend preserved the jaw and neck better than the
broader lower-face blend, but a flat dark mouth and unstable teeth remained
visible at the 915-pixel-wide preview size. Retaining original pixels during the
hand's passage across the mouth worked. This was a visual frame review, not a
sound-and-picture alignment assessment. The original human expressions were
more convincing, so no full Muse performance was rendered or substituted for
these published takes. Experiment details are in
[AVATAR_PERFORMANCE_RESEARCH.md](AVATAR_PERFORMANCE_RESEARCH.md).

Original download:
`https://videos.pexels.com/video-files/7643308/7643308-uhd_4096_2160_25fps.mp4`

## Reproduce and inspect

```sh
node scripts/avatar/make-office-takes.mjs --download
# Or use previously downloaded originals named <Pexels ID>.mp4:
node scripts/avatar/make-office-takes.mjs --source-dir /path/to/originals
```

The quiet-take script uses only public free downloads. Original files are checked against their
SHA-256 values before any rendering. The script writes assets and `takes.json`
to `public/avatar/office`; the source cache and timestamped one-frame-per-second
review sheets stay in `.data/avatar-office-originals` and
`.data/avatar-office-review`. Each output is probed for its duration, original
25 fps rate, and lack of audio. The output manifest records output checksums.

The separate `scripts/avatar/make-performance-media.mjs` prepares the verified
speaking source and exports the three answers with already saved WAV files.
Its `--dubbed` export requires the unchanged prepared video and matching
preparation provenance. It records source intervals, speech model and voice,
speech and silence durations, transcripts, citations and input/output hashes.
This offline exporter makes no provider request; the quiet-take script does not
regenerate or overwrite the speaking answers.

| Original | SHA-256 |
| --- | --- |
| 7643844 | `6808cf99416e4f294ff6d1857d3068a48954688912a330fc45759436e67e5f98` |
| 7644018 | `5e0810f74a6325b1761f4aeb091880f5475f413269b51431d51a2aaf31978937` |
| 7643474 | `efd645cb0f6b9626b04e96b260fae84b6003bf7d727010ab666ccd05ab9eaf65` |
| 7644035 | `9f469f64383fef360825247785c2046bc822e73e0318baaedbaf90e46e1e222d` |

Other inspected candidates were rejected: Theo Decker 5940726 has good direct
speech but only ten seconds; its working companion 5944681 brings a colleague
into the background. MART 7643836 and 7643839 feature different performers.
MART 7644027, 7643602, 7643454 and 7643310 include coworkers. Only the reviewed
16–19.20-second crop of 7643844 was accepted; its earlier material and the wider
frame remain unsuitable. The 39-second 9198478 performance is shot in profile toward a laptop rather than
addressing the viewer. None of those rejected takes is in the office manifest.

The neutral poster now comes from the speaking source 7643308 at 9.00 seconds, cropped `3840:2160:128:0` and scaled to 1280×720. This keeps the initial person, desk and blinds consistent with the speaking takes. The quiet-take preparation script verifies this fifth original too; the JPEG comment records its origin. It is a still, not an idle animation.
