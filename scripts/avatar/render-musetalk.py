"""Offline, forward-only MuseTalk 1.5 experiment on a solo filmed performance.

The model/conditioning algorithm is from TMElyralab/MuseTalk (MIT, Tencent Music
Entertainment Group, 2024). This local runner avoids its reversed frame cycle,
loads only one large model at a time, and uses OpenCV tracking instead of DWPose.
Weights are separately downloaded and pinned; this script has no network calls.
See docs/AVATAR_PERFORMANCE_RESEARCH.md for source and dependency provenance.
"""
import argparse
import ctypes
import gc
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import time

import cv2
import librosa
import numpy as np
import torch
from diffusers import AutoencoderKL, AutoencoderTiny, UNet2DConditionModel
from transformers import WhisperFeatureExtractor, WhisperModel


def release():
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except OSError:
        pass


def checksum(filename):
    with open(filename, "rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


class StageCache:
    """Opt-in local checkpoints. A different input requires a different directory."""
    def __init__(self, directory, signature):
        self.directory = Path(directory) if directory else None
        if self.directory is None:
            return
        self.directory.mkdir(parents=True, exist_ok=True)
        marker = self.directory / "avatar-signature.json"
        if marker.exists():
            if json.loads(marker.read_text()) != signature:
                raise ValueError("Cache signature differs; choose a new --cache-dir. Existing files were not changed.")
        else:
            if any(self.directory.glob("avatar-*")):
                raise ValueError("Cache checkpoints have no signature; choose a new --cache-dir.")
            self.save_json("signature", signature)

    def path(self, name, suffix):
        return self.directory / f"avatar-{name}.{suffix}" if self.directory else None

    def write(self, name, suffix, writer):
        target = self.path(name, suffix)
        if target is None:
            return
        # Only this call's temporary file may be removed. Never clear a cache tree.
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.directory, prefix=".avatar-cache-", suffix=".tmp", delete=False) as handle:
                temporary = Path(handle.name)
                writer(handle)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, target)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def load_json(self, name):
        target = self.path(name, "json")
        return json.loads(target.read_text()) if target is not None and target.exists() else None

    def save_json(self, name, value):
        self.write(name, "json", lambda handle: handle.write((json.dumps(value, sort_keys=True)+"\n").encode()))

    def load_tensors(self, name):
        target = self.path(name, "pt")
        return torch.load(target, map_location="cpu", weights_only=True) if target is not None and target.exists() else None

    def save_tensors(self, name, value):
        self.write(name, "pt", lambda handle: torch.save(value, handle))

    def load_faces(self):
        target = self.path("faces", "npy")
        return np.load(target, allow_pickle=False) if target is not None and target.exists() else None

    def save_faces(self, faces):
        if self.directory:
            self.write("faces", "npy", lambda handle: np.save(handle, np.stack(faces), allow_pickle=False))


def cache_signature(args, models, video_sha256, audio_sha256, count):
    if not args.cache_dir:
        return None
    print("Checking model files for cache identity", flush=True)
    vae_name = "taesd" if args.vae == "tiny" else "sd-vae-ft-mse"
    model_files = [
        "MuseTalk/musetalkV15/musetalk.json", "MuseTalk/musetalkV15/unet.pth",
        f"{vae_name}/config.json", f"{vae_name}/diffusion_pytorch_model.safetensors",
        "whisper-tiny/config.json", "whisper-tiny/preprocessor_config.json", "whisper-tiny/model.safetensors",
    ]
    revisions = json.loads((models/"downloads.json").read_text())
    if args.vae == "tiny":
        revisions = [item for item in revisions if item["repo"] != "stabilityai/sd-vae-ft-mse"]
        revisions += json.loads((models/"taesd/downloads.json").read_text())
    return {"schema": 2, "autoencoder": args.vae, "videoSha256": video_sha256, "audioSha256": audio_sha256,
            "initialBox": args.box, "stride": args.stride, "frames": count, "fps": 25,
            "torch": str(torch.__version__), "opencv": cv2.__version__,
            "modelFiles": {name: checksum(models/name) for name in model_files},
            "revisions": [{key: item[key] for key in ("repo", "revision", "file")} for item in revisions]}


def load_vae(directory, variant):
    cls = AutoencoderTiny if variant == "tiny" else AutoencoderKL
    vae = cls.from_pretrained(directory, local_files_only=True, low_cpu_mem_usage=False).eval()
    if variant == "tiny" and (vae.config.scaling_factor != 1 or vae.config.shift_factor != 0):
        raise ValueError("The experimental TAESD path requires unit latent scaling and zero shift")
    return vae


def cached_sequence(bundle, name, shape, maximum):
    if bundle is None:
        return []
    tensor = bundle.get(name)
    if not isinstance(tensor, torch.Tensor) or tensor.ndim != len(shape)+1 or tuple(tensor.shape[1:]) != shape or len(tensor) > maximum:
        raise ValueError(f"Invalid {name} cache; choose a new --cache-dir")
    return list(tensor.split(1))


def face_boxes(video, count, initial_box):
    """Track only a face near the manually reviewed initial rectangle."""
    detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(str(video))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale = 640 / width
    x0, y0, x1, y1 = initial_box
    center = np.array([(x0+x1)/2, (y0+y1)/2], dtype=float)
    extent = np.array([x1-x0, y1-y0], dtype=float)
    anchor = None
    previous_detection = None
    boxes, crops = [], []
    for index in range(count):
        ok, frame = cap.read()
        if not ok:
            raise ValueError("Source is shorter than speech; refusing to repeat frames")
        small = cv2.resize(frame, (640, round(height*scale)))
        found = detector.detectMultiScale(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY),
                                         scaleFactor=1.1, minNeighbors=5,
                                         minSize=(max(24, round(extent[0]*scale*.55)),)*2)
        candidates = [np.array([x+w/2, y+h/2])/scale for x,y,w,h in found]
        candidates = [point for point in candidates if np.linalg.norm(point-center) < extent[0]*.9]
        if candidates:
            point = min(candidates, key=lambda candidate: np.linalg.norm(candidate-center))
            if anchor is None:
                anchor = center-point
            target = point+anchor
            center = target if previous_detection is None else center*.35+target*.65
            previous_detection = point
        box = np.rint(np.concatenate([center-extent/2, center+extent/2])).astype(int)
        if box[0] < 0 or box[1] < 0 or box[2] > width or box[3] > height:
            raise ValueError("Tracked face left the frame; inspect the source")
        x0,y0,x1,y1 = box
        crops.append(cv2.resize(frame[y0:y1,x0:x1], (256,256), interpolation=cv2.INTER_LANCZOS4))
        boxes.append(box.tolist())
    cap.release()
    return boxes, crops, width, height


@torch.inference_mode()
def render(args):
    started = time.monotonic()
    video_sha256, audio_sha256 = checksum(args.video), checksum(args.audio)
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    cv2.setNumThreads(1)
    torch.manual_seed(0)
    models = Path(args.models)
    whisper_dir = models / "whisper-tiny"
    vae_dir = models / ("taesd" if args.vae == "tiny" else "sd-vae-ft-mse")
    unet_dir = models / "MuseTalk/musetalkV15"
    vae_repo = "madebyollin/taesd" if args.vae == "tiny" else "stabilityai/sd-vae-ft-mse"
    vae_downloads = json.loads((vae_dir/"downloads.json" if args.vae == "tiny" else models/"downloads.json").read_text())
    vae_weight = next(item for item in vae_downloads if item["repo"] == vae_repo and item["file"] == "diffusion_pytorch_model.safetensors")
    vae_provenance = {"variant": args.vae, "repo": vae_repo, "revision": vae_weight["revision"],
                      "weightSha256": checksum(vae_dir/"diffusion_pytorch_model.safetensors"), "experimental": args.vae == "tiny"}
    if args.vae == "tiny":
        print("Experimental TAESD encoder/decoder: speed and face quality require comparison with the SD baseline", flush=True)
    video = cv2.VideoCapture(args.video)
    fps = video.get(cv2.CAP_PROP_FPS)
    available = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    video.release()
    if not fps or abs(fps-25) > .01:
        raise ValueError("This prepared source must be 25 fps")
    audio, _ = librosa.load(args.audio, sr=16000)
    count = math.floor(len(audio)/16000*fps)
    if count < 1 or count > available:
        raise ValueError("Speech needs more forward source frames; no wrapping is permitted")
    if any(start < 0 or end <= start or end > count for start,end in args.preserve_range):
        raise ValueError("Preserved source-frame intervals must lie inside this performance")
    indices = list(range(0, count, args.stride))
    if indices[-1] != count-1:
        indices.append(count-1)
    print(f"{count} source frames, {len(indices)} generated face frames", flush=True)
    cache = StageCache(args.cache_dir, cache_signature(args, models, video_sha256, audio_sha256, count))
    tracking = cache.load_json("tracking")
    crops = None
    if tracking is None:
        boxes, crops, width, height = face_boxes(args.video, count, args.box)
        cache.save_json("tracking", {"boxes": boxes, "width": width, "height": height})
    else:
        boxes, width, height = tracking["boxes"], tracking["width"], tracking["height"]
        if len(boxes) != count or any(len(box) != 4 or not (0 <= box[0] < box[2] <= width and 0 <= box[1] < box[3] <= height) for box in boxes):
            raise ValueError("Invalid tracking cache; choose a new --cache-dir")
    saved_faces = cache.load_faces()
    if saved_faces is not None and (saved_faces.ndim != 4 or saved_faces.shape[1:] != (256,256,3) or saved_faces.dtype != np.uint8 or len(saved_faces) > len(indices)):
        raise ValueError("Invalid face cache; choose a new --cache-dir")
    faces = list(saved_faces) if saved_faces is not None else []
    inference_seconds = 0
    print(f"Cache: {len(faces)}/{len(indices)} decoded faces", flush=True)
    if len(faces) < len(indices):
        predictions = cached_sequence(cache.load_tensors("predictions"), "predictions", (4,32,32), len(indices))
        if len(predictions) < len(indices):
            prompt_cache = cache.load_tensors("prompts")
            if prompt_cache is None:
                extractor = WhisperFeatureExtractor.from_pretrained(whisper_dir, local_files_only=True)
                whisper = WhisperModel.from_pretrained(whisper_dir, local_files_only=True, low_cpu_mem_usage=False).eval()
                features = []
                for offset in range(0, len(audio), 30*16000):
                    inputs = extractor(audio[offset:offset+30*16000], sampling_rate=16000, return_tensors="pt").input_features
                    features.append(torch.stack(whisper.encoder(inputs, output_hidden_states=True).hidden_states, dim=2))
                features = torch.cat(features, dim=1)[:, :math.floor(len(audio)/16000*50)]
                features = torch.cat([torch.zeros_like(features[:,:4]), features, torch.zeros_like(features[:,:12])], dim=1)
                prompts = torch.stack([features[0, index*2:index*2+10].reshape(50,384) for index in indices])
                position = torch.arange(50).unsqueeze(1)
                frequency = torch.exp(torch.arange(0,384,2)*(-math.log(10000)/384))
                pe = torch.zeros((50,384))
                pe[:,0::2], pe[:,1::2] = torch.sin(position*frequency), torch.cos(position*frequency)
                prompts += pe
                cache.save_tensors("prompts", {"prompts": prompts, "rng": torch.get_rng_state()})
                del whisper, extractor, features, inputs
                release()
            else:
                prompts = prompt_cache["prompts"]
                if not isinstance(prompts, torch.Tensor) or tuple(prompts.shape) != (len(indices),50,384):
                    raise ValueError("Invalid audio-prompt cache; choose a new --cache-dir")
                torch.set_rng_state(prompt_cache["rng"])
                del prompt_cache
            latent_cache = cache.load_tensors("latents")
            latents = cached_sequence(latent_cache, "latents", (8,32,32), len(indices))
            print(f"Cache: {len(latents)}/{len(indices)} encoded faces; {len(predictions)} predictions", flush=True)
            if len(latents) < len(indices):
                # Cached tracking avoids re-detecting the face after an interruption.
                if crops is None:
                    cap = cv2.VideoCapture(args.video)
                    crops = []
                    for x0,y0,x1,y1 in boxes:
                        ok, frame = cap.read()
                        if not ok:
                            raise ValueError("Source ended while restoring tracked crops")
                        crops.append(cv2.resize(frame[y0:y1,x0:x1], (256,256), interpolation=cv2.INTER_LANCZOS4))
                    cap.release()
                vae = load_vae(vae_dir, args.vae)
                if latent_cache is not None:
                    torch.set_rng_state(latent_cache["rng"])
                for n in range(len(latents), len(indices)):
                    face = torch.from_numpy(crops[indices[n]][:,:,::-1].copy()).permute(2,0,1).float()/255
                    masked = face.clone()
                    masked[:,128:] = 0
                    pair = torch.stack([masked,face])*2-1
                    # Diffusers' EncoderTiny accepts [-1,1] images and returns
                    # already SD-scaled latents; unlike AutoencoderKL, no 0.18215 factor.
                    encoded = vae.encode(pair).latents if args.vae == "tiny" else vae.encode(pair).latent_dist.sample()*vae.config.scaling_factor
                    latents.append(torch.cat([encoded[0:1],encoded[1:2]],dim=1))
                    if (n+1) % 25 == 0 or n+1 == len(indices):
                        cache.save_tensors("latents", {"latents": torch.cat(latents), "rng": torch.get_rng_state()})
                        print(f"Encoded {n+1}/{len(indices)}", flush=True)
                del vae, pair, encoded
            del latent_cache, crops
            crops = None
            release()
            config = json.loads((unet_dir/"musetalk.json").read_text())
            config = {key:value for key,value in config.items() if not key.startswith("_")}
            with torch.device("meta"):
                unet = UNet2DConditionModel(**config)
            weights = torch.load(unet_dir/"unet.pth", map_location="cpu", weights_only=True, mmap=True)
            unet.load_state_dict(weights, assign=True)
            unet.eval()
            del weights
            inference_started = time.monotonic()
            for n in range(len(predictions), len(indices)):
                predictions.append(unet(latents[n], torch.tensor([0]), encoder_hidden_states=prompts[n:n+1]).sample)
                if (n+1) % 25 == 0 or n+1 == len(indices):
                    cache.save_tensors("predictions", {"predictions": torch.cat(predictions)})
                if n % 10 == 0:
                    print(f"Generated {n+1}/{len(indices)}; {time.monotonic()-inference_started:.1f}s", flush=True)
            inference_seconds = time.monotonic()-inference_started
            del unet, latents, prompts
            release()
        vae = load_vae(vae_dir, args.vae)
        for n in range(len(faces), len(indices)):
            latent = predictions[n] if args.vae == "tiny" else predictions[n]/vae.config.scaling_factor
            # Diffusers' DecoderTiny maps its native [0,1] result to [-1,1],
            # so both wrappers use the same final image normalization here.
            decoded = (vae.decode(latent).sample/2+.5).clamp(0,1)
            faces.append((decoded[0].permute(1,2,0).numpy()[:,:,::-1]*255).round().astype(np.uint8))
            if (n+1) % 25 == 0 or n+1 == len(indices):
                cache.save_faces(faces)
                print(f"Decoded {n+1}/{len(indices)}", flush=True)
        del vae, predictions, decoded
        release()
    del crops, saved_faces
    print("Decoding complete; compositing original body frames", flush=True)

    mask = np.ones((256,256), dtype=np.float32)
    mask[:126] = 0
    mask[126:146] *= np.linspace(0,1,20)[:,None]
    mask[:,:18] *= np.linspace(0,1,18)[None,:]
    mask[:,-18:] *= np.linspace(1,0,18)[None,:]
    mask[-14:] *= np.linspace(1,0,14)[:,None]
    if args.blend == "mouth":
        # Keep the actor's cheeks, jaw outline and neck. The generated lower
        # face is only needed around the lips, not across the whole rectangle.
        mask[:] = 0
        cv2.ellipse(mask, (128,169), (78,43), 0, 0, 360, 1, -1)
        mask = cv2.GaussianBlur(mask, (31,31), 7)
    cap = cv2.VideoCapture(args.video)
    output = Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    command = ["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","bgr24",
               "-s",f"{width}x{height}","-r",str(fps),"-i","pipe:0","-i",args.audio,
               "-map","0:v:0","-map","1:a:0","-c:v","libx264","-preset","fast","-crf","20",
               "-threads","2","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-shortest",
               "-movflags","+faststart",str(output)]
    encoder = subprocess.Popen(command,stdin=subprocess.PIPE)
    key = 0
    for index,box in enumerate(boxes):
        ok, frame = cap.read()
        if not ok:
            raise ValueError("Source ended during export")
        while key+1 < len(indices) and indices[key+1] <= index:
            key += 1
        face = faces[key]
        if key+1 < len(indices) and indices[key] != index:
            ratio = (index-indices[key])/(indices[key+1]-indices[key])
            face = cv2.addWeighted(face,1-ratio,faces[key+1],ratio,0)
        x0,y0,x1,y1 = box
        face = cv2.resize(face,(x1-x0,y1-y0),interpolation=cv2.INTER_LANCZOS4)
        alpha = cv2.resize(mask,(x1-x0,y1-y0))[:,:,None]
        if any(start <= index < end for start,end in args.preserve_range):
            # Reviewed foreground occlusions (for example a waving hand) must
            # retain their original pixels, not acquire a generated mouth.
            alpha[:] = 0
        frame[y0:y1,x0:x1] = np.clip(frame[y0:y1,x0:x1]*(1-alpha)+face*alpha,0,255).astype(np.uint8)
        encoder.stdin.write(frame.tobytes())
    encoder.stdin.close()
    cap.release()
    if encoder.wait():
        raise RuntimeError("Video export failed")
    report = {"model":"MuseTalk 1.5","frames":count,"faceStride":args.stride,"seconds":round(time.monotonic()-started,2),
              "generatedFrames":len(indices),"inferenceSeconds":round(inference_seconds,2),
              "timingScope":"this invocation only; previously cached work excluded",
              "video":args.video,"audio":args.audio,"initialBox":args.box,"body":"original forward frames at original speed",
              "videoSha256":video_sha256,"audioSha256":audio_sha256,
              "cacheDirectory":args.cache_dir,
              "autoencoder":vae_provenance,
              "preservedSourceFrameIntervals":args.preserve_range,
              "tracking":"OpenCV Haar near reviewed initial box","blend":args.blend}
    output.with_suffix(".json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report),flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models",default=".data/avatar-performance/muse")
    parser.add_argument("--video",required=True)
    parser.add_argument("--audio",required=True)
    parser.add_argument("--output",required=True)
    parser.add_argument("--box",nargs=4,type=int,required=True,metavar=("X0","Y0","X1","Y1"))
    parser.add_argument("--stride",type=int,choices=[1,2],default=1)
    parser.add_argument("--threads",type=int,choices=range(1,9),default=4)
    parser.add_argument("--vae",choices=["sd","tiny"],default="sd",
                        help="SD is the baseline; tiny is an experimental TAESD encoder/decoder with unverified facial quality")
    parser.add_argument("--cache-dir",help="Opt-in resumable checkpoints, e.g. .data/avatar-performance/cache-full; mismatched inputs fail safely")
    parser.add_argument("--preserve-range",nargs=2,type=int,action="append",default=[],metavar=("START_FRAME","END_FRAME"),
                        help="Keep original face pixels in reviewed occlusions; end frame is exclusive")
    parser.add_argument("--blend",choices=["mouth","lower-face"],default="mouth")
    render(parser.parse_args())
