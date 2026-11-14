# Filmed avatar stand-in

The `studio` profile uses edited, licensed footage of an actor. It is a visual stand-in for the concept's eventual generated clip set. It is **not** a generated person, a live camera feed, custom acting, or synchronized speech. The people pictured do not endorse this project. Names, assistant roles and voice settings in the interface describe the software persona, not the actor's identity or qualifications.

## Source and permission

- Creator: **Edmond Dantès**.
- Source: [Man Using a Laptop Looking at the Camera, Pexels video 8643569](https://www.pexels.com/video/man-using-a-laptop-looking-at-the-camera-8643569/).
- Download: [Pexels-hosted 4K MP4](https://videos.pexels.com/video-files/8643569/8643569-uhd_3840_2160_24fps.mp4), 13,202,262 bytes, 24 fps.
- Original SHA-256: `dcfb8c00651e890e0812aa5d17668a72db44cb2fe7d4f831615586c90e743ea2`.
- [Pexels License](https://www.pexels.com/license/), checked 2026-11-14. It permits free use and modification, including websites and apps. Credit is optional; we retain it to make provenance clear. It prohibits implying endorsement, offensive portrayals of identifiable people, unaltered resale, stock-platform redistribution and use as a trademark. This source is not labelled editorial-only and has no watermark.

Suggested credit: “Filmed portrait: Edmond Dantès / Pexels. Edited stock footage; people shown do not endorse this product.” Keep the Pexels source and license links with the concept's media information. Do not present the actor as a doctor, lawyer, team member or satisfied customer.

## Reproduce

Requires the existing Node/Next installation, `sharp` (already supplied with Next), and `ffmpeg`. No provider key, paid call or package installation is needed.

```sh
node scripts/avatar/make-stock-clips.mjs --source /path/to/pexels-8643569.mp4
# Alternatively, explicitly fetch the documented free source into ignored .data/avatar-media/:
node scripts/avatar/make-stock-clips.mjs --download
```

Running without arguments only prints usage. The original is not committed; the script stores a downloaded original under the repository's already-ignored `.data/` directory. Rendered clips and their manifest live in `public/avatar/studio/`.

Every regenerated poster embeds a JPEG COM provenance comment (`impeccable:prompt`) naming the source frame, creator, source and license URLs, editing script and original SHA-256. This preserves origin information inside the asset as well as in the manifest. The comment does not label the stock photograph as generated imagery.

The fixed 3136×1960 crop at (0,80) reduces the office background while retaining the actor, hands and laptop. Output is 1152×720, 24 fps, H.264/yuv420p, with audio removed and MP4 fast-start enabled. The two canonical poses are source frame 36 (1.5 seconds, laptop) and frame 108 (4.5 seconds, viewer).

| Clip | Source time | Output duration | Treatment |
| --- | --- | --- | --- |
| idle | 4.5→5→4.5 s | 2 s | Small attentive movement, forward/reverse |
| listening | 4.5→5.5→4.5 s | 2.5 s | Attentive motion, forward/reverse |
| thinking | 4.5→5.25→4.5 s | 2 s | Attentive motion, forward/reverse |
| speaking | 4.5→6→4.5 s | 3 s | Attentive motion, forward/reverse; no fabricated mouth movement |
| to-desk | 4.5→1.5 s | 2 s | Reverse of the filmed turn |
| working-a | 1.5→0.5→1.5 s | 2 s | Laptop work, reverse/forward |
| working-b | 1.5→0→1.5 s | 2 s | Alternate work segment, reverse/forward |
| to-front | 1.5–4.5 s | 2 s | Filmed turn, retimed |

Loops retrace a short filmed segment, starting and ending on their shared canonical frame. Cosine timing slows movement into the reversal and seam. Every output frame is one actual source frame: no dissolves, blended faces, morphing or interpolated frames. This avoids doubled faces while retaining subtle motion. The editing compromise is mirrored movement, including blinks and background motion; the turn to the laptop is also reversed. The uncompressed boundary frames are identical by construction; H.264 introduces small differences. These edits demonstrate scheduling and a more natural visual presence, not the quality of a future generated transition pipeline.

All four front-facing activities reuse naturally attentive footage. The actor does not perform four distinct scripted actions. In particular, the `speaking` state means that the software's audio is playing while the attentive portrait is visible; its lips do not track the words. Stronger semantic acting, a quiet single-person set, and new user-selected appearances still require a purpose-made clip set.

## Media validation

All eight files decode with the manifest's exact duration, a single H.264 video stream, 24 fps and 1152×720 dimensions. Combined output, including the provenance-tagged poster and manifest, is approximately 1.55 MB. First/middle/last frames and the frames nearest each loop seam were visually inspected. The loops use complete source frames throughout; no blended faces remain in the generated clips. Across decoded clip endpoints, the mean absolute RGB difference from the relevant reference endpoint is at most 1.786 on a 0–255 scale. Small compression differences do not certify perceptually seamless motion.

Each clip also played through to completion in an isolated Chromium session over local HTTP: 420 decoded frames in total, zero dropped frames, and no video decode errors. This checks the media files independently; the page's scheduler and responsive layout need their own integration checks.
