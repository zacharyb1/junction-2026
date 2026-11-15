#!/usr/bin/env node
// Refresh every duration in public/avatar/desk/presence.json from the files it names, measured with
// ffprobe, and check that each video is a silent 1280x720 file at the manifest's frame rate whose first
// and last frames have the same brightness as every other file's (they all show the same rest frame,
// so a difference shows as a flicker at every join).
// Run it after replacing any desk video or speech file; the player and the page read durations only
// from the manifest.
//
//   node scripts/avatar/sync-desk-manifest.mjs [--check] [--lip-sync <scene|all>=<musetalk|none>]...
//
// --check      change nothing; exit 1 when a duration is stale or a file is missing or malformed.
//              A brightness or colour-tag mismatch between files is printed as a WARNING in both modes.
// --lip-sync   record whether a prepared answer's video has a generated mouth, e.g. --lip-sync all=musetalk.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  check: { type: "boolean", default: false },
  "lip-sync": { type: "string", multiple: true, default: [] },
  manifest: { type: "string", default: "public/avatar/desk/presence.json" },
} });
const manifestPath = values.manifest;
const publicRoot = path.resolve(path.dirname(manifestPath), "..", "..");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const problems = [];
const warnings = [];
const changes = [];
/** Joins are crossfades between two encodes of the rest frame; more than this mean luma step shows. */
const MAX_REST_LUMA_SPREAD = 0.75;
const restLuma = [];

function probe(src) {
  const file = path.join(publicRoot, src);
  if (!existsSync(file)) { problems.push(`${src}: missing`); return null; }
  const output = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate,color_space,color_range", "-of", "json", file], { encoding: "utf8" });
  const { format, streams = [] } = JSON.parse(output);
  return { durationMs: Math.round(Number(format.duration) * 1000), streams };
}
/** Mean luma (8-bit) of a video's first and last frames. */
function edgeLuma(src) {
  const file = path.join(publicRoot, src);
  const measure = (args) => {
    const output = execFileSync("ffmpeg", ["-v", "error", "-threads", "4", ...args, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"], { encoding: "utf8" });
    const values = [...output.matchAll(/YAVG=([0-9.]+)/g)].map((match) => Number(match[1]));
    return values.at(-1);
  };
  return [measure(["-i", file, "-frames:v", "1"]), measure(["-sseof", "-0.2", "-i", file])];
}
function checkVideo(src, info) {
  const video = info.streams.filter((stream) => stream.codec_type === "video");
  if (video.length !== 1) { problems.push(`${src}: expected one video stream, found ${video.length}`); return; }
  const [num, den] = String(video[0].r_frame_rate).split("/").map(Number);
  if (video[0].width !== manifest.width || video[0].height !== manifest.height) problems.push(`${src}: ${video[0].width}x${video[0].height}, expected ${manifest.width}x${manifest.height}`);
  if (Math.abs(num / (den || 1) - manifest.fps) > 0.01) problems.push(`${src}: ${video[0].r_frame_rate} fps, expected ${manifest.fps}`);
  if (info.streams.some((stream) => stream.codec_type === "audio")) problems.push(`${src}: has an audio track; desk videos must be silent`);
  const [first, last] = edgeLuma(src);
  restLuma.push({ src, first, last, tags: `${video[0].color_space ?? "unknown"}/${video[0].color_range ?? "unknown"}` });
}
function update(owner, key, value, label) {
  if (owner[key] === value) return;
  changes.push(`${label}: ${owner[key] ?? "unset"} -> ${value}`);
  owner[key] = value;
}

const poster = path.join(publicRoot, manifest.poster);
if (!existsSync(poster)) problems.push(`${manifest.poster}: missing`);
for (const segment of manifest.segments) {
  const info = probe(segment.src);
  if (!info) continue;
  checkVideo(segment.src, info);
  update(segment, "durationMs", info.durationMs, `${segment.id} durationMs`);
}
for (const [scene, speech] of Object.entries(manifest.speech)) {
  const audio = probe(speech.src);
  if (audio) update(speech, "durationMs", audio.durationMs, `${scene} durationMs`);
  if (speech.video) {
    const info = probe(speech.video);
    if (info) {
      checkVideo(speech.video, info);
      update(speech, "videoDurationMs", info.durationMs, `${scene} videoDurationMs`);
    }
  }
}
for (const setting of values["lip-sync"]) {
  const [scene, mode] = setting.split("=");
  if (!["musetalk", "none"].includes(mode)) { problems.push(`--lip-sync ${setting}: use <scene|all>=<musetalk|none>`); continue; }
  const scenes = scene === "all" ? Object.keys(manifest.speech) : [scene];
  for (const name of scenes) {
    if (!manifest.speech[name]) { problems.push(`--lip-sync ${setting}: no prepared scene ${name}`); continue; }
    update(manifest.speech[name], "lipSync", mode, `${name} lipSync`);
  }
}

if (restLuma.length) {
  const values = restLuma.flatMap((item) => [item.first, item.last]);
  const spread = Math.max(...values) - Math.min(...values);
  console.log(`rest-frame luma of first/last frames: ${Math.min(...values).toFixed(2)}-${Math.max(...values).toFixed(2)} (spread ${spread.toFixed(2)})`);
  if (spread > MAX_REST_LUMA_SPREAD) {
    for (const item of restLuma) console.log(`  ${item.src}: first ${item.first.toFixed(2)}, last ${item.last.toFixed(2)}, colour ${item.tags}`);
    warnings.push(`first/last frames differ in mean luma by ${spread.toFixed(2)} levels (limit ${MAX_REST_LUMA_SPREAD}); joins will flicker. Encode every video the same way (the idle clips: from the source YUV, BT.709 tags).`);
  }
  const tags = new Set(restLuma.map((item) => item.tags));
  if (tags.size > 1) warnings.push(`colour tags differ between files (${[...tags].join(", ")}); a browser may convert them differently.`);
}
for (const line of changes) console.log(line);
for (const line of warnings) console.error(`WARNING: ${line}`);
for (const line of problems) console.error(`problem: ${line}`);
if (values.check) {
  if (changes.length || problems.length) process.exit(1);
  console.log("presence.json matches its files.");
} else {
  if (problems.length) process.exit(1);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(changes.length ? `Updated ${manifestPath}.` : `${manifestPath} was already current.`);
}
