#!/usr/bin/env node
// Offline source preparation/export. Requires ffmpeg/ffprobe; never calls a provider.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const lab = path.join(root, ".data/avatar-performance");
const publicDir = path.join(root, "public/avatar/office");
const sourceSha256 = "e114e8a3da63c21ca3dd24ea2fd3912c2bfd44c4ecd1410b94df57ef93aa8350";
const cuts = [
  { id: "pregnancy", sourceInMs: 0, sourceOutMs: 16560, durationMs: 16560, speechMs: 16280 },
  { id: "clinic", sourceInMs: 16560, sourceOutMs: 26200, durationMs: 9640, speechMs: 9360 },
  { id: "employer", sourceInMs: 26200, sourceOutMs: 39040, durationMs: 12840, speechMs: 12520 },
];
const { values } = parseArgs({ options: { source: { type: "string" }, rendered: { type: "string" }, publish: { type: "boolean" }, dubbed: { type: "boolean" }, help: { type: "boolean" } } });
if (values.help || (!values.source && !values.rendered && !values.publish && !values.dubbed)) {
  console.log("Offline only. No arguments change nothing.\n  --source ORIGINAL.mp4  Verify original; prepare forward-only video, padded speech and provenance.\n  --rendered MUSE.mp4    Validate timeline and print the export plan.\n  --rendered MUSE.mp4 --publish  Export experimental MuseTalk scenes after review.\n  --rendered .data/avatar-performance/prepared-source.mp4 --dubbed --publish\n    Export reviewed filmed scenes with Gemini dubbing; mouth motion is unchanged and unsynchronized.\nWithout --publish, either export mode only prints its plan. This script never performs lip-sync inference.");
  process.exit(0);
}
if ((!values.source && !values.rendered) || (values.source && values.rendered) || (values.source && (values.publish || values.dubbed))) throw new Error("Choose --source, or --rendered with optional --dubbed and --publish.");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
async function hash(file) { const digest = createHash("sha256"); for await (const chunk of createReadStream(file)) digest.update(chunk); return digest.digest("hex"); }
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 2_000_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`);
  return result.stdout;
}
const ffmpeg = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const probe = (file) => JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames,duration", "-of", "json", file]));
const matchesDuration = (seconds, milliseconds, tolerance = 1) => Number.isFinite(Number(seconds)) && Math.abs(Number(seconds) * 1000 - milliseconds) <= tolerance;
function videoInfo(file, minimumFrames) {
  const info = probe(file), video = info.streams.find((stream) => stream.codec_type === "video");
  if (!video || video.r_frame_rate !== "25/1" || Number(video.nb_frames) < minimumFrames || !Number.isFinite(Number(video.nb_frames))) throw new Error(`${file}: expected at least ${minimumFrames} forward frames at 25fps.`);
  return info;
}
const dialogue = await json(path.join(root, "src/data/avatar-performance-dialogue.json"));
const speech = await Promise.all(cuts.map(async (cut) => {
  const scene = dialogue.scenes.find((candidate) => candidate.id === cut.id);
  const audio = path.join(lab, "speech", `${cut.id}.wav`), metadata = await json(path.join(lab, "speech", `${cut.id}.json`));
  const spokenText = metadata.input?.flatMap((item) => item.content ?? []).find((item) => item.type === "text")?.text;
  if (!scene || spokenText !== scene.speech || metadata.model !== dialogue.model || metadata.generation_config?.speech_config?.[0]?.voice !== dialogue.voice) throw new Error(`${cut.id}: speech provenance does not match dialogue.`);
  const info = probe(audio);
  if (info.streams.length !== 1 || info.streams[0].codec_type !== "audio" || !matchesDuration(info.format.duration, cut.speechMs)) throw new Error(`${cut.id}: unexpected speech length or streams.`);
  return { ...cut, transcript: scene.speech, citations: scene.citations, audio, audioSha256: await hash(audio), generatedAt: metadata.generatedAt };
}));
await mkdir(lab, { recursive: true });
if (values.source) {
  const original = path.resolve(values.source);
  if (await hash(original) !== sourceSha256) throw new Error("Original checksum differs; inspect the source before changing the expected hash.");
  videoInfo(original, 976);
  const staging = await mkdtemp(path.join(lab, "prepare-"));
  try {
    const video = path.join(staging, "prepared-source.mp4"), audio = path.join(staging, "prepared-full.wav");
    ffmpeg(["-i", original, "-map", "0:v:0", "-vf", "scale=1280:676:flags=lanczos,setsar=1", "-frames:v", "976", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-threads", "2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", video]);
    const filters = speech.map((cut, index) => `[${index}:a]apad,atrim=duration=${cut.durationMs / 1000},asetpts=PTS-STARTPTS[a${index}]`);
    filters.push("[a0][a1][a2]concat=n=3:v=0:a=1[voice]");
    ffmpeg([...speech.flatMap((cut) => ["-i", cut.audio]), "-filter_complex", filters.join(";"), "-map", "[voice]", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", audio]);
    videoInfo(video, 976);
    if (!matchesDuration(probe(audio).format.duration, 39040)) throw new Error("Prepared audio does not match the 976-frame timeline.");
    await rename(video, path.join(lab, "prepared-source.mp4"));
    await rename(audio, path.join(lab, "prepared-full.wav"));
    await save(path.join(lab, "prepared-cuts.json"), cuts);
    await save(path.join(lab, "prepared-provenance.json"), { sourceSha256, direction: "forward", speed: 1, frames: 976, fps: 25, cuts,
      preparedVideoSha256: await hash(path.join(lab, "prepared-source.mp4")), preparedAudioSha256: await hash(path.join(lab, "prepared-full.wav")),
      speech: Object.fromEntries(speech.map((cut) => [cut.id, cut.audioSha256])) });
    console.log("Prepared 39.04 seconds: original forward video, three spoken answers and silence tails. No model or API called.");
  } finally { await rm(staging, { recursive: true, force: true }); }
} else {
  const rendered = path.resolve(values.rendered);
  videoInfo(rendered, 976);
  const savedCuts = await json(path.join(lab, "prepared-cuts.json"));
  if (JSON.stringify(savedCuts) !== JSON.stringify(cuts)) throw new Error("Prepared cuts differ from this export's fixed timeline.");
  const method = values.dubbed ? "dubbed" : "musetalk";
  if (!values.publish) {
    console.log(JSON.stringify({ rendered, method, cuts, writes: false, note: values.dubbed ? "Review filmed scenes and dubbing; mouth motion is unchanged. --publish also verifies preparation provenance." : "Review the face, sound and edit points, then use --publish to export." }, null, 2));
    process.exit(0);
  }
  const renderedSha256 = await hash(rendered);
  let lipSync;
  if (values.dubbed) {
    const preparedSha256 = await hash(path.join(lab, "prepared-source.mp4"));
    if (renderedSha256 !== preparedSha256) throw new Error("Dubbed scenes must use the unchanged prepared-source.mp4, not a face-processed render.");
    const origin = await json(path.join(lab, "prepared-provenance.json")).catch(() => { throw new Error("Run --source ORIGINAL.mp4 once to record verified preparation provenance before dubbed export."); });
    if (origin.sourceSha256 !== sourceSha256 || origin.preparedVideoSha256 !== preparedSha256 || origin.preparedAudioSha256 !== await hash(path.join(lab, "prepared-full.wav")) || origin.direction !== "forward" || origin.speed !== 1 || origin.frames !== 976 || origin.fps !== 25 || JSON.stringify(origin.cuts) !== JSON.stringify(cuts) || speech.some((cut) => origin.speech?.[cut.id] !== cut.audioSha256)) throw new Error("Prepared video/audio inputs changed; run --source with the verified original again.");
    lipSync = { method: "none", renderedSha256, note: "Filmed mouth motion is unaltered. The Gemini soundtrack is dubbed and is not lip-synchronized. Reviewed quality refers to the filmed visuals only." };
  } else {
    const report = await json(rendered.replace(/\.[^.]+$/, ".json"));
    if (report.model !== "MuseTalk 1.5" || report.frames < 976 || report.body !== "original forward frames at original speed") throw new Error("Expected the forward-only MuseTalk render report beside the video.");
    if (!["sd", "tiny"].includes(report.autoencoder?.variant) || !report.autoencoder.weightSha256) throw new Error("Render report must identify its baseline or experimental autoencoder.");
    for (const [key, filename] of [["video", "prepared-source.mp4"], ["audio", "prepared-full.wav"]]) {
      if (typeof report[key] !== "string" || report[`${key}Sha256`] !== await hash(path.join(lab, filename))) throw new Error(`Render ${key} differs from the prepared timeline.`);
    }
    const downloads = await json(path.join(lab, "muse/downloads.json"));
    const checkpoint = downloads.find((item) => item.repo === "TMElyralab/MuseTalk" && item.file === "musetalkV15/unet.pth");
    if (!checkpoint?.sha256) throw new Error("MuseTalk checkpoint checksum has not been recorded.");
    lipSync = { method: "musetalk", model: report.model, autoencoder: report.autoencoder, faceStride: report.faceStride, initialBox: report.initialBox, preservedSourceFrameIntervals: report.preservedSourceFrameIntervals, blend: report.blend, checkpointRevision: checkpoint.revision, checkpointSha256: checkpoint.sha256, renderedSha256 };
  }
  const staging = await mkdtemp(path.join(lab, "export-")), manifest = {};
  try {
    for (const cut of speech) {
      const output = path.join(staging, `${cut.id}.mp4`), seconds = String(cut.durationMs / 1000);
      ffmpeg(["-ss", String(cut.sourceInMs / 1000), "-i", rendered, "-i", cut.audio, "-map", "0:v:0", "-map", "1:a:0", "-af", `apad,atrim=duration=${seconds},asetpts=PTS-STARTPTS`, "-t", seconds, "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-threads", "2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output]);
      const info = videoInfo(output, cut.durationMs / 40), audio = info.streams.find((stream) => stream.codec_type === "audio");
      if (Number(info.streams.find((stream) => stream.codec_type === "video").nb_frames) !== cut.durationMs / 40 || !audio || !matchesDuration(audio.duration, cut.durationMs, 40) || !matchesDuration(info.format.duration, cut.durationMs, 40)) throw new Error(`${cut.id}: exported audio/video duration mismatch.`);
      manifest[cut.id] = { video: `/avatar/office/answers/${cut.id}.mp4`, transcript: cut.transcript, durationMs: cut.durationMs, method, quality: values.dubbed ? "reviewed" : "experimental", provenance: {
        creator: "MART PRODUCTION", sourceUrl: "https://www.pexels.com/video/a-businesswoman-greeting-and-talking-7643308/", licenseUrl: "https://www.pexels.com/license/", sourceSha256, sourceInMs: cut.sourceInMs, sourceOutMs: cut.sourceOutMs, direction: "forward", speed: 1,
        lipSync,
        speech: { model: dialogue.model, voice: dialogue.voice, generatedAt: cut.generatedAt, sha256: cut.audioSha256, speechMs: cut.speechMs, silenceTailMs: cut.durationMs - cut.speechMs }, citations: cut.citations, researchRecordedAt: dialogue.researchRecordedAt, outputSha256: await hash(output),
      } };
    }
    await mkdir(path.join(publicDir, "answers"), { recursive: true });
    for (const cut of cuts) await rename(path.join(staging, `${cut.id}.mp4`), path.join(publicDir, "answers", `${cut.id}.mp4`));
    await save(path.join(staging, "performances.json"), manifest);
    await rename(path.join(staging, "performances.json"), path.join(publicDir, "performances.json"));
    console.log(values.dubbed ? "Exported three dubbed filmed performances. Original mouth motion is unchanged and not synchronized to the Gemini voice." : "Exported three experimental MuseTalk performances; no generation or network request was made.");
  } finally { await rm(staging, { recursive: true, force: true }); }
}
