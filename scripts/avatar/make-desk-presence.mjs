#!/usr/bin/env node
// Re-creates the /avatar desk presence from one locked-off Pexels clip: every segment and the poster in
// public/avatar/desk, and public/avatar/desk/presence.json. The cut list, crop and hub frames live in
// scripts/avatar/desk-cuts.json; docs/AVATAR_DESK_ASSETS.md explains how they were chosen.
//
//   node scripts/avatar/make-desk-presence.mjs --source <5941016-uhd_3840_2160_25fps.mp4> [--out public/avatar/desk]
//
// Needs ffmpeg and ffprobe on PATH. The speech MP3s in <out>/speech are not made here (they come from a paid
// ElevenLabs call); this script only measures them and lists them in presence.json.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const source = arg("--source");
const out = arg("--out", "public/avatar/desk");
if (!source) {
  console.error("usage: node scripts/avatar/make-desk-presence.mjs --source <path> [--out public/avatar/desk]");
  process.exit(2);
}

const cuts = JSON.parse(readFileSync(new URL("./desk-cuts.json", import.meta.url), "utf8"));
const dialogue = JSON.parse(readFileSync("src/data/avatar-performance-dialogue.json", "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const actual = sha256(source);
if (actual !== cuts.source.sha256) {
  console.error(`source checksum ${actual} does not match ${cuts.source.sha256}; refusing to cut a different file`);
  process.exit(1);
}

const probe = (path, entries) =>
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "json", path], {
    encoding: "utf8",
  });
const mediaMs = (path) => {
  const info = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", path], { encoding: "utf8" }),
  );
  return Math.round(Number(info.format.duration) * 1000);
};

const { crop, output } = cuts;
const frameMs = 1000 / cuts.source.fps;
const scale = `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${output.width}:${output.height}:flags=lanczos`;
const encode = [
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", String(output.crf), "-pix_fmt", "yuv420p",
  "-r", String(output.fps), "-g", String(output.fps), "-colorspace", "bt709", "-color_primaries", "bt709",
  "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart",
];

/** One filter graph: decode once, cut each part frame-accurately, reverse where from > to, join, then retime. */
function graph(segment) {
  const n = segment.parts.length;
  const lines = [`[0:v]${scale},split=${n}${segment.parts.map((_, i) => `[s${i}]`).join("")}`];
  segment.parts.forEach((part, i) => {
    const lo = Math.min(part.from, part.to), hi = Math.max(part.from, part.to);
    const back = part.from > part.to ? ",reverse" : "";
    lines.push(`[s${i}]trim=start_frame=${lo}:end_frame=${hi + 1},setpts=PTS-STARTPTS${back}[p${i}]`);
  });
  const joined = n > 1 ? `${segment.parts.map((_, i) => `[p${i}]`).join("")}concat=n=${n}:v=1:a=0` : "[p0]null";
  const retime =
    segment.speed === 1
      ? ""
      : `,setpts=PTS/${segment.speed},minterpolate=fps=${output.fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`;
  lines.push(`${joined}${retime},fps=${output.fps},format=yuv420p[v]`);
  return lines.join(";");
}

mkdirSync(out, { recursive: true });
const segments = [];
for (const segment of cuts.segments) {
  const file = join(out, `${segment.id}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", source, "-filter_complex", graph(segment), "-map", "[v]", ...encode, file]);
  const stream = JSON.parse(probe(file, "stream=nb_frames,width,height,codec_name,pix_fmt")).streams[0];
  const frames = Number(stream.nb_frames);
  const count = segment.parts.reduce((sum, p) => sum + Math.abs(p.to - p.from) + 1, 0);
  // At half speed minterpolate fills the gap after every source frame; the last hub frame is held one extra frame.
  const expected = Math.round(count / segment.speed);
  if (frames !== expected) throw new Error(`${segment.id}: ${frames} frames encoded, ${expected} expected`);
  const used = segment.parts.flatMap((p) => [p.from, p.to]);
  segments.push({
    id: segment.id,
    src: `/avatar/desk/${segment.id}.mp4`,
    kind: segment.kind,
    durationMs: Math.round(frames * frameMs),
    sourceId: cuts.source.id,
    sourceInMs: Math.round(Math.min(...used) * frameMs),
    sourceOutMs: Math.round((Math.max(...used) + 1) * frameMs),
    speed: segment.speed,
    // The hub frames it starts and ends on: a join between equal hubs shows no change of pose.
    startHub: segment.parts[0].from,
    endHub: segment.parts.at(-1).to,
    _frames: frames,
    _sha: sha256(file),
    _probeMs: mediaMs(file),
  });
}

const poster = join(out, "poster.jpg");
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", source, "-vf", `select=eq(n\\,${cuts.poster.frame}),${scale}`, "-frames:v", "1",
  "-q:v", "3", poster,
]);

const speech = {};
for (const scene of dialogue.scenes) {
  const file = join(out, "speech", `${scene.id}.mp3`);
  if (!existsSync(file)) continue;
  speech[scene.id] = {
    src: `/avatar/desk/speech/${scene.id}.mp3`,
    durationMs: mediaMs(file),
    transcript: scene.speech,
    provider: "elevenlabs",
    voice: "Bill",
  };
}

const manifestPath = join(out, "presence.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
const manifest = {
  id: "desk",
  label: "Desk",
  poster: "/avatar/desk/poster.jpg",
  width: output.width,
  height: output.height,
  fps: output.fps,
  crossfadeMs: cuts.crossfadeMs,
  segments: segments.map((s) => Object.fromEntries(Object.entries(s).filter(([key]) => !key.startsWith("_")))),
  speech,
  attribution: cuts.attribution,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log("id           kind    frames  durationMs  container  speed  source in-out ms   sha256");
for (const s of segments) {
  const before = previous?.segments?.find((p) => p.id === s.id)?.durationMs;
  const note = before === undefined ? "new" : before === s.durationMs ? "same as before" : `was ${before}`;
  console.log(
    `${s.id.padEnd(12)} ${s.kind.padEnd(7)} ${String(s._frames).padStart(6)}  ${String(s.durationMs).padStart(10)}  ` +
      `${String(s._probeMs).padStart(9)}  ${String(s.speed).padStart(5)}  ${`${s.sourceInMs}-${s.sourceOutMs}`.padEnd(17)} ` +
      `${s._sha.slice(0, 12)}  ${note}`,
  );
}
for (const [id, s] of Object.entries(speech)) console.log(`speech ${id.padEnd(10)} ${s.durationMs} ms`);
console.log(`poster ${poster} (source frame ${cuts.poster.frame}); manifest ${manifestPath}`);
