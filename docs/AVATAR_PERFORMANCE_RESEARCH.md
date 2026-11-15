# A performance-first avatar

Research checked against primary sources on 15 November 2026. The available laptop is an i7-1360P with Intel Iris Xe and 16 GB RAM, about 4–5 GB available; there is no NVIDIA GPU. The CUDA routes below therefore require a separate available GPU. Published benchmarks are the authors' measurements, not measurements of this workspace. A separately authorized CPU experiment is being prepared under ignored `.data/avatar-performance/`; no paid service is used.

## Recommendation

The current stock set cannot become convincing by changing its scheduler: its source has no spoken performance, and its two-to-three-second forward/reverse fragments repeat conspicuous movements. The source and compromises are documented in [AVATAR_STOCK_ASSETS.md](AVATAR_STOCK_ASSETS.md).

For this hackathon, build **complete, forward-only performances for two or three selected conversations**. Write the short spoken answer first, then stage the glance, pause, acknowledgement, search and explanation around its meaning. Use one person alone in a quiet office. Preserve an actual performance wherever possible; change the mouth with a lip-sync model only when needed. This is a design recommendation, not a claim that any reviewed model already solves natural acting.

The strongest no-purchase route is an existing GPU plus purpose-made solo footage. A teammate recording the exact script supplies correct lips, gaze, breath and gestures without model inference at all. If the chosen voice differs, MuseTalk can replace the mouth while retaining the filmed body. Licensed solo footage is a weaker substitute: a convincing explanation still needs appropriate acting. A generated reference image plus EchoMimic is the route toward a fully fictional appearance, but requires more compute and quality selection.

## Candidates worth testing

| Candidate | Useful contribution | Verified requirements and limitations | Code/checkpoints |
| --- | --- | --- | --- |
| **MuseTalk 1.5 — first lip-sync experiment** | Replaces the facial region of an input video using an audio track; keeps the existing body performance. | Official minimum test: RTX 3050 Ti laptop, 4 GB VRAM, fp16, about five minutes for eight seconds. Authors report 30fps+ on V100. Face crop is 256×256; their limitations include facial-detail loss and jitter. Does not invent meaningful body gestures. | [Official README and weights](https://github.com/TMElyralab/MuseTalk#download-weights). Code MIT; authors permit their own model commercially. Dependencies retain their own licenses. Internet test videos are restricted to noncommercial research. |
| **LatentSync 1.5 / 1.6 — quality alternative** | Audio-conditioned lip-sync over existing video. | Minimum inference VRAM: 8 GB for 1.5, 18 GB for 1.6. Version 1.6 uses 512×512 training to reduce mouth/teeth blur. Still requires an existing performance. | [Official setup](https://github.com/bytedance/LatentSync#-inference). Code Apache-2.0; the [1.6 checkpoint card](https://huggingface.co/ByteDance/LatentSync-1.6) specifies OpenRAIL++, so code and model terms are different. |
| **EchoMimicV2 — controlled upper body** | Reference image + audio + hand-pose sequence. A recorded driving performance can carry gestures into a fictional appearance. | Official tested GPUs include 16 GB V100, 24 GB 4090D and 80 GB A100. Accelerated benchmark: approximately 50 seconds per 120 frames on A100. This does not establish performance on our machine. | [Official repository and pose-alignment demo](https://github.com/antgroup/echomimic_v2), [paper](https://arxiv.org/abs/2411.10061). Code Apache-2.0; main weights are linked from its model-preparation section, with separate VAE/audio dependencies. |
| **EchoMimicV3-Flash — generated speaking scene** | Audio-conditioned human animation from a reference image with text guidance. | January 2026 Flash update advertises eight steps, 12 GB VRAM and up to 768×768. README offers shorter chunks to lower memory and long-video settings beyond 138 frames. These are capabilities, not proof of clean hands, exact gestures or identity over a whole conversation. | [Official repository](https://github.com/antgroup/echomimic_v3), [checkpoint](https://huggingface.co/BadToBest/EchoMimicV3/tree/main/echomimicv3-flash-pro). Code and model card Apache-2.0; additional Wan/audio weights required. |
| **LivePortrait — facial performance transfer** | Transfers facial expression and head motion from a driving video; image or video source. | Useful for expressive listening, not a complete audio-to-body system. An audio track alone does not supply the driving facial performance. | [Official repository](https://github.com/KlingAIResearch/LivePortrait), [weights](https://huggingface.co/KlingTeam/LivePortrait). MIT code/model card; [license explicitly flags InsightFace detector models as noncommercial](https://github.com/KlingAIResearch/LivePortrait/blob/main/LICENSE), requiring replacement for commercial use. |

Hallo's official inference uses an image/audio pair and an extensive checkpoint bundle; the documented tested GPU is A100. It provides no simpler verified low-memory route than the candidates above. Code is MIT, but its [checkpoint dependencies](https://github.com/fudan-generative-vision/hallo#-download-pretrained-models) include InsightFace and Stable Diffusion components. Do not equate the repository's code license with every bundled model's terms.

Two recent talking-head systems are relevant to interaction, but do not supply the desired desk/body choreography:

- [Ditto](https://github.com/antgroup/ditto-talkinghead) provides audio-driven motion and public TensorRT/PyTorch checkpoints. Its documented tested environment is A100; the supplied TensorRT build targets Ampere+, with conversion needed for other hardware. Repository Apache-2.0. It is a fallback portrait engine, not evidence that a full cabinet scene will animate naturally.
- [AVTR-1](https://github.com/avaturn-live/avtr-1) conditions speech and active listening on two audio tracks, including offline generation. Author benchmarks give 232 ms per five frames on RTX 4060 and 166 ms on 4060 Ti at 25fps. Requires Linux, CUDA 12.x and TensorRT 10.x. Weights/tooling use a community license, but renderer/streamer are separately **noncommercial**, and detector dependencies have further restrictions. Promising for a research demo; unsuitable as an assumed unrestricted shipping dependency. Production backend is still marked forthcoming in its checklist.

## A loop trap in the recommended tool

Both MuseTalk's [normal inference](https://github.com/TMElyralab/MuseTalk/blob/main/scripts/inference.py) and [realtime example](https://github.com/TMElyralab/MuseTalk/blob/main/scripts/realtime_inference.py) append reversed source frames, then index cyclically. Running the examples against a short clip recreates the exact defect the user rejected.

For our experiment, the source must be at least as long as the audio at matching frame rate. Use only its first forward pass; enforce a frame-count guard that fails rather than silently wrapping or reversing. Prefer an explicit forward-only preprocessing/export path. Do not call a clip natural merely because its first and last pixels match.

## Scene grammar instead of tiny state loops

This proposed design separates **communicative intention** from tool state:

1. An attentive entry with eye contact, followed by one acknowledgement of the user's specific concern.
2. A brief question or a deliberate turn toward the screen when more information is needed.
3. Real search events may trigger work footage. During a longer wait, show the actual document or result as a motivated cutaway; do not replay the same nod indefinitely.
4. A return to the viewer followed by a complete spoken explanation, with gestures tied to its clauses: a small counting gesture for steps, a pause for uncertainty, an inviting gesture for a choice.
5. A real response opportunity. A follow-up option starts a distinct response performance; interruption stops the voice and yields an attentive shot at the next acceptable edit point.

Build variants of meaningful exchanges, not a large set of indistinguishable idle loops. Record/generate longer neutral sections and never replay the same movement within a short conversation. Maintain a shot history and use forward-only alternate takes. At clip boundaries, a motivated cut on a gaze shift or to the cited document can look more intentional than a face dissolve or an impossible continuous morph.

For the selected scripted scenarios, mux speech into the finished speaking MP4 and drive captions from the same timeline. This prevents independently scheduled audio/video from drifting. For an arbitrary live answer, use a distinct fallback: no prerecorded actor should appear to pronounce a different text. Recorded demo claims must stay separate from live results.

Keep the actor alone **in the source**. A close crop or generated clean reference can establish a cabinet, but neither supplies missing acting. Background replacement around moving hair and hands introduces another quality problem; it should not be the first experiment. Recording or pose-driving a performance gives control over the gesture's meaning and timing that random audio-conditioned motion does not guarantee.

## Small decisive test

Before integrating any model, compare one 8–12-second spoken scene at the actual display size:

- A single person, empty cabinet, camera-level gaze, hands visible where useful.
- One acknowledgement, one meaningful gesture, a natural pause and a clear end; no reverse frames, wraps or frozen ending.
- Exact final voice and exact matching captions; assess lips, teeth, jaw boundary, identity and gesture timing.
- Watch with sound, without sound, then twice in succession. Reject facial warping, unrelated smiling, hand artifacts and conspicuous repeated beats.
- Only after this passes, create a 30–45-second answer and one follow-up. Evaluate user interruption and the longest search wait before expanding the media library.

Directly recorded performance is the first no-purchase path without a GPU. Open weights do not include free compute, and a hosted public demo's existence does not guarantee capacity or suitable output rights. Native image generation can supply a clean fictional reference, but cannot itself supply a video performance. The CPU experiment below is intended to establish whether another practical path exists on this machine.

## Actual availability and CPU experiments

During the 15 November checks, the [official MuseTalk Space](https://huggingface.co/spaces/TMElyralab/MuseTalk) reported `RUNTIME_ERROR` because model files were missing. [henrybit's ZeroGPU port](https://huggingface.co/spaces/henrybit/musetalk-1-5) appeared `RUNNING` in the catalogue but its application repeatedly timed out. Other inspected community interfaces had a missing inference script or placeholder loading. No footage or audio was uploaded to those interfaces. The experiments below ran locally; no paid compute or generation service was purchased.

### Measured short probes

Each probe uses the selected solo-office performance and generated female speech. Timings are this laptop's measurements, not provider benchmarks.

| Probe | Input and processing | Observed result |
| --- | --- | --- |
| Wav2Lip GAN | Two-second audio excerpt, CPU | Completed in **27.707 s**. Kept as a private technical comparison; not integrated into the public avatar. |
| MuseTalk 1.5 + SD VAE | 50 frames at 25 fps; 640-pixel-wide input; manually chosen face box `(282, 43, 387, 179)` | **343.39 s** total, including **56.08 s** in the UNet. The generated jaw was visibly blurred and mouth opening exaggerated. Rejected for presentation. |
| MuseTalk 1.5 + TAESD | Same 50 source frames and audio, tighter box `(299, 65, 382, 177)` | Completed invocation: **73.76 s**, including **52.31 s** in the UNet. This resumed an already encoded cache after interruption, so the figure excludes that earlier work. Visually better in the short comparison, but changing both crop and VAE means this is **not an isolated VAE quality or speed comparison**. |
| First three seconds of the actual main answer | 75 frames at 25 fps; 1280-pixel-wide input; box `(582, 120, 762, 366)`; TAESD | The resumed invocation completed in **102.95 s**, including **61.10 s** of remaining UNet work. Encoding and 25 predictions were already cached. Source frames **22–27** retain their original face pixels where the opening wave crosses the mouth. Full-scene quality and publication are separate checks. |

Probe videos and JSON timing reports are under `/tmp/avatar-performance-test/`; resumable data stays in ignored `.data/avatar-performance/`. No probe output was ever published; the page now uses the Desk footage described in [AVATAR_DESK_ASSETS.md](AVATAR_DESK_ASSETS.md). Successful inference does not establish convincing speech, natural transitions or readiness for a long conversation.

[Wav2Lip's license notice](https://github.com/Rudrabha/Wav2Lip#license-and-citation) limits use to personal/research/noncommercial purposes. Its source is pinned to `Rudrabha/Wav2Lip@bac9a81e63ecc153202353372e5724b83d9e6322`. The officially linked checkpoint used here is a **TorchScript archive** and was loaded with `torch.jit.load`, not as a weights-only state dictionary. Local compatibility edits use current librosa keyword arguments, limit CPU threads and fail when speech outlasts the available forward source frames. No Wav2Lip output is included in public assets.

### Reproducible local renderer

`scripts/avatar/render-musetalk.py` adapts MuseTalk's conditioning and model sequence, with its MIT notice in `scripts/avatar/MUSETALK_NOTICE.txt`. It uses a reviewed initial face rectangle and nearby OpenCV tracking. Body frames remain in their original forward order at **25 fps**; the runner refuses to wrap or reverse a source that is too short. The original eyes are retained and the generated lower face is feathered into the shot. Reviewed occlusion intervals can preserve the original face pixels.

The default is `--vae sd`, `--stride 1`, and four CPU threads. `--vae tiny` selects the experimental TAESD encoder and decoder; `--stride 2` generates every other face and interpolates between those faces while retaining every original body frame. It is a quality tradeoff, not the default. `--threads` accepts 1–8. Optional `--cache-dir` checkpoints prompts, tracking, encoded latents, predictions and decoded faces, including the encoding random-number state. Writes are atomic; tensor caches use `weights_only=True`, face arrays disable pickle, and input/model fingerprints reject mismatched caches. Timing reports cover only the current invocation, excluding previous cached work.

[TAESD](https://github.com/madebyollin/taesd) uses the Stable Diffusion latent representation with a smaller autoencoder. Its author explicitly describes lost fine detail and possible video flicker; fast rendering is not evidence of equal face quality. The [model card](https://huggingface.co/madebyollin/taesd) specifies MIT. The pinned [SD VAE card](https://huggingface.co/stabilityai/sd-vae-ft-mse/raw/31f26fdeee1355a5c34592e401dd41e45d25a493/README.md) also specifies MIT; do not infer a different license from unrelated Stable Diffusion components.

| Downloaded model | Pinned revision |
| --- | --- |
| `TMElyralab/MuseTalk` | `2bcb936e2fddb4d86db4c62fd45b387d0c061571` |
| `stabilityai/sd-vae-ft-mse` | `31f26fdeee1355a5c34592e401dd41e45d25a493` |
| `openai/whisper-tiny` | `169d4a4341b33bc18d8881c4b69c2e104e1cc0af` |
| `madebyollin/taesd` | `614f76814bbe30edbe2e627ace1c2234c81a2c0e` |

Exact download URLs, file sizes and SHA-256 values are recorded in `.data/avatar-performance/muse/downloads.json` and `muse/taesd/downloads.json`. The isolated environment reuses Android NDK 27.3's Python 3.11.4 without altering the NDK installation. Core pins include Torch `2.6.0+cpu`, NumPy `1.26.4`, librosa `0.10.2.post1`, OpenCV `4.10.0.84`, Diffusers `0.30.2`, Transformers `4.39.2`, Safetensors `0.4.5` and Hugging Face Hub `0.30.2`. The initial environment lock and installed package metadata remain under `.data/avatar-performance/`; the initial lock predates the Diffusers additions. CPU wheels came from PyTorch's official index and other wheels from PyPI. System Python downloaded them because the NDK interpreter lacks SSL support; installation was into the experiment's local environment only.

### Actual Gemini contribution

Gemini `gemini-3.8-flash-tts`, voice **Kore**, generated the three authored answers through the configured free-tier account: **16.28 s**, **9.36 s** and **12.52 s**, totaling **38.16 s** of speech. Silence tails produce the 39.04-second video timeline. Playback uses these saved assets and makes no new TTS request. Scripts, source citations and request metadata are retained; this is actual asset generation, not simulated Gemini use or proof of eligibility for a sponsor challenge.

An offline Whisper-tiny transcription check recovered all substantive sentences and their order. Differences were proper names/spelling: `Kela` became `Kayla` or `Kellis`, `centre` became `center`, and `InfoFinland` became `Info Finland`. These results flag Kela pronunciation for listening; a small recognizer's spelling is not proof that the generated voice pronounced it incorrectly. The exact outputs, differences and audio hashes are in `.data/avatar-performance/transcript-check.json`. This check does not substitute for listening to the complete performances.
