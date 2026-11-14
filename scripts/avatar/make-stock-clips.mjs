#!/usr/bin/env node
/**
 * Cut the licensed studio stand-in into the same pose graph as generated avatars.
 * No service credentials or paid requests. See docs/AVATAR_STOCK_ASSETS.md.
 *
 * node scripts/avatar/make-stock-clips.mjs --source /path/to/pexels-8643569.mp4
 * node scripts/avatar/make-stock-clips.mjs --download
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeManifest } from './template.mjs';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'public/avatar/studio');
const sourceUrl = 'https://videos.pexels.com/video-files/8643569/8643569-uhd_3840_2160_24fps.mp4';
const sourcePage = 'https://www.pexels.com/video/man-using-a-laptop-looking-at-the-camera-8643569/';
const sourceSha256 = 'dcfb8c00651e890e0812aa5d17668a72db44cb2fe7d4f831615586c90e743ea2';
const width = 1152, height = 720, fps = 24;
const canonicalFrames = { desk: 36, front: 108 }; // 1.5 s and 4.5 s of the source.
const shots = [
  { id: 'idle', from: 'front', to: 'front', frames: 48, start: 108, end: 120 },
  { id: 'listening', from: 'front', to: 'front', frames: 60, start: 108, end: 132 },
  { id: 'thinking', from: 'front', to: 'front', frames: 48, start: 108, end: 126 },
  // The actor is attentive, not lip-synced. The activity follows real audio playback.
  { id: 'speaking', from: 'front', to: 'front', frames: 72, start: 108, end: 144 },
  { id: 'to-desk', from: 'front', to: 'desk', frames: 48, start: 108, end: 36 },
  { id: 'working-a', from: 'desk', to: 'desk', frames: 48, start: 36, end: 12 },
  { id: 'working-b', from: 'desk', to: 'desk', frames: 48, start: 36, end: 0 },
  { id: 'to-front', from: 'desk', to: 'front', frames: 48, start: 36, end: 108 },
];

const args = process.argv.slice(2);
let source;
let download = false;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--source') {
    source = args[++index];
    if (!source || source.startsWith('--')) throw new Error('--source needs a local MP4 path.');
  } else if (args[index] === '--download') download = true;
  else throw new Error(`Unknown argument: ${args[index]}`);
}
if (source && download) throw new Error('Choose --source or --download.');
if (!source && !download) {
  console.log('Pass --source /path/to/pexels-8643569.mp4, or --download to fetch the documented free source.');
  process.exit(0);
}

async function run(command, arguments_) {
  const child = spawn(command, arguments_, { stdio: ['ignore', 'inherit', 'inherit'] });
  const [code] = await once(child, 'close');
  if (code !== 0) throw new Error(`${command} exited ${code}`);
}

function withJpegComment(jpeg, text) {
  if (jpeg.length < 2 || jpeg.readUInt16BE(0) !== 0xffd8) {
    throw new Error('Poster encoder did not return a JPEG.');
  }
  const comment = Buffer.from(text, 'utf8');
  if (comment.length > 65533) throw new Error('JPEG provenance comment is too long.');
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xfffe, 0);
  marker.writeUInt16BE(comment.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, comment, jpeg.subarray(2)]);
}

if (download) {
  source = path.join(root, '.data/avatar-media/pexels-8643569.mp4');
  await mkdir(path.dirname(source), { recursive: true });
  // curl follows the provider's public download URL; no browser cookies or authentication.
  // Size is bounded to 100 MB. Source originals stay in the already-ignored .data folder.
  await run('curl', ['--fail', '--location', '--max-time', '120', '--max-filesize', '100000000', '--output', source, sourceUrl]);
}
source = path.resolve(source);
const sourceInfo = await stat(source);
if (!sourceInfo.isFile() || sourceInfo.size > 100_000_000) throw new Error('Expected a local source video under 100 MB.');
const checksum = createHash('sha256').update(await readFile(source)).digest('hex');
if (checksum !== sourceSha256) {
  throw new Error('Source differs from the documented Pexels original. Review its provenance and timeline before changing the expected checksum.');
}

const temporary = await mkdtemp(path.join(os.tmpdir(), 'avatar-stock-frames-'));
await mkdir(output, { recursive: true });
try {
  // Fixed crop keeps the foreground actor, hands and laptop while reducing the background.
  // JPEG intermediates avoid keeping hundreds of uncompressed 720p frames in memory.
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
    '-vf', `fps=${fps},crop=3136:1960:0:80,scale=${width}:${height}:flags=lanczos`,
    '-frames:v', '145', '-q:v', '2', '-start_number', '0', path.join(temporary, '%04d.jpg'),
  ]);
  const getFrame = (index) => sharp(path.join(temporary, `${String(index).padStart(4, '0')}.jpg`))
    .removeAlpha().raw().toBuffer();
  const anchors = {
    front: await getFrame(canonicalFrames.front), desk: await getFrame(canonicalFrames.desk),
  };
  const poster = await sharp(anchors.front, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 90 }).toBuffer();
  const posterOrigin = `impeccable:prompt\0Origin: frame at ${canonicalFrames.front / fps} seconds from Edmond Dantès, Man Using a Laptop Looking at the Camera, Pexels video 8643569. ${sourcePage} License https://www.pexels.com/license/ . Cropped from source with scripts/avatar/make-stock-clips.mjs. Source SHA-256: ${sourceSha256}. Licensed filmed stand-in, not a generated identity or endorsement.`;
  await writeFile(path.join(output, 'poster.jpg'), withJpegComment(poster, posterOrigin));
  const durations = {};

  for (const shot of shots) {
    const encoder = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
      '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0', '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', path.join(output, `${shot.id}.mp4`),
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const finished = once(encoder, 'close');
    encoder.stdin.on('error', () => {});
    const transition = shot.from !== shot.to;
    for (let frame = 0; frame < shot.frames; frame++) {
      const progress = frame / (shot.frames - 1);
      // A loop leaves its canonical frame and retraces a short source segment.
      // Cosine timing eases to zero speed at the loop seam and reversal. Every
      // output frame comes from one filmed frame: no face blending, morphing or
      // optical-flow interpolation. Transitions retain the actual filmed turn.
      const sourceProgress = transition ? progress : (1 - Math.cos(2 * Math.PI * progress)) / 2;
      const index = Math.round(shot.start + (shot.end - shot.start) * sourceProgress);
      const rgb = await getFrame(index);
      if (!encoder.stdin.write(rgb)) await once(encoder.stdin, 'drain');
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`ffmpeg failed for ${shot.id}`);
    durations[shot.id] = shot.frames / fps * 1000;
    console.log(`${shot.id}: ${durations[shot.id]} ms`);
  }

  const manifest = {
    ...makeManifest('studio', 'Studio · filmed portrait', durations),
    width, height, medium: 'stock',
    attribution: {
      creator: 'Edmond Dantès', title: 'Man Using a Laptop Looking at the Camera',
      sourceUrl: sourcePage, license: 'Pexels License', licenseUrl: 'https://www.pexels.com/license/',
      note: 'Licensed actor footage, edited for this concept. People shown do not endorse the product. Not generated video or lip sync.',
    },
  };
  await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Source SHA-256: ${checksum}`);
  console.log(`Created ${output}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
